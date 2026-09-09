// Meta Conversions API (CAPI) — server-side Purchase events.
//
// Why server-side: the browser pixel alone is unreliable for Purchase.
// Ad blockers strip the pixel, and a customer who closes the tab before the
// success page renders never fires the event at all. CAPI sends the event
// directly from the Stripe webhook handler, so every confirmed first
// subscription payment is reported regardless of what happens in the browser.
//
// Dedup: the browser-side pixel AND this server call use the same event_id
// (the Stripe checkout session id). Meta deduplicates on (event_name, event_id)
// within a short window, so a customer who keeps the success page open does
// not produce two purchases.
//
// First payment only: this is called from handleCheckoutCompleted, which
// fires once per new subscription. Renewals go through handleInvoicePaid and
// are intentionally NOT reported as Purchase (they're not new acquisitions).

const META_PIXEL_ID = process.env.META_PIXEL_ID || '1324227174107795';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';

const GRAPH_API_VERSION = 'v21.0';

// SHA-256 hash, hex-encoded, as Meta requires for all PII in CAPI.
async function sha256Hex(value) {
  if (!value) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize per Meta's rules: lowercase, trim, remove spaces for phone.
function normalizePhone(raw) {
  if (!raw) return null;
  let p = raw.replace(/[^\d]/g, '');
  // Meta wants country code without +, e.g. 34600000000
  return p || null;
}

function normalizeName(raw) {
  if (!raw) return null;
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

// Send a Purchase event to Meta CAPI.
//   eventSourceId — Stripe checkout session id (used as event_id for dedup)
//   amount        — numeric value paid (e.g. 9.99)
//   currency      — ISO 4217 code (e.g. 'EUR')
//   customer      — { email, name, phone } from the Stripe session
//   eventTimeMs   — timestamp of the payment (Date.now() if omitted)
//
// Returns { success, sent, error } — never throws (logging only) so a Meta
// outage cannot block subscription activation.
export async function sendPurchaseEvent({ eventSourceId, amount, currency, customer = {}, eventTimeMs } = {}) {
  if (!META_CAPI_TOKEN) {
    console.warn('[Meta CAPI] META_CAPI_TOKEN not set — Purchase event not sent');
    return { success: false, sent: false, error: 'no token' };
  }
  if (!eventSourceId) {
    console.warn('[Meta CAPI] no eventSourceId (checkout session id) — skipping');
    return { success: false, sent: false, error: 'no event id' };
  }

  const eventId = String(eventSourceId);
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const cur = (currency || 'EUR').toUpperCase();

  // User data — Meta requires at least one identifier. We hash all PII.
  const userData = {};
  if (customer.email) {
    const h = await sha256Hex(customer.email.trim().toLowerCase());
    if (h) userData.em = [h];
  }
  if (customer.phone) {
    const h = await sha256Hex(normalizePhone(customer.phone));
    if (h) userData.ph = [h];
  }
  if (customer.name) {
    const parts = normalizeName(customer.name).split(' ');
    if (parts[0]) userData.fn = [await sha256Hex(parts[0])];
    if (parts[1]) userData.ln = [await sha256Hex(parts[1])];
  }
  // client_ip_address and client_user_agent help Meta match the server event
  // to the browser pixel for dedup; the webhook doesn't carry the buyer's
  // IP/UA, so we omit them rather than guess.

  const event = {
    event_name: 'Purchase',
    event_time: Math.floor((eventTimeMs || Date.now()) / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.replace(/\/+$/, '') + '/subscription/success'
      : undefined,
    user_data: userData,
    custom_data: {
      value,
      currency: cur,
      content_type: 'subscription',
      contents: [{ id: 'tododjs_subscription', quantity: 1, item_price: value }],
      payment_type: 'first_payment'
    }
  };

  // Test events only accepted when test_event_code is present.
  // NOTE: test_event_code is a TOP-LEVEL field in the request body, not
  // inside the event object. Putting it inside data[].test_event_code makes
  // Meta accept the event as real but never route it to Test Events.
  const payload = { data: [event] };
  if (META_TEST_EVENT_CODE) {
    payload.test_event_code = META_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_TOKEN)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      console.error('[Meta CAPI] request failed:', res.status, JSON.stringify(body));
      return { success: false, sent: false, error: body.error?.message || `HTTP ${res.status}` };
    }
    console.log(`[Meta CAPI] Purchase sent: eventId=${eventId} value=${value} ${cur} fb_trace_id=${body.fb_trace_id || '-'}`);
    return { success: true, sent: true };
  } catch (err) {
    console.error('[Meta CAPI] network error:', err.message);
    return { success: false, sent: false, error: err.message };
  }
}
