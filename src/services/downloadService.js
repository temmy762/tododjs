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
 * Poll for the short-lived `dl_warning` cookie the server sets when a ZIP
 * hand-off crosses a download-protection threshold. Native (anchor/redirect)
 * downloads can't carry a JSON payload back to the SPA, so the warning
 * travels via this cookie instead. Calls onWarning({ level, pausedUntil })
 * once and clears the cookie.
 */
export function pollDownloadWarning(onWarning, { timeoutMs = 20000, intervalMs = 1000 } = {}) {
  const started = Date.now();
  const timer = setInterval(() => {
    const match = document.cookie.match(/(?:^|;\s*)dl_warning=([^;]*)/);
    if (match) {
      clearInterval(timer);
      document.cookie = 'dl_warning=; Max-Age=0; path=/';
      try {
        const warning = JSON.parse(decodeURIComponent(match[1]));
        if (warning && warning.level) onWarning(warning);
      } catch { /* malformed cookie — ignore */ }
    } else if (Date.now() - started > timeoutMs) {
      clearInterval(timer);
    }
  }, intervalMs);
}
