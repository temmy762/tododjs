/**
 * One-purpose token for the device-management page.
 *
 * When a login is refused by the device limit, the person who needs to act is
 * sitting at the BLOCKED device — which by definition has no session. The old
 * email linked to /subscription, which therefore only worked if they happened
 * to open it on an already-signed-in device, and otherwise showed "No active
 * subscription" despite the subscription being fine.
 *
 * This token authenticates that one page and nothing else: it can list the
 * account's devices and remove one. It cannot download, view the profile,
 * change the subscription, or reach admin. Only the hash is stored, so a
 * leaked database row cannot be replayed as a working link.
 */
import crypto from 'crypto';
import User from '../models/User.js';

export const DEVICE_MANAGE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const hash = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/**
 * Issue a fresh token for a user and return the absolute URL to email them.
 * Any previously issued token is replaced.
 */
export async function issueDeviceManageUrl(userId) {
  const raw = crypto.randomBytes(32).toString('hex');
  await User.updateOne(
    { _id: userId },
    { $set: { deviceManageToken: hash(raw), deviceManageExpire: new Date(Date.now() + DEVICE_MANAGE_TTL_MS) } }
  );
  const base = (process.env.FRONTEND_URL || 'https://tododjs.com').replace(/\/+$/, '');
  return `${base}/manage-devices?token=${raw}`;
}

/**
 * Resolve a raw token to its user, or null when missing/expired.
 */
export async function resolveDeviceManageToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  return User.findOne({
    deviceManageToken: hash(rawToken),
    deviceManageExpire: { $gt: new Date() },
  });
}
