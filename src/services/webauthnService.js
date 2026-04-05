/**
 * WebAuthn / Biometric Login Service
 *
 * Uses the browser's platform authenticator (Face ID, Touch ID, Windows Hello,
 * fingerprint reader) to register and authenticate users without a password.
 *
 * Flow:
 *  Registration  – after password login, call registerBiometric() to save a
 *                  platform credential tied to this device.
 *  Authentication – call loginWithBiometric() which verifies the biometric and
 *                  uses the stored refresh token to obtain a fresh JWT.
 */

const RP_NAME = 'TodoDJs';
const STORAGE_KEY = 'tododjs_biometric_cred';

// ─── helpers ─────────────────────────────────────────────────────────────────

function b64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ─── public API ──────────────────────────────────────────────────────────────

/** Returns true if the device supports platform (biometric) authenticators. */
export async function isBiometricAvailable() {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Returns the stored credential id for this device, or null. */
export function getBiometricCredential() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Register the device's biometric authenticator after a successful
 * password login. Stores the credential id in localStorage.
 *
 * @param {string} userId   – server user _id
 * @param {string} userName – user display name / email
 */
export async function registerBiometric(userId, userName) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: window.location.hostname, name: RP_NAME },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7,   type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });

  const credData = {
    id:     b64url(credential.rawId),
    userId,
    userName,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credData));
  return credData;
}

/**
 * Authenticate using the stored biometric credential.
 * Returns { success: true } when biometric passes — caller is responsible
 * for issuing a new JWT via the refresh endpoint.
 *
 * Throws if biometric fails or no credential is registered.
 */
export async function verifyBiometric() {
  const cred = getBiometricCredential();
  if (!cred) throw new Error('No biometric registered on this device.');

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{
        id:         fromB64url(cred.id),
        type:       'public-key',
        transports: ['internal'],
      }],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return { success: true, userId: cred.userId };
}

/** Remove the stored biometric credential from this device. */
export function clearBiometric() {
  localStorage.removeItem(STORAGE_KEY);
}
