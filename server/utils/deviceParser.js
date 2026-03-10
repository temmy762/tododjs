import UAParser from 'ua-parser-js';

/**
 * Parse user agent string and extract device information
 * @param {string} userAgent - User agent string from request headers
 * @returns {object} Parsed device information
 */
export const parseDeviceInfo = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = 'unknown';
  if (result.device.type === 'mobile') deviceType = 'mobile';
  else if (result.device.type === 'tablet') deviceType = 'tablet';
  else if (result.browser.name) deviceType = 'desktop';

  // Get browser name
  const browser = result.browser.name || 'Unknown Browser';

  // Get OS name
  const os = result.os.name || 'Unknown OS';

  // Generate auto device name
  const deviceName = generateDeviceName(browser, os, deviceType);

  return {
    deviceType,
    browser,
    os,
    deviceName,
    deviceInfo: userAgent || 'Unknown Device'
  };
};

/**
 * Generate friendly device name
 * @param {string} browser - Browser name
 * @param {string} os - Operating system name
 * @param {string} deviceType - Device type (mobile, desktop, tablet)
 * @returns {string} Friendly device name
 */
export const generateDeviceName = (browser, os, deviceType) => {
  // Special cases for mobile devices
  if (deviceType === 'mobile') {
    if (os.includes('iOS')) return `Safari on iPhone`;
    if (os.includes('Android')) return `${browser} on Android`;
    return `${browser} on Mobile`;
  }

  // Tablet
  if (deviceType === 'tablet') {
    if (os.includes('iOS')) return `Safari on iPad`;
    if (os.includes('Android')) return `${browser} on Android Tablet`;
    return `${browser} on Tablet`;
  }

  // Desktop
  if (os.includes('Windows')) return `${browser} on Windows`;
  if (os.includes('Mac OS')) return `${browser} on macOS`;
  if (os.includes('Linux')) return `${browser} on Linux`;
  
  return `${browser} on ${os}`;
};

/**
 * Get location from IP address (placeholder - integrate with IP geolocation service)
 * @param {string} ipAddress - IP address
 * @returns {Promise<string>} Location string
 */
export const getLocationFromIP = async (ipAddress) => {
  // TODO: Integrate with IP geolocation service (ipapi.co, ipstack, etc.)
  // For now, return null - can be enhanced later
  return null;
};

/**
 * Clean up inactive devices (older than 90 days)
 * @param {Array} devices - Array of device objects
 * @returns {Array} Filtered devices array
 */
export const cleanupInactiveDevices = (devices) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return devices.filter(device => {
    const lastActive = new Date(device.lastActive);
    return lastActive > ninetyDaysAgo;
  });
};

export default {
  parseDeviceInfo,
  generateDeviceName,
  getLocationFromIP,
  cleanupInactiveDevices
};
