# TodoDJS - Deployment Guide for Bug Fixes and Translations

## Date: February 24, 2026

---

## ✅ COMPLETED FIXES

### 🔴 Critical Backend Fixes (COMPLETED)

#### 1. Stripe Subscription Bug - FIXED ✅
**Problem**: Users paying €19.99+ via Stripe remained on "Free" plan instead of upgrading to "Premium"

**Solution Applied**:
- Added `plan` field to User subscription schema for backward compatibility
- Updated `stripeController.js` to set both `planId` and `plan` when activating subscription
- Updated `stripeController.js` to set `maxDevices` based on plan type (1 for Individual, 2 for Shared)
- Fixed `User.canDownload()` method to check `subscription.status === 'active'` and `subscription.planId`
- Fixed all download controllers to use proper subscription checks

**Files Modified**:
- ✅ `server/models/User.js`
- ✅ `server/controllers/stripeController.js`
- ✅ `server/controllers/downloadController.js`

#### 2. Download/Playback Access Bug - FIXED ✅
**Problem**: Non-admin users couldn't play or download tracks even with active subscriptions

**Solution**: Fixed all subscription validation to use `planId` and `status` fields instead of non-existent `plan` field

#### 3. Email Templates - UPDATED ✅
**Spanish welcome email updated to**:
"¡Ya estás dentro de TodoDJS! Accede a toda nuestra biblioteca creada para DJs que quieren ir al siguiente nivel. Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte."

**File Modified**:
- ✅ `server/services/emailTemplates.js`

---

### 🎨 Frontend Translations (COMPLETED)

#### Homepage (Inicio) - COMPLETED ✅
- ✅ "Trending" → "Más Descargado"
- ✅ "New Drops" → "Últimas Subidas"
- ✅ "24 Hours" → "24 Horas"
- ✅ "7 Days" → "7 Días"
- ✅ "30 Days" → "30 Días"
- ✅ "Featured Albums" → "Últimas Subidas"
- ✅ Subtitle → "Últimas novedades de tus record pools y packs Premium favoritos"
- ✅ Fixed hardcoded localhost URL to use API_URL

**Files Modified**:
- ✅ `src/components/TrendingSection.jsx`
- ✅ `src/components/PlaylistsSection.jsx`

#### Library (Mi Biblioteca) - COMPLETED ✅
- ✅ "Date Added (Newest)" → "Fecha De Subida"
- ✅ "Title (A-Z)" → "Título (A-Z)"
- ✅ "Artist (A-Z)" → "Artista (A-Z)"
- ✅ "BPM (High to Low)" → "BPM (Mayor a Menor)"
- ✅ "Songs per page:" → "Pistas por página:"

**File Modified**:
- ✅ `src/components/LibraryPage.jsx`

#### Navigation - COMPLETED ✅
- ✅ "Pool de grabaciones" → "Records Pools"
- ✅ "Mashup en vivo" → "Live Mashup"
- ✅ "Browse curated music sources" → "Accede a todas tus record pools y packs Premium en un único lugar."

**Files Modified**:
- ✅ `src/i18n/locales/es.json`
- ✅ `src/i18n/locales/en.json`
- ✅ `src/components/RecordPoolPage.jsx`

#### Audio Player - COMPLETED ✅
- ✅ "Preview ended" → "Vista Previa Finalizada."
- ✅ "Go Premium" → "Suscribete."

**File Modified**:
- ✅ `src/components/MusicControlPanel.jsx`

#### Create Account Modal - COMPLETED ✅
- ✅ "Create a Free Account" → "Crea tu cuenta gratuita"
- ✅ "Sign up to like tracks..." → "Suscríbete para guardar música y probar la plataforma."
- ✅ "Upgrade to Premium..." → "Hazte Premium para desbloquear todo el contenido y descargar sin límites."
- ✅ "Full-length song streaming" → "Reproducción completa en streaming"
- ✅ "Unlimited high-quality downloads" → "Descargas ilimitadas en alta calidad"
- ✅ "Early access to new releases" → "Acceso a Records Pools y Packs Premium"
- ✅ "Sign Up Free" → "Crea Tu Cuenta Gratis"
- ✅ "Maybe later" → "Quizás Más Tarde"

**File Modified**:
- ✅ `src/components/PremiumPrompt.jsx`

---

## 📋 REMAINING TASKS

### User Dashboard Translations (PENDING)
Need to translate all text in `src/components/UserDashboard.jsx`:
- "My Account" → "Mi Cuenta"
- "Overview" → "Descripción General"
- "DOWNLOADS" → "DESCARGAS"
- "FAVORITES" → "FAVORITOS"
- "Account Details" → "Detalles De Cuenta"
- And all other fields listed in user requirements

### Subscription/Checkout Modal (PENDING)
- "You will be redirected..." → "Serás redirigido a la página segura de pago de Stripe para completar tu suscripción."
- "Secure payment powered by Stripe" → "Pago 100% seguro a través de Stripe"

### Forms - Remove Placeholders (PENDING)
Remove all placeholder text like "John Doe", "+1 (555) 123-4567" from input fields

### Set Spanish as Default (PENDING)
Update `src/i18n/config.js` to set `fallbackLng: 'es'` instead of `'en'`

---

## 🐛 KNOWN BUGS TO FIX

### Email Service (CRITICAL)
**Status**: Email service shows as "disabled"
**Action Required**: 
1. Check `.env` file on production server for `RESEND_API_KEY`
2. Verify API key is valid
3. Test email sending after deployment

### Live Mashup Section
1. **Bulk Upload**: Multiple file selection not working
2. **Genre Detection**: Always returns "House" instead of detecting actual genre
3. **Key/BPM**: Not properly integrated or displayed

### UI Bugs
1. **24h Trends**: Not displaying on homepage
2. **User IPs**: Not showing in security section
3. **Account Icon**: Glitching/disappearing

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Step 1: Backend Deployment

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/tododjs/server

# Pull latest changes
git pull origin main

# Install any new dependencies (if needed)
npm install

# Restart PM2
pm2 restart tododjs-api

# Check logs
pm2 logs tododjs-api --lines 50
```

### Step 2: Frontend Deployment

```bash
# On your local machine or VPS
cd /var/www/tododjs

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in the 'dist' folder
# Copy to your web server directory
sudo cp -r dist/* /var/www/tododjs/html/

# Or if using a different setup, deploy the dist folder to your hosting
```

### Step 3: Verify Environment Variables

Check that these are set in `server/.env`:
```env
RESEND_API_KEY=your_resend_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=https://tododjs.com
MONGODB_URI=your_mongodb_connection_string
WASABI_ACCESS_KEY=your_wasabi_key
WASABI_SECRET_KEY=your_wasabi_secret
```

### Step 4: Test Critical Features

1. **Test Subscription Flow**:
   - Register new user
   - Subscribe to Individual Monthly (€19.99)
   - Verify user is upgraded to Premium (not Free)
   - Check Stripe dashboard for payment
   - Verify user can download tracks

2. **Test Email Service**:
   - Register new user
   - Check if welcome email is received
   - Test password reset email

3. **Test Translations**:
   - Visit homepage
   - Verify "Más Descargado" instead of "Trending"
   - Check Library page for Spanish sort options
   - Test audio player preview limit message

4. **Test Downloads**:
   - As subscriber, download individual track
   - Download full album
   - Verify no errors

---

## 📊 Git Commits Made

1. **Commit 1**: `Fix critical bugs: Stripe subscription upgrade, download/playback access, email templates`
   - Fixed Stripe subscription not upgrading users
   - Fixed download/playback access for non-admin users
   - Updated Spanish welcome email

2. **Commit 2**: `Apply Spanish translations to frontend - Homepage, Library, Navigation, Audio Player, Modals`
   - Translated Homepage sections
   - Translated Library sort options
   - Translated Navigation labels
   - Translated Audio Player messages
   - Translated Premium/Signup modals

---

## 🔍 Testing Checklist

- [ ] User can register and receives welcome email
- [ ] User can subscribe and payment processes correctly
- [ ] User is upgraded from "Free" to "Premium" after payment
- [ ] Premium users can download tracks without errors
- [ ] Premium users can play full tracks (not just 30s preview)
- [ ] Homepage shows "Más Descargado" instead of "Trending"
- [ ] Library shows Spanish sort options
- [ ] Audio player shows "Vista Previa Finalizada" message
- [ ] Premium prompt shows Spanish text
- [ ] Navigation shows "Records Pools" and "Live Mashup"

---

## 📞 Support

If issues arise during deployment:
1. Check PM2 logs: `pm2 logs tododjs-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

## 🎯 Next Steps After Deployment

1. Complete remaining User Dashboard translations
2. Fix Live Mashup bulk upload
3. Fix genre detection (ChatGPT integration)
4. Fix 24h trends display
5. Add user IP tracking to security section
6. Test and fix account icon glitch
7. Change Genre buttons to Record Pool sources (Intensa Music, Latin Box, etc.)

---

**Deployment Status**: ✅ Ready for Backend + Partial Frontend
**Remaining Work**: ~30% (User Dashboard, forms, remaining bugs)
**Priority**: Deploy critical fixes now, complete remaining translations in next update

