# Multilingual Email System - Complete Implementation

## Overview
All emails sent by TodoDJs are now automatically sent in the user's preferred language (English or Spanish). The system detects the user's language preference during registration and stores it in their profile.

---

## ✅ What's Been Implemented

### **1. User Language Preference**
- Added `preferredLanguage` field to User model
- Supported languages: `en` (English) and `es` (Spanish)
- Default: `en` (English)

**User Model Update:**
```javascript
preferredLanguage: {
  type: String,
  enum: ['en', 'es'],
  default: 'en'
}
```

---

### **2. Multilingual Email Templates**
Created comprehensive email templates in both languages for:
- ✅ Welcome emails
- ✅ Password reset emails
- ✅ Subscription confirmation emails
- ✅ Download receipt emails

**File:** `server/services/emailTemplates.js`

**Template Functions:**
- `getWelcomeEmailTemplate(user, lang)`
- `getPasswordResetEmailTemplate(user, resetToken, lang)`
- `getSubscriptionEmailTemplate(user, planName, lang)`
- `getDownloadReceiptEmailTemplate(user, tracks, lang)`

---

### **3. Updated Email Service**
All email functions now automatically use the user's preferred language:

**Before:**
```javascript
export async function sendWelcomeEmail(user) {
  // Hardcoded English email
  const html = `<div>Welcome to TodoDJs!</div>`;
  // ...
}
```

**After:**
```javascript
export async function sendWelcomeEmail(user) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getWelcomeEmailTemplate(user, lang);
  
  return sendEmail({ to: user.email, subject, html, text });
}
```

---

### **4. Language Detection During Registration**

**Backend (authController.js):**
```javascript
// Detect language from:
// 1. Explicit preferredLanguage in request body
// 2. Accept-Language header
// 3. Default to 'en'
const language = preferredLanguage || 
                (req.headers['accept-language']?.startsWith('es') ? 'es' : 'en');

const user = await User.create({
  name,
  email,
  password,
  phoneNumber: phoneNumber || undefined,
  preferredLanguage: language
});
```

**Frontend (AuthModal.jsx):**
```javascript
// Send current UI language during registration
body: JSON.stringify({
  name: formData.name,
  email: formData.email,
  phoneNumber: formData.phoneNumber,
  password: formData.password,
  deviceId: getDeviceId(),
  preferredLanguage: i18n.language || 'en'  // ← Current UI language
})
```

---

## 📧 Email Templates

### **English Email Examples**

#### Welcome Email
- **Subject:** "Welcome to TodoDJs!"
- **Title:** "Welcome to TodoDJs!"
- **Message:** "Thanks for joining TodoDJs! You now have access to our curated record pool of high-quality tracks."
- **Button:** "Start Browsing"

#### Password Reset
- **Subject:** "Reset Your Password — TodoDJs"
- **Title:** "Password Reset"
- **Message:** "We received a request to reset your password. Click the button below to set a new password:"
- **Button:** "Reset Password"

#### Subscription Confirmation
- **Subject:** "Your {plan} Plan is Active — TodoDJs"
- **Title:** "Subscription Confirmed!"
- **Message:** "Your {plan} subscription is now active! You can now download tracks and access premium features."
- **Button:** "Start Downloading"

---

### **Spanish Email Examples**

#### Welcome Email
- **Subject:** "¡Bienvenido a TodoDJs!"
- **Title:** "¡Bienvenido a TodoDJs!"
- **Message:** "¡Gracias por unirte a TodoDJs! Ahora tienes acceso a nuestra colección curada de pistas de alta calidad."
- **Button:** "Comenzar a Explorar"

#### Password Reset
- **Subject:** "Restablecer tu Contraseña — TodoDJs"
- **Title:** "Restablecer Contraseña"
- **Message:** "Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación para establecer una nueva contraseña:"
- **Button:** "Restablecer Contraseña"

#### Subscription Confirmation
- **Subject:** "Tu Plan {plan} está Activo — TodoDJs"
- **Title:** "¡Suscripción Confirmada!"
- **Message:** "¡Tu suscripción {plan} está activa! Ahora puedes descargar pistas y acceder a funciones premium."
- **Button:** "Comenzar a Descargar"

---

## 🔄 How It Works

### **Registration Flow:**
1. User selects language in UI (English or Spanish)
2. User fills registration form
3. Frontend sends `preferredLanguage: 'en'` or `'es'` in request
4. Backend saves language preference to user profile
5. Welcome email sent in user's preferred language

### **Password Reset Flow:**
1. User requests password reset
2. Backend fetches user from database
3. Reads `user.preferredLanguage` field
4. Generates email template in that language
5. Sends password reset email in user's language

### **Subscription Flow:**
1. User completes payment
2. Subscription activated
3. Backend fetches user profile
4. Reads `user.preferredLanguage`
5. Sends confirmation email in user's language

---

## 🎯 Supported Email Types

All email types now support multilingual content:

| Email Type | Function | Languages |
|------------|----------|-----------|
| Welcome | `sendWelcomeEmail(user)` | EN, ES |
| Password Reset | `sendPasswordResetEmail(user, token)` | EN, ES |
| Subscription | `sendSubscriptionEmail(user, plan)` | EN, ES |
| Download Receipt | `sendDownloadReceiptEmail(user, tracks)` | EN, ES |

---

## 🌍 Language Detection Priority

The system uses this priority order to determine user's language:

1. **Explicit preference** - `preferredLanguage` in request body
2. **Browser language** - `Accept-Language` header
3. **Default** - English (`en`)

---

## 📝 Translation Structure

**Email templates use a centralized translation object:**

```javascript
const translations = {
  en: {
    welcome: {
      subject: 'Welcome to TodoDJs!',
      title: 'Welcome to TodoDJs!',
      greeting: 'Hey',
      message: 'Thanks for joining TodoDJs!...',
      button: 'Start Browsing',
      footer: 'If you have any questions...',
      copyright: 'All rights reserved.'
    },
    // ... more email types
  },
  es: {
    welcome: {
      subject: '¡Bienvenido a TodoDJs!',
      title: '¡Bienvenido a TodoDJs!',
      greeting: 'Hola',
      message: '¡Gracias por unirte a TodoDJs!...',
      button: 'Comenzar a Explorar',
      footer: 'Si tienes alguna pregunta...',
      copyright: 'Todos los derechos reservados.'
    },
    // ... more email types
  }
};
```

---

## 🧪 Testing

### **Test English Emails:**
1. Register with UI in English
2. Check email inbox
3. Verify email is in English

### **Test Spanish Emails:**
1. Switch UI to Spanish
2. Register new account
3. Check email inbox
4. Verify email is in Spanish

### **Test Password Reset:**
1. Request password reset
2. Email should match user's `preferredLanguage`

### **Test Subscription:**
1. Subscribe to a plan
2. Confirmation email should match user's language

---

## 🔧 Adding New Languages

To add a new language (e.g., French):

1. **Update User Model:**
```javascript
preferredLanguage: {
  type: String,
  enum: ['en', 'es', 'fr'],  // Add 'fr'
  default: 'en'
}
```

2. **Add Translations to emailTemplates.js:**
```javascript
const translations = {
  en: { /* ... */ },
  es: { /* ... */ },
  fr: {  // Add French translations
    welcome: {
      subject: 'Bienvenue à TodoDJs!',
      title: 'Bienvenue à TodoDJs!',
      // ... more translations
    }
  }
};
```

3. **Update Frontend Language Detection:**
```javascript
const language = preferredLanguage || 
                (req.headers['accept-language']?.startsWith('es') ? 'es' :
                 req.headers['accept-language']?.startsWith('fr') ? 'fr' : 'en');
```

---

## ✅ Benefits

1. **Better User Experience** - Users receive emails in their native language
2. **Automatic Detection** - No manual configuration needed
3. **Consistent Branding** - Professional emails in all languages
4. **Easy Maintenance** - Centralized translation management
5. **Scalable** - Easy to add new languages

---

## 📊 Summary

**Files Modified:**
- ✅ `server/models/User.js` - Added `preferredLanguage` field
- ✅ `server/services/emailTemplates.js` - Created multilingual templates
- ✅ `server/services/emailService.js` - Updated to use templates
- ✅ `server/controllers/authController.js` - Language detection
- ✅ `src/components/auth/AuthModal.jsx` - Send language preference

**Languages Supported:**
- ✅ English (en)
- ✅ Spanish (es)

**Email Types Covered:**
- ✅ Welcome emails
- ✅ Password reset emails
- ✅ Subscription confirmation emails
- ✅ Download receipt emails

**All emails are now sent in the user's preferred language automatically!** 🎉
