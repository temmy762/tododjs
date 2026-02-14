import dotenv from 'dotenv';
dotenv.config();

const { sendWelcomeEmail } = await import('./services/emailService.js');

const testEmail = process.argv[2] || 'delivered@resend.dev';

console.log('Sending test email to:', testEmail);
console.log('Using API key:', process.env.RESEND_API_KEY?.slice(0, 10) + '...');
console.log('From:', process.env.RESEND_FROM_EMAIL);

const result = await sendWelcomeEmail({ name: 'Test User', email: testEmail });
console.log('Result:', JSON.stringify(result, null, 2));
