# TodoDJS — Complete Testing Guide

## Overview
This comprehensive testing guide covers all features of the TodoDJS DJ record pool platform for three user types: **Admin**, **Users**, and **Subscribers**.

---

## 🧪 Test Environment Setup

### Prerequisites
- **Live URL**: https://tododjs.com
- **API URL**: https://api.tododjs.com/api
- **Test Accounts**: Create accounts for each user type
- **Browser**: Chrome/Firefox with developer tools
- **Network Tab**: Monitor API calls for debugging

### Test Data Required
- **Admin Account**: Full admin privileges
- **Regular User Account**: Free tier access
- **Subscriber Account**: Active subscription (Individual/Shared)
- **Test Tracks**: Various formats with metadata
- **Test ZIP Files**: For 4-layer record pool uploads

---

## 👑 Admin Testing Checklist

### Authentication & Access
- [ ] **Login with admin credentials**
- [ ] **Verify admin dashboard access**
- [ ] **Check admin badge in TopBar**
- [ ] **Test admin-only routes protection**

### Admin Dashboard Navigation
- [ ] **Admin Overview** - System statistics
- [ ] **Admin Users** - User management
- [ ] **Admin Tracks** - Track management
- [ ] **Admin Albums** - Album management
- [ ] **Admin Record Pool** - 4-layer hierarchy
- [ ] **Admin Subscriptions** - Subscription management
- [ ] **Admin Analytics** - Usage analytics
- [ ] **Admin Settings** - System configuration
- [ ] **Admin Security** - Security settings

### 4-Layer Record Pool System
#### Collections Management
- [ ] **Upload Collection ZIP**
  1. Click "Collections" tab
  2. Click "Upload Collection" button
  3. Select master ZIP file
  4. Add thumbnail image
  5. Set collection year
  6. Monitor upload progress
  7. Verify extraction completes
- [ ] **View Collection Cards**
  - Check collection metadata display
  - Verify thumbnail images
  - Check track/album counts
- [ ] **Edit Collection Details**
  - Update collection name
  - Change thumbnail
  - Modify year
- [ ] **Delete Collection**
  - Test cascade deletion
  - Verify all child records removed

#### Date Packs Management
- [ ] **Auto-populated Date Packs**
  - Verify date packs created from ZIP extraction
  - Check date format (DD_MM_YY_PlaylistPro)
  - Verify parent collection linkage
- [ ] **View Date Pack Cards**
  - Check date pack metadata
  - Verify album/track counts
  - Test breadcrumb navigation
- [ ] **Edit Date Pack Details**
  - Update date pack name
  - Modify metadata
- [ ] **Delete Date Pack**
  - Test cascade deletion
  - Verify child albums/tracks removed

#### Albums Management
- [ ] **View Album Cards**
  - Check album metadata
  - Verify genre badges
  - Check track count
  - Test breadcrumb navigation
- [ ] **Edit Album Details**
  - Update album name
  - Change genre
  - Modify cover art
  - Edit tonality information
- [ ] **Manage Album Modal**
  - Test track listing
  - Verify tonality display
  - Check Camelot notation
  - Test track editing

#### Tracks Management
- [ ] **View Track Listings**
  - Check track metadata
  - Verify tonality information
  - Check BPM display
  - Test audio preview
- [ ] **Edit Track Details**
  - Update track name
  - Modify artist
  - Edit tonality (manual override)
  - Change BPM
- [ ] **Tonality Management**
  - Verify ID3 tag detection
  - Test OpenAI fallback
  - Check Camelot notation conversion
  - Test confidence levels

### User Management
- [ ] **View All Users**
  - Check user list display
  - Verify subscription status
  - Check registration dates
- [ ] **User Details**
  - View user profile
  - Check subscription plan
  - Verify device limits
  - Check download history
- [ ] **Manage Subscriptions**
  - Upgrade user plans
  - Cancel subscriptions
  - Extend subscriptions
  - Verify device limits enforcement

### Subscription Management
- [ ] **View All Subscriptions**
  - Check active subscriptions
  - Verify plan types
  - Check renewal dates
- [ ] **Plan Management**
  - View plan details
  - Check pricing
  - Verify feature limits
- [ ] **Subscription Analytics**
  - Check revenue metrics
  - Verify user counts by plan
  - Test subscription trends

### Analytics & Monitoring
- [ ] **System Overview**
  - Check total users
  - Verify track counts
  - Monitor storage usage
- [ ] **Download Analytics**
  - Check download statistics
  - Verify popular tracks
  - Monitor bandwidth usage
- [ ] **User Analytics**
  - Check user activity
  - Verify login patterns
  - Monitor subscription conversions

### Settings & Security
- [ ] **System Settings**
  - Update platform name
  - Configure email settings
  - Set download limits
- [ ] **Security Settings**
  - Monitor failed logins
  - Check IP restrictions
  - Verify rate limiting

---

## 👤 User Testing Checklist

### Registration & Authentication
- [ ] **User Registration**
  1. Click "Sign Up" in TopBar
  2. Fill registration form
  3. Verify email confirmation
  4. Check automatic login
- [ ] **User Login**
  1. Click "Login" in TopBar
  2. Enter credentials
  3. Verify successful login
  4. Check user badge display
- [ ] **Password Recovery**
  1. Click "Forgot Password"
  2. Enter email address
  3. Check reset email
  4. Verify password reset flow

### Navigation & UI
- [ ] **Main Navigation**
  - Test Sidebar navigation
  - Verify TopBar functionality
  - Check responsive design
- [ ] **Page Navigation**
  - Library page
  - Record Pool page
  - Profile page
  - Settings page

### Content Discovery
- [ ] **Browse Tracks**
  - Scroll through track listings
  - Test search functionality
  - Verify genre filtering
  - Check tonality filtering
- [ ] **Browse Albums**
  - View album collections
  - Test album detail views
  - Check track listings
- [ ] **Search Functionality**
  - Search by track name
  - Search by artist
  - Verify search results
  - Test search overlay

### Audio Features (Free Tier)
- [ ] **Track Preview**
  1. Click play on any track
  2. Verify 30-second preview limit
  3. Check preview limit notification
  4. Test audio controls
- [ ] **Music Control Panel**
  - Play/pause functionality
  - Volume controls
  - Progress scrubbing
  - Track information display
- [ ] **Audio Quality**
  - Verify audio streaming
  - Check loading indicators
  - Test error handling

### Social Features
- [ ] **Favorites System**
  1. Like/unlike tracks
  2. Check favorites persistence
  3. View favorites list
  4. Test favorites across sessions
- [ ] **Profile Management**
  - Update profile information
  - Change avatar
  - Modify preferences

### Premium Prompts
- [ ] **Download Restrictions**
  1. Attempt track download
  2. Verify "Subscribe Required" modal
  3. Check premium prompt display
  4. Test "View Plans" navigation
- [ ] **Preview Limit Notifications**
  - Check 30-second preview warning
  - Verify upgrade prompt
  - Test "Continue with Preview" option

---

## 💳 Subscriber Testing Checklist

### Subscription Features
- [ ] **Plan Selection**
  1. Navigate to pricing page
  2. View all 4 plan options
  3. Check plan comparisons
  4. Test plan selection
- [ ] **Checkout Process**
  1. Select subscription plan
  2. Enter payment details
  3. Complete Stripe checkout
  4. Verify successful payment
- [ ] **Subscription Activation**
  - Check immediate plan activation
  - Verify crown badge display
  - Check subscription status
  - Test days remaining display

### Premium Audio Features
- [ ] **Full Track Playback**
  1. Play any track completely
  2. Verify no preview limits
  3. Test continuous playback
  4. Check audio quality
- [ ] **Unlimited Downloads**
  1. Download individual tracks
  2. Download entire albums
  3. Verify download speeds
  4. Check download history
- [ ] **Advanced Audio Controls**
  - Full scrubbing capability
  - Volume persistence
  - Track information display
  - Tonality information

### Device & Sharing Features
#### Individual Plans (1 Device)
- [ ] **Device Limit Enforcement**
  1. Login from device 1 ✅
  2. Attempt login from device 2 ❌
  3. Verify "Device limit reached" error
  4. Test device removal/re-add

#### Shared Plans (2 Devices)
- [ ] **Multi-Device Access**
  1. Login from device 1 ✅
  2. Login from device 2 ✅
  3. Attempt login from device 3 ❌
  4. Verify device management

#### Subscription Sharing
- [ ] **User Sharing (Shared Plans Only)**
  1. Navigate to subscription dashboard
  2. Click "Share Subscription"
  3. Enter shared user email
  4. Verify shared user access
  5. Test sharing limits

### Account Management
- [ ] **Subscription Dashboard**
  - View plan details
  - Check renewal date
  - Manage payment methods
  - View usage statistics
- [ ] **Device Management**
  - View registered devices
  - Remove unused devices
  - Test device re-registration
- [ ] **Plan Changes**
  - Upgrade subscription plans
  - Downgrade plans
  - Cancel subscription
  - Verify proration

### Support Features
- [ ] **WhatsApp Support**
  - Click WhatsApp support button
  - Verify WhatsApp integration
  - Test support contact
- [ ] **Email Support**
  - Contact support via email
  - Verify response handling

---

## 🔧 Technical Testing Checklist

### API Endpoints Testing
#### Authentication
- [ ] `POST /api/auth/register` - User registration
- [ ] `POST /api/auth/login` - User login
- [ ] `POST /api/auth/forgot-password` - Password reset
- [ ] `GET /api/auth/me` - User profile

#### Content Management
- [ ] `GET /api/tracks/browse` - Browse tracks
- [ ] `GET /api/albums` - Browse albums
- [ ] `GET /api/tracks/:id/playback` - Get track URL
- [ ] `POST /api/favorites/toggle/:id` - Toggle favorites

#### Subscription System
- [ ] `GET /api/subscriptions/plans` - Get available plans
- [ ] `POST /api/subscriptions/subscribe` - Create subscription
- [ ] `GET /api/subscriptions/status` - Check subscription status

#### Download System
- [ ] `POST /api/downloads/track/:id` - Download track
- [ ] `POST /api/downloads/album/:id` - Download album
- [ ] `GET /api/downloads/history` - Download history

### Error Handling Testing
- [ ] **Network Errors**
  - Test offline behavior
  - Verify error messages
  - Check retry mechanisms
- [ ] **API Errors**
  - Invalid credentials
  - Missing permissions
  - Rate limiting
- [ ] **File Errors**
  - Missing audio files
  - Corrupted uploads
  - Invalid formats

### Performance Testing
- [ ] **Load Times**
  - Initial page load < 3s
  - Track loading < 2s
  - Search results < 1s
- [ ] **Memory Usage**
  - Monitor browser memory
  - Check for memory leaks
  - Verify cleanup
- [ ] **Network Usage**
  - Optimize API calls
  - Check caching
  - Verify compression

### Security Testing
- [ ] **Authentication Security**
  - JWT token validation
  - Session management
  - Logout functionality
- [ ] **Authorization Security**
  - Role-based access
  - Route protection
  - API endpoint security
- [ ] **Data Security**
  - Input validation
  - XSS prevention
  - CSRF protection

---

## 📱 Cross-Platform Testing

### Browser Compatibility
- [ ] **Chrome** (Latest version)
- [ ] **Firefox** (Latest version)
- [ ] **Safari** (Latest version)
- [ ] **Edge** (Latest version)

### Device Testing
- [ ] **Desktop** (1920x1080)
- [ ] **Laptop** (1366x768)
- [ ] **Tablet** (768x1024)
- [ ] **Mobile** (375x667)

### Responsive Design
- [ ] **Navigation Menu**
  - Desktop sidebar
  - Mobile hamburger menu
  - Tablet adaptive layout
- [ ] **Content Layout**
  - Track grid responsive
  - Album card sizing
  - Modal responsiveness

---

## 🚀 Deployment Testing

### Production Environment
- [ ] **SSL Certificate**
  - Verify HTTPS works
  - Check certificate validity
  - Test mixed content issues
- [ ] **Domain Configuration**
  - Main domain: tododjs.com
  - API subdomain: api.tododjs.com
  - WWW redirect: www.tododjs.com
- [ ] **Performance**
  - CDN configuration
  - Caching headers
  - Compression enabled

### Monitoring & Logging
- [ ] **Error Tracking**
  - Monitor console errors
  - Check API error logs
  - Verify error reporting
- [ ] **Performance Monitoring**
  - Page load times
  - API response times
  - Resource loading

---

## ✅ Test Results Summary

### Pass/Fail Criteria
- **✅ Pass**: Feature works as expected
- **⚠️ Partial**: Feature works with minor issues
- **❌ Fail**: Feature not working or major issues

### Bug Reporting Template
```
**Bug Title**: [Brief description]
**Severity**: [Critical/High/Medium/Low]
**User Type**: [Admin/User/Subscriber]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Environment**: [Browser/Device/OS]
**Screenshots**: [If applicable]
```

### Test Completion Checklist
- [ ] All admin features tested
- [ ] All user features tested
- [ ] All subscriber features tested
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed
- [ ] Performance benchmarks met
- [ ] Security measures validated
- [ ] Documentation updated

---

## 📞 Support & Troubleshooting

### Common Issues
1. **Audio Not Playing**: Check API_URL configuration
2. **Login Issues**: Verify JWT token handling
3. **Download Failures**: Check Wasabi S3 configuration
4. **Payment Issues**: Verify Stripe webhook endpoints

### Debug Tools
- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Monitor API calls and responses
- **PM2 Logs**: `pm2 logs tododjs-api` on VPS
- **Nginx Logs**: `/var/log/nginx/error.log`

### Contact Information
- **Technical Support**: admin@tododjs.com
- **WhatsApp Support**: +34612345678
- **Documentation**: Available in project repository

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Platform**: TodoDJS DJ Record Pool
