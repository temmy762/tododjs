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
