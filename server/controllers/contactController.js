import { sendEmail } from '../services/emailService.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.RESEND_REPLY_TO || 'support@tododjs.com';

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, attachments } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Nombre, correo y mensaje son obligatorios.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Dirección de correo inválida.' });
    }

    const attachmentList = Array.isArray(attachments) && attachments.length
      ? `<p><strong>Archivos adjuntos:</strong> ${attachments.join(', ')}</p>`
      : '';

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Contacto] ${subject?.trim() || 'Sin asunto'} — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#eee;padding:24px;border-radius:12px;">
          <h2 style="color:#e53e3e;margin-top:0;">📬 Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 12px;color:#aaa;white-space:nowrap;">Nombre</td><td style="padding:6px 12px;">${name}</td></tr>
            <tr><td style="padding:6px 12px;color:#aaa;white-space:nowrap;">Correo</td><td style="padding:6px 12px;"><a href="mailto:${email}" style="color:#e53e3e;">${email}</a></td></tr>
            <tr><td style="padding:6px 12px;color:#aaa;white-space:nowrap;">Teléfono</td><td style="padding:6px 12px;">${phone?.trim() || '—'}</td></tr>
            <tr><td style="padding:6px 12px;color:#aaa;white-space:nowrap;">Asunto</td><td style="padding:6px 12px;">${subject?.trim() || '—'}</td></tr>
          </table>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;white-space:pre-wrap;line-height:1.6;">${message}</div>
          ${attachmentList}
        </div>`,
      replyTo: email,
    });

    await sendEmail({
      to: email,
      subject: '✅ Recibimos tu mensaje — TodoDJs',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#eee;padding:24px;border-radius:12px;">
          <h2 style="color:#e53e3e;margin-top:0;">Hola, ${name} 👋</h2>
          <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo a la brevedad.</p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;white-space:pre-wrap;line-height:1.6;margin-top:16px;">${message}</div>
          <p style="color:#888;font-size:13px;margin-top:24px;">— El equipo de TodoDJs</p>
        </div>`,
    });

    res.json({ success: true, message: 'Mensaje enviado correctamente.' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, message: 'Error al enviar el mensaje. Inténtalo de nuevo.' });
  }
};
