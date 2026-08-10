import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { pruneInactiveDevices } from '../utils/deviceRegistry.js';
import { resolveDeviceManageToken } from '../utils/deviceManageToken.js';
import { sendEmail, getDeviceRemovedEmailTemplate, getSignOutAllEmailTemplate } from '../services/emailService.js';

// ── Token-authenticated device management (no session required) ─────────────
// Serves the standalone page linked from the device-limit email. Scope is
// deliberately tiny: list this account's devices, remove one. Nothing here can
// read or change anything else about the account.

const publicDeviceView = (d) => ({
  deviceId: d.deviceId,
  deviceName: d.deviceName || 'Unknown device',
  browser: d.browser || 'Unknown',
  os: d.os || 'Unknown',
  deviceType: d.deviceType || 'unknown',
  lastActive: d.lastActive || null,
  addedAt: d.addedAt || null,
});

/**
 * @desc    List devices using an emailed one-purpose token
 * @route   GET /api/devices/manage?token=...
 * @access  Public (token is the credential)
 */
export const getDevicesByToken = async (req, res) => {
  try {
    const user = await resolveDeviceManageToken(req.query.token);
    if (!user) {
      return res.status(401).json({ success: false, expired: true, message: 'This link is invalid or has expired. Please try signing in again to receive a new one.' });
    }

    const plan = await SubscriptionPlan.findOne({ planId: user.subscription?.planId });
    const maxDevices = plan?.features?.maxDevices || user.maxDevices || 1;
    const devices = (user.subscription?.devices || []).map(publicDeviceView);

    res.status(200).json({
      success: true,
      data: {
        // Only enough identity for the user to confirm it is their account.
        email: user.email,
        devices,
        maxDevices,
        slotsFree: Math.max(0, maxDevices - devices.length),
      },
    });
  } catch (error) {
    console.error('[device-manage] list failed:', error);
    res.status(500).json({ success: false, message: 'Could not load your devices. Please try again.' });
  }
};

/**
 * @desc    Remove one device using the emailed token, and revoke its session
 * @route   POST /api/devices/manage/remove
 * @access  Public (token is the credential)
 */
export const removeDeviceByToken = async (req, res) => {
  try {
    const { token, deviceId } = req.body || {};
    const user = await resolveDeviceManageToken(token);
    if (!user) {
      return res.status(401).json({ success: false, expired: true, message: 'This link is invalid or has expired. Please try signing in again to receive a new one.' });
    }
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'No device selected.' });
    }

    const removed = (user.subscription?.devices || []).find(d => d.deviceId === deviceId);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'That device is no longer registered.' });
    }

    // Pull the device AND record the revocation in one write. The revocation
    // is what actually ends the old session: `protect` re-registers any device
    // it sees, so without it the removed device would quietly re-add itself on
    // its next request and the freed slot would vanish again.
    await User.updateOne(
      { _id: user._id },
      {
        $pull: { 'subscription.devices': { deviceId } },
        $push: { revokedDevices: { deviceId, revokedAt: new Date() } },
      }
    );

    const fresh = await User.findById(user._id).select('subscription.devices subscription.planId maxDevices').lean();
    const plan = await SubscriptionPlan.findOne({ planId: fresh?.subscription?.planId });
    const maxDevices = plan?.features?.maxDevices || fresh?.maxDevices || 1;
    const remaining = fresh?.subscription?.devices || [];

    try {
      const lang = user.preferredLanguage || 'es';
      const { subject, html, text } = getDeviceRemovedEmailTemplate(user, removed, lang);
      await sendEmail({ to: user.email, subject, html, text });
    } catch (e) {
      console.error('[device-manage] removal email failed:', e.message);
    }

    console.log(`[device-manage] user ${user._id} removed device ${deviceId} via emailed link`);

    res.status(200).json({
      success: true,
      message: 'Device removed. You can now sign in on this device.',
      data: {
        devices: remaining.map(publicDeviceView),
        maxDevices,
        slotsFree: Math.max(0, maxDevices - remaining.length),
      },
    });
  } catch (error) {
    console.error('[device-manage] removal failed:', error);
    res.status(500).json({ success: false, message: 'Could not remove the device. Please try again.' });
  }
};

/**
 * @desc    Get all registered devices for current user
 * @route   GET /api/devices
 * @access  Private
 */
export const getDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current device ID from request
    const currentDeviceId = req.headers['x-device-id'] || req.body.deviceId;

    // Mark current device
    const devices = user.subscription.devices.map(device => ({
      ...device.toObject(),
      isCurrentDevice: device.deviceId === currentDeviceId
    }));

    // Get plan info for max devices
    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });
    const maxDevices = plan?.features?.maxDevices || user.maxDevices || 2;

    res.status(200).json({
      success: true,
      data: {
        devices,
        maxDevices,
        currentDeviceCount: devices.length,
        availableSlots: Math.max(0, maxDevices - devices.length)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Remove a specific device
 * @route   DELETE /api/devices/:deviceId
 * @access  Private
 */
export const removeDevice = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { deviceId } = req.params;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find device
    const removedDevice = user.subscription.devices.find(d => d.deviceId === deviceId);

    if (!removedDevice) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Remove atomically ($pull) so a concurrent device registration on another
    // request can't be clobbered by writing back a stale devices array.
    await User.updateOne(
      { _id: user._id },
      { $pull: { 'subscription.devices': { deviceId } } }
    );

    // Send email notification
    try {
      const lang = user.preferredLanguage || 'es';
      const { subject, html, text } = getDeviceRemovedEmailTemplate(user, removedDevice, lang);
      await sendEmail({ to: user.email, subject, html, text });
    } catch (emailError) {
      console.error('Failed to send device removal email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Device removed successfully',
      data: {
        remainingDevices: Math.max(0, user.subscription.devices.length - 1)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Rename a device
 * @route   PUT /api/devices/:deviceId
 * @access  Private
 */
export const renameDevice = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { deviceId } = req.params;
    const { deviceName } = req.body;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!deviceName || deviceName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Device name is required'
      });
    }

    // Find device
    const device = user.subscription.devices.find(d => d.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update device name atomically (positional $set) — no full-array rewrite.
    const trimmed = deviceName.trim();
    await User.updateOne(
      { _id: user._id, 'subscription.devices.deviceId': deviceId },
      { $set: { 'subscription.devices.$.deviceName': trimmed } }
    );

    res.status(200).json({
      success: true,
      message: 'Device renamed successfully',
      data: { ...device.toObject(), deviceName: trimmed }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Sign out from all devices
 * @route   POST /api/devices/signout-all
 * @access  Private
 */
export const signOutAllDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const deviceCount = user.subscription.devices.length;

    // Clear all devices atomically
    await User.updateOne(
      { _id: user._id },
      { $set: { 'subscription.devices': [] } }
    );

    // Send email notification
    try {
      const lang = user.preferredLanguage || 'es';
      const { subject, html, text } = getSignOutAllEmailTemplate(user, deviceCount, lang);
      await sendEmail({ to: user.email, subject, html, text });
    } catch (emailError) {
      console.error('Failed to send sign-out email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: `Successfully signed out from ${deviceCount} device(s)`,
      data: {
        devicesRemoved: deviceCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Clean up inactive devices (90+ days)
 * @route   POST /api/devices/cleanup
 * @access  Private
 */
export const cleanupDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const originalCount = user.subscription.devices.length;
    await pruneInactiveDevices(user._id);
    const refreshed = await User.findById(user._id).select('subscription.devices');
    const remaining = refreshed?.subscription?.devices?.length ?? originalCount;
    const removedCount = originalCount - remaining;

    res.status(200).json({
      success: true,
      message: removedCount > 0
        ? `Removed ${removedCount} inactive device(s)`
        : 'No inactive devices to remove',
      data: {
        devicesRemoved: removedCount,
        remainingDevices: remaining
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  getDevices,
  removeDevice,
  renameDevice,
  signOutAllDevices,
  cleanupDevices
};
