/**
 * WebAuthn/Passkey Authentication Service
 * Provides biometric authentication (FaceID, TouchID, Windows Hello) for high-security actions
 */

/**
 * Check if WebAuthn is supported in the current browser
 * @returns {boolean}
 */
export const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined && 
         navigator.credentials !== undefined;
};

/**
 * Check if platform authenticator (FaceID, TouchID, Windows Hello) is available
 * @returns {Promise<boolean>}
 */
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Error checking platform authenticator:', error);
    return false;
  }
};

/**
 * Register a new passkey/credential
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} userEmail - User email
 * @returns {Promise<object>} Credential data
 */
export const registerPasskey = async (userId, userName, userEmail) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Generate challenge (in production, this should come from server)
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'TodoDJS',
      id: window.location.hostname
    },
    user: {
      id: Uint8Array.from(userId, c => c.charCodeAt(0)),
      name: userEmail,
      displayName: userName
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer platform authenticators (FaceID, TouchID, Windows Hello)
      userVerification: 'required',
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none'
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    return {
      credentialId: arrayBufferToBase64(credential.rawId),
      publicKey: arrayBufferToBase64(credential.response.getPublicKey()),
      attestationObject: arrayBufferToBase64(credential.response.attestationObject),
      clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON)
    };
  } catch (error) {
    console.error('Passkey registration failed:', error);
    throw new Error('Failed to register passkey. Please try again.');
  }
};

/**
 * Authenticate using passkey (for high-security actions)
 * @param {string} credentialId - Optional specific credential ID to use
 * @returns {Promise<object>} Authentication result
 */
export const authenticateWithPasskey = async (credentialId = null) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Generate challenge (in production, this should come from server)
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: 'required',
    rpId: window.location.hostname
  };

  // If specific credential ID provided, use it
  if (credentialId) {
    publicKeyCredentialRequestOptions.allowCredentials = [{
      id: base64ToArrayBuffer(credentialId),
      type: 'public-key',
      transports: ['internal']
    }];
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    return {
      credentialId: arrayBufferToBase64(assertion.rawId),
      authenticatorData: arrayBufferToBase64(assertion.response.authenticatorData),
      clientDataJSON: arrayBufferToBase64(assertion.response.clientDataJSON),
      signature: arrayBufferToBase64(assertion.response.signature),
      userHandle: assertion.response.userHandle ? arrayBufferToBase64(assertion.response.userHandle) : null
    };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Authentication was cancelled or timed out');
    }
    console.error('Passkey authentication failed:', error);
    throw new Error('Authentication failed. Please try again.');
  }
};

/**
 * Simplified authentication for device actions
 * Shows biometric prompt and returns success/failure
 * @param {string} action - Description of the action being performed
 * @returns {Promise<boolean>}
 */
export const verifyUserForAction = async (action = 'this action') => {
  try {
    // Check if platform authenticator is available
    const isAvailable = await isPlatformAuthenticatorAvailable();
    
    if (!isAvailable) {
      // Fallback: Show confirmation dialog if biometric not available
      return window.confirm(
        `Confirm ${action}\n\nBiometric authentication is not available. Click OK to confirm this action.`
      );
    }

    // Check if we have a stored credential ID
    let credentialId = localStorage.getItem('tododjs_passkey_id');
    
    // If no credential exists, register one first
    if (!credentialId) {
      try {
        const userId = 'user_' + Date.now();
        const credential = await registerPasskey(userId, 'TodoDJS User', 'user@tododjs.com');
        credentialId = credential.credentialId;
        localStorage.setItem('tododjs_passkey_id', credentialId);
      } catch (regError) {
        console.warn('Failed to register passkey:', regError);
        // Fall back to confirmation dialog
        return window.confirm(
          `Confirm ${action}\n\nBiometric setup failed. Click OK to confirm this action.`
        );
      }
    }

    // Now authenticate with the registered credential
    try {
      await authenticateWithPasskey(credentialId);
      return true;
    } catch (authError) {
      if (authError.name === 'NotAllowedError' || authError.message.includes('cancelled')) {
        // User cancelled
        console.log('User cancelled biometric authentication');
        return false;
      }
      
      // Credential might be invalid, try re-registering
      localStorage.removeItem('tododjs_passkey_id');
      console.warn('Biometric auth failed, falling back to confirmation:', authError);
      return window.confirm(
        `Confirm ${action}\n\nBiometric authentication failed. Click OK to confirm this action.`
      );
    }
  } catch (error) {
    console.error('User verification failed:', error);
    // Final fallback to confirmation dialog
    return window.confirm(
      `Confirm ${action}\n\nClick OK to confirm this action.`
    );
  }
};

/**
 * Helper: Convert ArrayBuffer to Base64
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
const base64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export default {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  authenticateWithPasskey,
  verifyUserForAction
};
