import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reports SPA navigations to the Meta Pixel.
 *
 * The snippet in index.html fires PageView once, when the document loads.
 * TodoDJS never reloads the document afterwards — moving between the record
 * pool, pricing, library and so on only swaps React views — so without this
 * Meta would record a single PageView per session no matter how much of the
 * site someone actually visited. That under-reports traffic and starves the
 * ad delivery optimisation of the signal it needs.
 *
 * The first render is deliberately skipped: index.html has already counted
 * that one, and firing again here would double-count every landing page.
 */
export default function MetaPixelRouteTracker() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}
