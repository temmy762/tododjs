import { lazy } from 'react';

/**
 * Wrap React.lazy so a failed dynamic import (stale chunk after a new deploy)
 * triggers ONE full page reload to fetch the fresh index.html + chunks,
 * instead of showing the "Failed to fetch dynamically imported module" error.
 * A sessionStorage flag prevents infinite reload loops if the chunk is
 * genuinely missing.
 */
export default function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      const alreadyReloaded = sessionStorage.getItem('chunk_reload') === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        // Return a never-resolving promise while the page reloads
        return new Promise(() => {});
      }
      sessionStorage.removeItem('chunk_reload');
      throw error;
    }).then((module) => {
      sessionStorage.removeItem('chunk_reload');
      return module;
    })
  );
}
