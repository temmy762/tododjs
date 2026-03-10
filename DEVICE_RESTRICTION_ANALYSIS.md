# Device Restriction Analysis - TodoDJS Platform

## Current Implementation Overview

### Subscription Plans & Device Limits

| Plan | Type | Duration | Price | Max Users | Max Devices |
|------|------|----------|-------|-----------|-------------|
| Individual Monthly | individual | 30 days | €19.99 | 1 | **1 device** |
| Individual Quarterly | individual | 90 days | €54.99 | 1 | **1 device** |
| Shared Monthly | shared | 30 days | €29.99 | 2 | **2 devices** |
| Shared Quarterly | shared | 90 days | €79.99 | 2 | **2 devices** |

---

## Device Tracking Architecture

### 1. User Model (`User.js`)
```javascript
registeredDevices: [{
  deviceId: String (required),
  deviceInfo: String (default: 'Unknown Device'),
  ipAddress: String,
  activeToken: String (default: null),
  registeredAt: Date,
  lastLoginAt: Date
}],
maxDevices: Number (default: 2)
```

### 2. Subscription Model (nested in User)
```javascript
subscription: {
  devices: [{
    deviceId: String,
    deviceInfo: String,
    ipAddress: String,
    lastActive: Date,
    addedAt: Date
  }]
}
```

**⚠️ ISSUE IDENTIFIED:** There are **TWO separate device tracking systems**:
- `user.registeredDevices` (legacy)
- `user.subscription.devices` (current)

---

## Device Restriction Flow

### Login Flow (`authController.js`)
1. User logs in with email/password
2. System extracts `deviceId` from request body or `x-device-id` header
3. Checks if user has active subscription
4. If device limit reached (using `user.registeredDevices`):
   - Returns 403 error with message
   - Shows list of registered devices
   - Blocks login

### Download Flow (`middleware/subscription.js`)
1. User attempts to download track/album
2. `checkDeviceLimit` middleware runs
3. Checks `user.subscription.devices` array
4. If device not registered:
   - Checks if limit reached (`devices.length >= plan.features.maxDevices`)
   - If under limit: **Auto-registers device**
   - If at limit: Returns 403 error
5. If device registered: Updates `lastActive` timestamp

---

## Current Limitations

### ❌ Problems:
1. **Dual tracking systems** - `registeredDevices` vs `subscription.devices` are not synced
2. **No user control** - Users cannot view or manage their devices
3. **No logout/remove** - No way to deregister a device
4. **Auto-registration** - Devices are added automatically on download, not on login
5. **Limited device info** - Only stores user-agent string, not friendly names
6. **No device verification** - No way to verify which device is which
7. **Support dependency** - Users must contact support to reset devices

### ✅ What Works:
1. Device limits are enforced per plan type
2. Admin users bypass all restrictions
3. IP address and user-agent are tracked
4. Last active timestamps are recorded
5. Device limit errors are clear and informative

---

## Device ID Generation

**Current Method:**
- Frontend generates `deviceId` (likely using browser fingerprinting or localStorage)
- Sent via `x-device-id` header or request body
- No standardized generation method visible in backend

**Missing:**
- Device ID generation logic in frontend
- Device naming/identification system
- Device type detection (mobile, desktop, tablet)

---

## Enforcement Points

Device limits are checked at:
1. **Login** - `authController.login()` checks `registeredDevices`
2. **Downloads** - `checkDeviceLimit` middleware checks `subscription.devices`
3. **Device Registration** - `subscriptionController.registerDevice()` checks limits

**Protected Routes:**
- `POST /api/download/track/:id`
- `GET /api/download/track/:id/file`
- `POST /api/download/album/:id`
- `GET /api/download/album/:id/file`

---

## Recommendations for Netflix-Style Panel

### What Netflix Does:
1. Shows all active devices with friendly names
2. Allows users to sign out of specific devices remotely
3. Shows last active date/time
4. Shows device type (iPhone, Chrome on Windows, etc.)
5. Limits concurrent streams, not just registered devices

### Proposed TodoDJS Implementation:

#### Phase 1: Consolidate Device Tracking
- Merge `registeredDevices` and `subscription.devices` into single system
- Use `subscription.devices` as single source of truth
- Migrate existing data

#### Phase 2: Enhanced Device Info
```javascript
devices: [{
  deviceId: String (unique identifier),
  deviceName: String (user-friendly name, e.g., "Daniel's iPhone"),
  deviceType: String (mobile, desktop, tablet),
  browser: String (Chrome, Safari, Firefox),
  os: String (Windows, macOS, iOS, Android),
  ipAddress: String,
  location: String (optional: city/country from IP),
  lastActive: Date,
  addedAt: Date,
  isCurrentDevice: Boolean
}]
```

#### Phase 3: Device Management UI
- **View Devices Page** - Show all registered devices in user dashboard
- **Remove Device** - Allow users to deregister devices themselves
- **Rename Device** - Let users give friendly names to devices
- **Current Device Indicator** - Highlight which device they're currently using
- **Auto-cleanup** - Remove devices inactive for 90+ days

#### Phase 4: Security Features
- Email notification when new device is added
- Require password confirmation to remove devices
- "Sign out all devices" emergency button
- Device approval workflow (optional)

---

## Next Steps

1. **Decide on approach:**
   - Simple: Just add device management UI to existing system
   - Complete: Consolidate systems + full Netflix-style panel

2. **Frontend requirements:**
   - Device management page in user dashboard
   - Device ID generation strategy
   - Device fingerprinting library

3. **Backend requirements:**
   - New API endpoints for device management
   - Consolidate device tracking systems
   - Enhanced device metadata collection

Would you like me to proceed with implementing the Netflix-style device management panel?
