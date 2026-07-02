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
 * Hand a download entirely to the browser via a hidden iframe pointed at an
 * authenticated API URL (?token=). The server streams the file (or redirects
 * to a signed URL) with Content-Disposition: attachment, so the browser's own
 * download manager takes over — real progress in the downloads shelf, no
 * fetch timeout, and no buffering hundreds of MB into a JS blob. If the
 * server responds with a JSON error instead, it renders invisibly in the
 * iframe rather than corrupting the page or saving a junk file.
 */
export function triggerNativeDownload(url) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  // Keep it attached long enough for slow on-the-fly ZIP builds to hand off
  // to the download manager; removing it has no effect on completed handoffs.
  setTimeout(() => iframe.remove(), 10 * 60 * 1000);
}
