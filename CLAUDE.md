# TodoDJS — Project Instructions for Claude

## Overview
TodoDJS is a DJ music platform (record pool + mashups) with a React SPA frontend and Express.js backend API. Users subscribe via Stripe to stream/download tracks. Admins manage uploads, categories, genres, users, and analytics. The platform supports multilingual UI (English/Spanish), device management, and audio analysis (BPM, key detection, genre classification).

## Tech Stack
- **Frontend:** React 18 (Vite, JavaScript JSX), React Router DOM v7, Tailwind CSS v3, i18next (en/es), Lucide icons
- **Backend:** Express.js (Node.js, ES modules), Mongoose (MongoDB)
- **Storage:** Wasabi (S3-compatible) for audio files and artwork
- **Payments:** Stripe (subscriptions, checkout sessions, webhooks)
- **Email:** Resend + Nodemailer fallback
- **Audio Analysis:** Audd.io (BPM), Spotify API (BPM fallback), essentia.js (key detection), OpenAI (genre/category detection)
- **Auth:** JWT (httpOnly cookies), bcryptjs
- **Testing:** Vitest + Testing Library + jsdom
- **Deployment:** PM2 (cluster mode), Nginx reverse proxy

## Project Structure
```
Todo/
├── src/                        # Frontend (React SPA)
│   ├── App.jsx                 # Main app with lazy-loaded routes
│   ├── main.jsx                # Entry point, BrowserRouter, UploadProvider
│   ├── index.css               # Global styles + Tailwind
│   ├── components/             # All UI components
│   │   ├── admin/              # Admin dashboard panels (tracks, users, uploads, analytics, etc.)
│   │   ├── auth/               # Auth-related components
│   │   ├── MusicControlPanel.jsx   # Global audio player (waveform, play/pause, seek)
│   │   ├── UserDashboard.jsx       # User profile + subscription management
│   │   ├── LibraryPage.jsx         # Track library with filters
│   │   ├── RecordPoolPage.jsx      # Main record pool browsing
│   │   ├── LiveMashUpPage.jsx      # Mashup section
│   │   ├── SubscriptionDashboard.jsx
│   │   ├── TopBar.jsx / Sidebar.jsx
│   │   └── ...
│   ├── context/
│   │   ├── PlayerContext.jsx   # Audio player context
│   │   └── UploadContext.jsx   # Upload state management
│   ├── i18n/
│   │   ├── config.js           # i18next initialization
│   │   └── locales/            # en.json, es.json
│   ├── pages/                  # Static/legal pages (terms, privacy, cookies, etc.)
│   ├── services/               # API service wrappers
│   └── test/                   # Test setup + specs
├── server/                     # Backend (Express API)
│   ├── server.js               # Express app entry, route registration, middleware
│   ├── config/
│   │   ├── db.js               # Mongoose connection
│   │   ├── stripe.js           # Stripe SDK instance
│   │   └── wasabi.js           # Wasabi S3 client config
│   ├── models/                 # Mongoose models
│   │   ├── User.js             # User with subscription, devices, role
│   │   ├── Track.js            # Track with BPM, key, genre, category
│   │   ├── Album.js / Pack.js / Source.js
│   │   ├── Mashup.js / MashupCategory.js
│   │   ├── Collection.js / Download.js
│   │   ├── Category.js / SubscriptionPlan.js
│   │   └── DatePack.js / MashupSettings.js
│   ├── controllers/            # Route controllers (21 files)
│   │   ├── authController.js       # Login, register, password reset
│   │   ├── trackController.js      # CRUD tracks, streaming
│   │   ├── downloadController.js   # Download with DRM/protection
│   │   ├── stripeController.js     # Stripe checkout, webhooks
│   │   ├── subscriptionController.js
│   │   ├── albumController.js
│   │   ├── mashupController.js
│   │   ├── adminController.js
│   │   ├── userController.js
│   │   ├── deviceController.js     # Device management/blocking
│   │   └── ...
│   ├── routes/                 # Express route definitions (22 files)
│   ├── middleware/
│   │   ├── auth.js             # JWT protect, optionalAuth, authorize, checkSubscription
│   │   └── subscription.js     # requireSubscription (Stripe-aware, admin bypass)
│   ├── services/
│   │   ├── emailService.js         # Resend + Nodemailer
│   │   ├── emailTemplates.js       # All email HTML templates
│   │   ├── audioAnalysis.js        # BPM/key analysis pipeline
│   │   ├── categoryDetection.js    # OpenAI-powered category detection
│   │   ├── genreDetection.js       # OpenAI-powered genre detection
│   │   ├── keyfinderAnalysis.js    # Key detection via essentia.js
│   │   ├── openai.js               # OpenAI API wrapper
│   │   ├── auddBpm.js              # Audd.io BPM detection
│   │   ├── spotifyBpm.js           # Spotify BPM fallback
│   │   ├── tonalityDetection.js    # Tonality analysis
│   │   └── processingQueue.js      # Bull queue for async processing
│   ├── utils/                  # Utility functions (deviceParser, etc.)
│   ├── scripts/                # Admin/maintenance scripts
│   └── seeders/                # DB seeders (createAdmin.js)
├── deploy/
│   ├── ecosystem.config.cjs    # PM2 config (cluster, 2 instances, port 5000)
│   ├── redeploy.sh             # One-command VPS redeploy script
│   ├── setup-vps.sh            # Initial VPS provisioning script
│   └── nginx/                  # Nginx config files
├── package.json                # Frontend deps + scripts
├── vite.config.js              # Vite config with API proxy to localhost:5000
├── tailwind.config.js          # Tailwind with custom brand colors (CSS vars)
├── progress.md                 # Session progress log
└── .env.example                # Frontend env template
```

## Key Domain Concepts

### User Roles
- **admin:** Full access, bypasses all subscription gates. Can manage tracks, users, uploads, categories, analytics.
- **paid user:** Has active Stripe subscription (or admin-granted). Can stream, download, create collections.
- **free user:** No active subscription. Limited access (preview tracks, cannot download).
- **anonymous:** No login. Can browse but not play/download.

### Subscription System
- Stripe-based with plans defined in `SubscriptionPlan` model.
- Subscription statuses: `active`, `cancelled`, `past_due`, `inactive`.
- **Cancelled but within period** still has access (access until `endDate`).
- **Past due grace period:** 10 days after `endDate` — user retains access.
- **Admin bypass:** `req.user.role === 'admin'` short-circuits ALL subscription checks (in both `auth.js` and `subscription.js` middleware).
- **Admin-granted subscriptions:** If `subscription.grantedByAdmin` is true and no `planId`, user is allowed through.

### Device Management
- Users can have up to N devices (configured per plan).
- Devices tracked via `x-device-id` header, parsed from user-agent.
- Multiple simultaneous sessions can be blocked (device limit enforcement).
- Device info: deviceName, deviceType, browser, os, ipAddress, lastActive.

### Audio Analysis Pipeline
- **BPM:** Audd.io API first → Spotify fallback → essentia.js fallback.
- **Key detection:** essentia.js (e.g., "5A", "C# minor").
- **Genre:** OpenAI-powered classification from filename/metadata.
- **Category:** OpenAI-powered, detects category from track metadata.
- **Tonality:** Separate analysis for harmonic mixing support.
- Processing handled via Bull queue for async non-blocking analysis.

### File Storage (Wasabi S3)
- Audio files stored in Wasabi buckets.
- Presigned URLs for secure download/streaming.
- Uploads via `@aws-sdk/lib-storage` (multipart for large files).
- ZIP downloads created on-the-fly using `archiver`.

### Track Lifecycle
1. Admin uploads file (via BulkUploadModal or CollectionUploadModal).
2. File stored in Wasabi S3.
3. Audio analysis pipeline runs (BPM, key, genre, category).
4. Track appears in RecordPool/Library with metadata.
5. Users can stream (PlayerContext) or download (with subscription check).

## Code Conventions

### General
- JavaScript (JSX) — no TypeScript on this project.
- 2-space indentation.
- camelCase for variables/functions, PascalCase for components.
- ES modules (`"type": "module"` in both package.json files).

### Frontend (React)
- Functional components with hooks (`useState`, `useEffect`, `useRef`, `useCallback`).
- `lazy()` for code-splitting — **every `lazy()` component MUST have a `<Suspense>` ancestor**.
- `ErrorBoundary` wraps the main Suspense in `App.jsx`.
- API calls via `fetch()` to `/api/...` (Vite proxy handles routing to backend in dev).
- Context providers: `UploadProvider` (upload state), `PlayerContext` (audio playback).
- Tailwind CSS with custom brand colors via CSS variables:
  - `--brand-bg-primary`, `--brand-bg-dark`, `--brand-bg-secondary`
  - `--brand-red`, `--brand-red-hover`
  - `--brand-text-primary`, `--brand-text-secondary`, `--brand-text-tertiary`
- Use Tailwind classes: `dark-bg`, `dark-surface`, `dark-elevated`, `accent`, `brand-red`, etc.
- i18next for all user-facing strings — **never hardcode UI text in English**. Use `t('key')` and add keys to both `en.json` and `es.json`.

### Backend (Express)
- ES modules (`import/export`).
- Controller pattern: routes → controllers → models.
- All routes protected with `protect` middleware (JWT auth).
- Admin-only routes use `authorize('admin')`.
- Subscription-gated routes use `checkSubscription(...)` or `requireSubscription`.
- Error responses: `{ success: false, message: "..." }` with appropriate HTTP status.
- Success responses: `{ success: true, data: ... }` or `{ success: true, message: "..." }`.
- Mongoose models with virtuals where needed (e.g., User subscription status).

### Auth Flow
- JWT stored in httpOnly cookie + `Authorization: Bearer` header.
- `protect` middleware: checks header → cookie → query param (for downloads).
- `optionalAuth`: populates `req.user` if token present, never blocks.
- `authorize(...roles)`: role-based access control.
- `checkSubscription(...plans)`: plan-level gating (admin bypasses).
- `checkSubscriptionActive`: just checks active status (admin bypasses).
- `requireSubscription` (subscription.js): Stripe-aware, handles cancelled/past_due/grace.

## Important Gotchas

1. **Admin bypasses everything** — `role === 'admin'` must short-circuit FIRST in all subscription/permission checks. Both `auth.js` and `subscription.js` enforce this.
2. **Every `lazy()` needs `<Suspense>`** — missing Suspense wrappers caused crashes (fixed, but always check when adding new lazy routes).
3. **Cancelled subscriptions retain access** until `endDate` — don't block users whose status is `cancelled` but are still within their paid period.
4. **Past due grace period** — 10 days after `endDate`, `past_due` users still have access.
5. **Admin-granted subscriptions** — if `grantedByAdmin` is true and no `planId`, let them through (they don't have a Stripe subscription).
6. **Device ID via header** — `x-device-id` header is used for device tracking. Fire-and-forget upsert in `protect` middleware.
7. **i18n** — all UI strings must go through `t()`. Both `en.json` and `es.json` must be updated together.
8. **Vite proxy** — in dev, `/api` is proxied to `http://localhost:5000`. In production, Nginx handles this routing.
9. **Wasabi S3** — use presigned URLs for downloads. Never expose Wasabi credentials to the frontend.
10. **Stripe webhooks** — ensure webhook endpoint syncs subscription status to the User model. Webhook failures cause users to show as free/inactive after payment.

## Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Backend (`server/.env`)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/tododjs
JWT_SECRET=your_secret
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
WASABI_ACCESS_KEY_ID=xxx
WASABI_SECRET_ACCESS_KEY=xxx
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_BUCKET=tododjs
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@tododjs.com
OPENAI_API_KEY=sk-xxx
AUDD_API_KEY=xxx
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
```

## Running the Project

### Development (two terminals)
```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev          # nodemon, port 5000

# Terminal 2 — Frontend
npm install
npm run dev          # Vite, port 5173
```
Open `http://localhost:5173` — Vite proxies `/api` to `http://localhost:5000`.

### Testing
```bash
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
```

### Production Build
```bash
# Frontend
npm run build        # Outputs to dist/

# Backend
cd server
npm install --production
npm start            # node server.js, port 5000
```

### VPS Deployment
```bash
# On VPS (project at /var/www/tododjs)
cd /var/www/tododjs
git pull origin main
npm install
npm run build
cd server
npm install --production
pm2 restart tododjs-api
sudo nginx -t && sudo systemctl reload nginx
```

Or use the redeploy script:
```bash
chmod +x deploy/redeploy.sh && ./deploy/redeploy.sh
```

### PM2 Details
- App name: `tododjs-api`
- Mode: cluster (2 instances)
- Port: 5000
- Logs: `/var/log/pm2/tododjs-error.log`, `/var/log/pm2/tododjs-out.log`

## When Making Changes

- Prefer minimal, focused edits — don't refactor unrelated code.
- Follow existing patterns in the file you're editing.
- **Verify across all 4 roles**: admin, paid user, free user, anonymous.
- All subscription gates must short-circuit for `user.role === 'admin'` FIRST.
- Every `lazy()` component MUST have a `<Suspense>` ancestor when rendered conditionally.
- When adding UI strings, update both `en.json` and `es.json`.
- When adding API endpoints, register routes in `server.js` and create corresponding route + controller files.
- When adding Mongoose models, import them where needed — don't use `require()` (ES modules use `import`).
- When touching Stripe logic, always sync webhook events to the User model's `subscription` field.
- When touching audio analysis, remember it runs via Bull queue — don't block the main request thread.

## Pending Issues (from progress.md)
1. Admin acts like free plan — admin can't download or play tracks
2. File uploads failing — ZIPs fail, stuck at 0%, ghost uploads
3. Multiple sessions not blocked — same user on PC + mobile + iPad simultaneously
4. Users showing free/inactive after payment — Stripe webhook not syncing
5. Tracks don't play (Live Mashup) — loads but no audio
6. Key detection always shows 5A — must read from filename instead
7. Cover art not detected — embedded MP3 artwork ignored
8. Bulk category tagging missing — need multi-select + assign category
9. Page transitions freeze — switching Home → Library causes white flash/freeze
10. Untranslated strings — some UI still in English, should be Spanish

## Git
- Repo: `temmy762/tododjs` (main branch)
- Push: `git add -A && git commit -m "..." && git push origin main`
