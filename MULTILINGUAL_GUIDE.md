# Multilingual Support Guide

Your TodoDJs application now supports **English** and **Spanish** languages.

## Features Added

### 1. Translation System
- **Library**: react-i18next with i18next
- **Languages**: English (en) and Spanish (es)
- **Auto-detection**: Automatically detects browser language
- **Persistence**: Language preference saved in localStorage

### 2. Language Switcher
- Located in the top navigation bar
- Shows current language flag (🇺🇸 or 🇪🇸)
- Click to switch between languages
- Changes apply immediately across the entire app

### 3. Translation Files

**Location**: `src/i18n/locales/`

**English** (`en.json`):
```json
{
  "nav": { "home": "Home", "library": "Library", ... },
  "search": { "placeholder": "Search tracks, artists, albums..." },
  "auth": { "welcomeBack": "Welcome Back", ... },
  ...
}
```

**Spanish** (`es.json`):
```json
{
  "nav": { "home": "Inicio", "library": "Biblioteca", ... },
  "search": { "placeholder": "Buscar pistas, artistas, álbumes..." },
  "auth": { "welcomeBack": "Bienvenido de Nuevo", ... },
  ...
}
```

## How to Use Translations in Components

### 1. Import the hook
```javascript
import { useTranslation } from 'react-i18next';
```

### 2. Use in component
```javascript
function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('nav.home')}</h1>
      <button>{t('actions.save')}</button>
      <p>{t('messages.loginSuccess')}</p>
    </div>
  );
}
```

### 3. With variables (interpolation)
```javascript
// In translation file:
{
  "welcome": "Welcome, {{name}}!"
}

// In component:
{t('welcome', { name: user.name })}
```

## Adding New Translations

### 1. Add to both language files
Edit `src/i18n/locales/en.json` and `src/i18n/locales/es.json`

### 2. Use consistent keys
```json
{
  "section": {
    "subsection": {
      "key": "value"
    }
  }
}
```

### 3. Access with dot notation
```javascript
t('section.subsection.key')
```

## Components Updated

✅ **TopBar.jsx** - Search placeholder and language switcher added
✅ **LanguageSwitcher.jsx** - New component for switching languages

## Components to Update

To add translations to other components, follow this pattern:

1. Import `useTranslation`
2. Get the `t` function
3. Replace hardcoded strings with `t('key')`

Example for **Sidebar.jsx**:
```javascript
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { t } = useTranslation();
  
  return (
    <nav>
      <a href="/">{t('nav.home')}</a>
      <a href="/library">{t('nav.library')}</a>
      <a href="/admin">{t('nav.admin')}</a>
    </nav>
  );
}
```

## Expanding Translation Keys

You can add more translations to cover:
- Admin panel labels
- Form validation messages
- Success/error notifications
- Button labels
- Modal titles
- Table headers
- And more...

Just add the keys to both `en.json` and `es.json` files.

## Testing

1. Open the app
2. Click the language switcher (🇺🇸 icon in top bar)
3. Select "Español" 
4. Verify the search placeholder changes to Spanish
5. Switch back to English to confirm it works both ways

## Adding More Languages

To add more languages (e.g., French, German):

1. Create new translation file: `src/i18n/locales/fr.json`
2. Add to `src/i18n/config.js`:
```javascript
import fr from './locales/fr.json';

resources: {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr }
}
```
3. Add to language switcher:
```javascript
{ code: 'fr', name: 'Français', flag: '🇫🇷' }
```

## Best Practices

1. **Keep keys organized** - Group by feature/section
2. **Use descriptive keys** - `auth.loginButton` not `btn1`
3. **Maintain consistency** - Same structure in all language files
4. **Test both languages** - Ensure translations make sense
5. **Handle plurals** - Use i18next plural features when needed
6. **Context matters** - Same English word may need different Spanish translations

## Current Translation Coverage

### ✅ Fully Translated Components
- **Sidebar** - All navigation labels (Home, Library, Record Pool, Live Mashup, Admin, Profile, Login)
- **TopBar** - Search placeholder, Subscribe button, All Tonalities selector
- **AuthModal** - Complete login/signup forms with all labels and messages
- **AdminDashboard** - All admin navigation items
- **DownloadModal** - Download dialog with action buttons
- **LanguageSwitcher** - Language selection component

### 📋 Translation Keys Available
- **Navigation** (nav.*) - 15 keys
- **Search** (search.*) - 3 keys
- **Authentication** (auth.*) - 16 keys
- **Subscription** (subscription.*) - 9 keys
- **Tracks** (tracks.*) - 15 keys
- **Actions** (actions.*) - 21 keys
- **Admin** (admin.*) - 19 keys
- **Library** (library.*) - 7 keys
- **Messages** (messages.*) - 17 keys
- **Common** (common.*) - 16 keys
- **Profile** (profile.*) - 6 keys

### 🔄 Components Ready for Translation
The following components can be easily updated by importing `useTranslation` and replacing hardcoded text:
- TrackCard
- TrackListView
- AlbumDetailView
- LibraryPage
- RecordPoolPage
- UserDashboard
- PremiumPrompt
- And more...

## Implementation Summary

**Total Translation Keys**: 144 keys in English and Spanish
**Components Updated**: 6 major components
**Languages Supported**: English (en), Spanish (es)

You can expand coverage by updating more components to use the `t()` function!
