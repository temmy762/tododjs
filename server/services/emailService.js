import { Resend } from 'resend';

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
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Welcome to TodoDJs!</h1>
        <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.85);">Your music journey starts here</p>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">Hey <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">Thanks for joining TodoDJs! You now have access to our curated record pool of high-quality tracks.</p>
        <div style="margin: 25px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Start Browsing</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.6;">If you have any questions, feel free to reach out to our support team.</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${new Date().getFullYear()} TodoDJs. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to TodoDJs!',
    html,
    text: `Welcome to TodoDJs, ${user.name}! Your music journey starts here. Visit ${FRONTEND_URL} to start browsing.`
  });
}

/**
 * Password reset email with token link
 */
export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Password Reset</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">Hey <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.6;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #555; margin-top: 20px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${new Date().getFullYear()} TodoDJs. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password — TodoDJs',
    html,
    text: `Hey ${user.name}, reset your password here: ${resetUrl}. This link expires in 1 hour.`
  });
}

/**
 * Subscription confirmation email
 */
export async function sendSubscriptionEmail(user, plan) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Subscription Confirmed!</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">Hey <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">Your <strong style="color: #10b981;">${plan}</strong> subscription is now active! You can now download tracks and access premium features.</p>
        <div style="margin: 25px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Start Downloading</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.6;">Thank you for supporting TodoDJs!</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${new Date().getFullYear()} TodoDJs. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Your ${plan} Plan is Active — TodoDJs`,
    html,
    text: `Hey ${user.name}, your ${plan} subscription is now active! Visit ${FRONTEND_URL} to start downloading.`
  });
}

/**
 * Download receipt email
 */
export async function sendDownloadReceiptEmail(user, tracks) {
  const trackList = tracks.map(t => `<li style="padding: 6px 0; color: #a0a0a0; font-size: 14px;">${t.artist} — ${t.title}</li>`).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Download Receipt</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">Hey <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">Here's a summary of your recent downloads:</p>
        <ul style="list-style: none; padding: 0; margin: 15px 0; border: 1px solid #1a1a1a; border-radius: 8px; padding: 15px;">
          ${trackList}
        </ul>
        <p style="font-size: 13px; color: #555;">Downloaded on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${new Date().getFullYear()} TodoDJs. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Your Download Receipt — TodoDJs',
    html,
    text: `Hey ${user.name}, here's your download receipt: ${tracks.map(t => `${t.artist} - ${t.title}`).join(', ')}`
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

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubscriptionEmail,
  sendDownloadReceiptEmail,
  sendNotificationEmail
};
