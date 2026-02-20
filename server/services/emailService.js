import { Resend } from 'resend';
import {
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
  getSubscriptionEmailTemplate,
  getDownloadReceiptEmailTemplate,
  getPaymentReceiptEmailTemplate,
  getSubscriptionCancelledEmailTemplate,
  getPaymentFailedEmailTemplate,
  getAdminNewSignupTemplate,
  getAdminNewPaymentTemplate,
  getAdminCancelledSubscriptionTemplate,
  getAdminExpiredSubscriptionTemplate
} from './emailTemplates.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'TodoDJs <noreply@tododjs.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Send an email via Resend
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    console.log(`Email sent to ${to}: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Welcome email sent after registration
 */
export async function sendWelcomeEmail(user) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getWelcomeEmailTemplate(user, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Password reset email with token link
 */
export async function sendPasswordResetEmail(user, resetToken) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getPasswordResetEmailTemplate(user, resetToken, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Subscription confirmation email
 */
export async function sendSubscriptionEmail(user, plan) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getSubscriptionEmailTemplate(user, plan, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Download receipt email
 */
export async function sendDownloadReceiptEmail(user, tracks) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getDownloadReceiptEmailTemplate(user, tracks, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Generic notification email
 */
export async function sendNotificationEmail(to, subject, message) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">TodoDJs</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${message}</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${new Date().getFullYear()} TodoDJs. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html, text: message });
}

// ─── User Payment & Subscription Emails ───

/**
 * Payment receipt email sent to user after successful payment
 */
export async function sendPaymentReceiptEmail(user, planName, amount, currency, endDate) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getPaymentReceiptEmailTemplate(user, planName, amount, currency, endDate, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Subscription cancelled email sent to user
 */
export async function sendSubscriptionCancelledEmail(user, planName, accessUntilDate) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getSubscriptionCancelledEmailTemplate(user, planName, accessUntilDate, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Payment failed email sent to user
 */
export async function sendPaymentFailedEmail(user) {
  const lang = user.preferredLanguage || 'en';
  const { subject, html, text } = getPaymentFailedEmailTemplate(user, lang);
  
  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

// ─── Admin Notification Emails ───

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Send admin notification (skips silently if ADMIN_EMAIL is not set)
 */
async function sendAdminNotification({ subject, html, text }) {
  if (!ADMIN_EMAIL) {
    console.log('ADMIN_EMAIL not set — skipping admin notification:', subject);
    return { success: false, error: 'ADMIN_EMAIL not configured' };
  }
  return sendEmail({ to: ADMIN_EMAIL, subject, html, text });
}

/**
 * Notify admin of a new user signup
 */
export async function notifyAdminNewSignup(user) {
  const { subject, html, text } = getAdminNewSignupTemplate(user);
  return sendAdminNotification({ subject, html, text });
}

/**
 * Notify admin of a new payment
 */
export async function notifyAdminNewPayment(user, planName, amount, currency) {
  const { subject, html, text } = getAdminNewPaymentTemplate(user, planName, amount, currency);
  return sendAdminNotification({ subject, html, text });
}

/**
 * Notify admin of a cancelled subscription
 */
export async function notifyAdminCancelledSubscription(user, planName) {
  const { subject, html, text } = getAdminCancelledSubscriptionTemplate(user, planName);
  return sendAdminNotification({ subject, html, text });
}

/**
 * Notify admin of an expired subscription
 */
export async function notifyAdminExpiredSubscription(user, planName) {
  const { subject, html, text } = getAdminExpiredSubscriptionTemplate(user, planName);
  return sendAdminNotification({ subject, html, text });
}

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubscriptionEmail,
  sendDownloadReceiptEmail,
  sendNotificationEmail,
  sendPaymentReceiptEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
  notifyAdminNewSignup,
  notifyAdminNewPayment,
  notifyAdminCancelledSubscription,
  notifyAdminExpiredSubscription
};
