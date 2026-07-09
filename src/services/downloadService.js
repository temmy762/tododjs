/**
 * Trigger a browser file download by navigating a hidden anchor to the URL.
 *
 * IMPORTANT: never use window.open(url, '_blank') for downloads that happen
 * after an async fetch — by then the click's user activation has expired and
 * popup blockers silently drop the new tab, making the download button appear
 * to do nothing. Anchor navigation is not subject to popup blocking, and the
 * signed URLs from the API carry Content-Disposition: attachment, so the
 * browser saves the file without leaving the SPA.
 */
export function triggerBrowserDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  // Ignored for cross-origin URLs (Wasabi), but the signed URL's
  // ResponseContentDisposition already sets the correct filename there.
  if (filename) a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Hand a download entirely to the browser via anchor navigation to an
 * authenticated API URL (?token=). The server streams the file (or redirects
 * to a signed URL) with Content-Disposition: attachment, so the browser's own
 * download manager takes over — real progress in the downloads shelf, no
 * fetch timeout, and no buffering hundreds of MB into a JS blob.
 *
 * IMPORTANT: this must be an ANCHOR, not a hidden iframe. Safari (macOS and
 * iOS/iPadOS) never hands iframe navigations to the download manager, so the
 * previous iframe approach silently did nothing on every Apple device —
 * while the MP3 flow (anchor navigation via triggerBrowserDownload) worked
 * everywhere. Content-Disposition: attachment keeps the SPA on the page.
 * If the user is blocked, the server 302s back into the SPA with query
 * params (?downloadBlocked=...) so the protection modal is shown instead of
 * a raw JSON error page.
 */
export function triggerNativeDownload(url) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Detect a Level-1 download-protection warning after a native (anchor/token)
 * ZIP hand-off, by re-fetching the current user and checking whether
 * downloadWarningLevel rose above what it was before this download started.
 *
 * A native anchor navigation can't carry a JSON payload back to the SPA, so
 * an in-band response isn't possible. An earlier version tried to relay the
 * warning via a `dl_warning` cookie set by the API — that doesn't work in
 * production because the API is served from a different subdomain
 * (api.tododjs.com) than the frontend (tododjs.com): cookies don't cross
 * subdomains without an explicit Domain attribute, and for pre-built ZIPs the
 * redirect goes straight to the Wasabi file URL, so the browser never even
 * revisits our domain to read it. Polling /api/auth/me instead uses the same
 * Bearer-token auth every other API call already uses, so it works
 * regardless of subdomain. (Level-2 suspension doesn't need this — the
 * server bounces the browser back to the frontend with a query param when
 * downloads are blocked outright.)
 */
export function pollDownloadWarning(onWarning, beforeLevel, { timeoutMs = 15000, intervalMs = 2000 } = {}) {
  const started = Date.now();
  const baseline = beforeLevel || 0;
  const timer = setInterval(async () => {
    if (Date.now() - started > timeoutMs) {
      clearInterval(timer);
      return;
    }
    try {
      const { authService } = await import('./authService');
      const fresh = await authService.getCurrentUser();
      if (fresh && fresh.downloadWarningLevel === 1 && baseline < 1) {
        clearInterval(timer);
        onWarning({ level: 1 });
      }
    } catch { /* transient — try again on the next tick */ }
  }, intervalMs);
}
