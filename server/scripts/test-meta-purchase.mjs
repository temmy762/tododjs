// Test script: fires a single Purchase event via Meta Conversions API with
// the test event code, so you can confirm it appears in Meta Events Manager
// → Test Events before going live.
//
// Usage:  node server/scripts/test-meta-purchase.mjs
//
// Requires in server/.env:
//   META_CAPI_TOKEN=<access token from Meta Events Manager>
//   META_TEST_EVENT_CODE=TEST84481
//   META_PIXEL_ID=1324227174107795

import 'dotenv/config';

const META_PIXEL_ID = process.env.META_PIXEL_ID || '1324227174107795';
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';
const GRAPH_API_VERSION = 'v21.0';

async function sha256Hex(value) {
  if (!value) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const email = 'test-purchase@tododjs.com';
const eventId = `test_${Date.now()}`;

const userData = {};
const em = await sha256Hex(email.trim().toLowerCase());
if (em) userData.em = [em];
userData.fn = [await sha256Hex('test')];
userData.ln = [await sha256Hex('customer')];

const event = {
  event_name: 'Purchase',
  event_time: Math.floor(Date.now() / 1000),
  event_id: eventId,
  action_source: 'website',
  event_source_url: 'https://tododjs.com/subscription/success',
  user_data: userData,
  custom_data: {
    value: 9.99,
    currency: 'EUR',
    content_type: 'subscription',
    contents: [{ id: 'tododjs_subscription', quantity: 1, item_price: 9.99 }],
    payment_type: 'first_payment'
  }
};

if (META_TEST_EVENT_CODE) {
  event.test_event_code = META_TEST_EVENT_CODE;
}

const payload = { data: [event] };
if (META_TEST_EVENT_CODE) {
  payload.test_event_code = META_TEST_EVENT_CODE;
}
// Remove test_event_code from inside the event object — it belongs at top level
delete event.test_event_code;
const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_TOKEN)}`;

console.log('=== Meta CAPI Test Request ===');
console.log('Pixel ID (dataset):', META_PIXEL_ID);
console.log('Event name:', event.event_name);
console.log('Event ID:', eventId);
console.log('Test event code:', META_TEST_EVENT_CODE || '(none)');
console.log('Value:', event.custom_data.value, event.custom_data.currency);
console.log('Graph API version:', GRAPH_API_VERSION);
console.log('Token (first 20 chars):', META_CAPI_TOKEN.slice(0, 20) + '...');
console.log('Payload:', JSON.stringify(payload, null, 2));
const rawBody = JSON.stringify(payload);
console.log('\n=== EXACT RAW JSON BODY SENT TO META ===');
console.log(rawBody);
console.log('=== END RAW BODY ===\n');
console.log('URL:', url.replace(META_CAPI_TOKEN, '<TOKEN_REDACTED>'));
console.log('\n=== Sending... ===\n');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: rawBody
});

const bodyText = await res.text();
console.log('HTTP status:', res.status, res.statusText);
console.log('Raw response body:', bodyText);

try {
  const body = JSON.parse(bodyText);
  console.log('\nParsed response:', JSON.stringify(body, null, 2));
  if (body.events_received) console.log('events_received:', body.events_received);
  if (body.error) console.log('ERROR:', JSON.stringify(body.error, null, 2));
} catch (e) {
  console.log('Response was not JSON:', e.message);
}
