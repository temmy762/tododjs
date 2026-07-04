import User from '../models/User.js';

/**
 * Atomic device registration.
 *
 * The old approach everywhere was: load the User doc, mutate
 * subscription.devices in memory (push / reassign / set element), then
 * user.save(). Under concurrency that loses devices: two requests racing
 * (phone login while the computer is still firing requests, or a single page
 * firing many parallel authenticated calls) each load the same devices
 * snapshot, and the save() that lands last overwrites the other's addition —
 * so "in some cases only one device appears". The reassignment in the old
 * checkDeviceLimit (`devices = cleanupInactiveDevices(devices)`) made it worse
 * by rewriting the whole array as one $set.
 *
 * These helpers issue collection-level atomic updates ($push / positional
 * $set / $pull / $expr size guard) with no read-modify-write window, so
 * different devices can never clobber each other regardless of timing.
 */

/**
 * Register a device, or refresh it if already present.
 *
 * @param {string} userId
 * @param {string} deviceId
 * @param {object} meta      parsed device info + ipAddress
 * @param {object} [opts]
 * @param {number|null} [opts.maxDevices]  if set, a new device is only added
 *        while the account is under this many devices; otherwise registration
 *        is unlimited (used by the passive detection path in `protect`).
 * @returns {Promise<'touched'|'added'|'limit'>}
 */
export async function registerDevice(userId, deviceId, meta, { maxDevices = null } = {}) {
  if (!userId || !deviceId) return 'touched';

  // 1. Device already known → just refresh it (atomic positional $set).
  const touch = await User.updateOne(
    { _id: userId, 'subscription.devices.deviceId': deviceId },
    {
      $set: {
        'subscription.devices.$.lastActive': new Date(),
        'subscription.devices.$.ipAddress': meta.ipAddress,
        'subscription.devices.$.deviceInfo': meta.deviceInfo,
      },
    }
  );
  if (touch.matchedCount > 0) return 'touched';

  // 2. New device. The $ne guard makes the push a no-op if a concurrent
  //    request already added this same deviceId (prevents duplicates); the
  //    optional $expr size guard enforces the plan limit atomically.
  const filter = { _id: userId, 'subscription.devices.deviceId': { $ne: deviceId } };
  if (maxDevices != null) {
    filter.$expr = { $lt: [{ $size: { $ifNull: ['$subscription.devices', []] } }, maxDevices] };
  }

  const push = await User.updateOne(filter, {
    $push: {
      'subscription.devices': {
        deviceId,
        deviceName: meta.deviceName,
        deviceType: meta.deviceType,
        browser: meta.browser,
        os: meta.os,
        deviceInfo: meta.deviceInfo,
        ipAddress: meta.ipAddress,
        lastActive: new Date(),
        addedAt: new Date(),
      },
    },
  });

  if (push.modifiedCount > 0) return 'added';

  // Nothing changed: either a concurrent request added it first (fine), or the
  // limit blocked it. Distinguish by re-checking presence.
  if (maxDevices != null) {
    const exists = await User.exists({ _id: userId, 'subscription.devices.deviceId': deviceId });
    return exists ? 'added' : 'limit';
  }
  return 'added';
}

/**
 * Atomically drop devices inactive for `days` days ($pull, no reassignment).
 */
export async function pruneInactiveDevices(userId, days = 90) {
  if (!userId) return;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await User.updateOne(
    { _id: userId },
    { $pull: { 'subscription.devices': { lastActive: { $lt: cutoff } } } }
  );
}

/**
 * Atomically record a blocked (over-limit) login attempt for admin visibility.
 */
export async function recordBlockedAttempt(userId, attempt) {
  if (!userId) return;
  await User.updateOne(
    { _id: userId },
    { $push: { blockedLoginAttempts: attempt } }
  );
}

export default { registerDevice, pruneInactiveDevices, recordBlockedAttempt };
