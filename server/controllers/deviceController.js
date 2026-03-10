import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { parseDeviceInfo, cleanupInactiveDevices } from '../utils/deviceParser.js';
import { sendEmail } from '../services/emailService.js';

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
    const deviceIndex = user.subscription.devices.findIndex(d => d.deviceId === deviceId);

    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get device info before removing
    const removedDevice = user.subscription.devices[deviceIndex];

    // Remove device
    user.subscription.devices.splice(deviceIndex, 1);
    await user.save();

    // Send email notification
    try {
      await sendEmail({
        to: user.email,
        subject: 'Device Removed from Your Account',
        html: `
          <h2>Device Removed</h2>
          <p>Hi ${user.name},</p>
          <p>A device was removed from your TodoDJS account:</p>
          <ul>
            <li><strong>Device:</strong> ${removedDevice.deviceName || removedDevice.browser + ' on ' + removedDevice.os}</li>
            <li><strong>Removed:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>If you didn't make this change, please contact support immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send device removal email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Device removed successfully',
      data: {
        remainingDevices: user.subscription.devices.length
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

    // Update device name
    device.deviceName = deviceName.trim();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Device renamed successfully',
      data: device
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

    // Clear all devices
    user.subscription.devices = [];
    await user.save();

    // Send email notification
    try {
      await sendEmail({
        to: user.email,
        subject: 'All Devices Signed Out',
        html: `
          <h2>Security Alert: All Devices Signed Out</h2>
          <p>Hi ${user.name},</p>
          <p>All devices (${deviceCount}) have been signed out from your TodoDJS account.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p>You will need to sign in again on each device you want to use.</p>
          <p>If you didn't make this change, please reset your password immediately and contact support.</p>
        `
      });
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
    user.subscription.devices = cleanupInactiveDevices(user.subscription.devices);
    const removedCount = originalCount - user.subscription.devices.length;

    if (removedCount > 0) {
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: removedCount > 0 
        ? `Removed ${removedCount} inactive device(s)` 
        : 'No inactive devices to remove',
      data: {
        devicesRemoved: removedCount,
        remainingDevices: user.subscription.devices.length
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
