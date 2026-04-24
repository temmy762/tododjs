# TodoDJS — Session Progress Log

> Last updated: April 24, 2026 — Session checkpoint

---

## Servers
- Frontend: `npm run dev` → http://localhost:5173
- Backend: `node server.js` (from `/server`) → http://localhost:5000
- Start both: kill node processes first (`Stop-Process`), then start backend, then frontend

---

## Fixes Completed ✅

| # | Issue | Files Changed |
|---|---|---|
| 1 | AlbumDetailView modal → inline page (MusicControlPanel visible during playback) | `AlbumDetailView.jsx`, `App.jsx` |
| 2 | Waveform fractional fill for smooth progress | `MusicControlPanel.jsx` |
| 3 | CheckoutPage lazy crash (no Suspense wrapper) | `App.jsx` |
| 4 | Download infinite spinner (planId `'premium'` doesn't exist → `navigate('/pricing')`) | `App.jsx` |
| 5 | UserDashboard status badge: role-aware colours (Admin/Active/Free/Inactive) | `UserDashboard.jsx` |
| 6 | LiveMashUpPage banner responsive (aspect-ratio, object-cover) | `LiveMashUpPage.jsx` |
| 7 | Subscription status: TopBar crown on cancelled, SubscriptionDashboard green on cancelled | `TopBar.jsx`, `SubscriptionDashboard.jsx`, `server/controllers/subscriptionController.js` |
| 8 | ErrorBoundary added around main Suspense in App.jsx | `App.jsx`, `ErrorBoundary.jsx` |

---

## Pending Issues (Monday Meeting — Priority Order)

1. **Admin acts like free plan** — admin can't download or play tracks
2. **File uploads failing** — ZIPs fail, stuck at 0%, ghost uploads (says 100% but tracks don't appear)
3. **Multiple sessions not blocked** — same user on PC + mobile + iPad simultaneously
4. **Users showing free/inactive after payment** — Stripe webhook not syncing
5. **Tracks don't play (Life Mashup)** — loads but no audio
6. **Key detection always shows 5A** — must read from filename instead
7. **Cover art not detected** — embedded MP3 artwork ignored
8. **Bulk category tagging missing** — need multi-select + assign category button
9. **Page transitions freeze** — switching Home → Library causes white flash/freeze
10. **Untranslated strings** — some UI still in English, should be Spanish

---

## Standing Rules
- Every fix must be verified across **all 4 roles**: admin, paid user, free user, anonymous
- Every `lazy()` component MUST have `<Suspense>` ancestor when rendered conditionally
- All subscription gates must short-circuit for `user.role === 'admin'` FIRST

---

## Git
- Repo: `temmy762/tododjs` (main branch)
- Last commit pushed: subscription status + banner fixes
- Push command: `git add -A && git commit -m "..." && git push origin main`
