import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const { sendPasswordResetEmail, sendWelcomeEmail } = await import('./services/emailService.js');

const testEmail = process.argv[2] || 'delivered@resend.dev';
const mode = process.argv[3] || 'reset';

console.log('\n─────────────────────────────────────');
console.log('  Resend Email Diagnostic');
console.log('─────────────────────────────────────');
console.log('  To       :', testEmail);
console.log('  Mode     :', mode, '(reset | welcome)');
console.log('  API Key  :', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 8) + '...' : '⚠ NOT SET');
console.log('  From     :', process.env.RESEND_FROM_EMAIL || '⚠ NOT SET (using default)');
console.log('  Frontend :', process.env.FRONTEND_URL || '⚠ NOT SET');
console.log('─────────────────────────────────────\n');

const fakeUser = { name: 'Test User', email: testEmail, preferredLanguage: 'en' };

let result;
if (mode === 'welcome') {
  result = await sendWelcomeEmail(fakeUser);
} else {
  result = await sendPasswordResetEmail(fakeUser, 'test-reset-token-abc123');
}

console.log('\nResult:', JSON.stringify(result, null, 2));
