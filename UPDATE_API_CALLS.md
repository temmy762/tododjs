# Frontend API Calls Update Guide

This document lists all files that need to be updated to use the centralized API configuration.

## Already Updated
- ✅ `src/services/authService.js`
- ✅ `src/App.jsx`
- ✅ `src/components/AlbumDetailView.jsx`

## Files to Update

Replace all instances of `'http://localhost:5000/api'` or `const API = 'http://localhost:5000/api'` with:

```javascript
import API_URL from '../config/api';
const API = API_URL;
```

Or for direct usage:
```javascript
import API_URL from '../config/api';
// Then use ${API_URL} in fetch calls
```

### Admin Components
- `src/components/admin/AdminAnalytics.jsx` - Line 7
- `src/components/admin/AdminDownloadStats.jsx` - Line 17
- `src/components/admin/AdminGenres.jsx` - Line 4
- `src/components/admin/AdminMashups.jsx` - Line 8
- `src/components/admin/AdminOverview.jsx` - Line 4
- `src/components/admin/AdminRecordPool.jsx` - Line 5
- `src/components/admin/AdminSecurity.jsx` - Line 7
- `src/components/admin/AdminSettings.jsx` - Line 8
- `src/components/admin/AdminSubscriptions.jsx` - Line 4
- `src/components/admin/AdminTracks.jsx` - Lines 4, 678
- `src/components/admin/AdminUsers.jsx` - Line 4
- `src/components/admin/AdvancedFilterPanel.jsx` - Line 45

### Other Components
- `src/components/LibraryPage.jsx` - Line 6
- `src/components/CheckoutPage.jsx` - Line 66
- `src/components/auth/AuthModal.jsx` - Lines 50, 78
- `src/pages/ProfilePage.jsx` - Line 52

## Search and Replace Pattern

Use your IDE's find and replace feature:

**Find:** `http://localhost:5000/api`
**Replace:** `${API_URL}`

Then add the import at the top of each file:
```javascript
import API_URL from '../config/api';
```

Or for files that define `const API`:
```javascript
import API_URL from '../config/api';
const API = API_URL;
```

## Verification

After updating, verify that:
1. All API calls use the environment variable
2. No hardcoded localhost URLs remain
3. The app works in both development and production modes
