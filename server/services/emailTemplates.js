// Email templates in multiple languages

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Translation object for email content
const translations = {
  en: {
    welcome: {
      subject: 'Welcome to TodoDJs!',
      title: 'Welcome to TodoDJs!',
      subtitle: 'Your music journey starts here',
      greeting: 'Hey',
      message: 'Thanks for joining TodoDJs! You now have access to our curated record pool of high-quality tracks.',
      button: 'Start Browsing',
      footer: 'If you have any questions, feel free to reach out to our support team.',
      copyright: 'All rights reserved.'
    },
    passwordReset: {
      subject: 'Reset Your Password — TodoDJs',
      title: 'Password Reset',
      greeting: 'Hey',
      message: 'We received a request to reset your password. Click the button below to set a new password:',
      button: 'Reset Password',
      footer: 'This link will expire in 1 hour. If you didn\'t request this, you can safely ignore this email.',
      linkText: 'Or copy this link:',
      copyright: 'All rights reserved.'
    },
    subscription: {
      subject: 'Your {plan} Plan is Active — TodoDJs',
      title: 'Subscription Confirmed!',
      greeting: 'Hey',
      message: 'Your <strong style="color: #10b981;">{plan}</strong> subscription is now active! You can now download tracks and access premium features.',
      button: 'Start Downloading',
      footer: 'Thank you for supporting TodoDJs!',
      copyright: 'All rights reserved.'
    },
    downloadReceipt: {
      subject: 'Your Download Receipt — TodoDJs',
      title: 'Download Receipt',
      greeting: 'Hey',
      message: 'Here\'s a summary of your recent downloads:',
      downloadedOn: 'Downloaded on',
      copyright: 'All rights reserved.'
    },
    paymentReceipt: {
      subject: 'Payment Confirmed — TodoDJs',
      title: 'Payment Received!',
      greeting: 'Hey',
      message: 'Your payment has been successfully processed. Here are the details:',
      plan: 'Plan',
      amount: 'Amount',
      date: 'Date',
      status: 'Status',
      statusPaid: 'Paid',
      validUntil: 'Valid Until',
      footer: 'Thank you for your support! Enjoy your premium access.',
      button: 'Start Browsing',
      copyright: 'All rights reserved.'
    },
    subscriptionCancelled: {
      subject: 'Subscription Cancelled — TodoDJs',
      title: 'Subscription Cancelled',
      greeting: 'Hey',
      message: 'Your subscription has been cancelled. Here are the details:',
      plan: 'Plan',
      cancelledOn: 'Cancelled On',
      accessUntil: 'Access Until',
      accessNote: 'You will continue to have access until the end of your current billing period.',
      reactivate: 'Changed your mind? You can reactivate anytime.',
      button: 'Reactivate Subscription',
      footer: 'We\'re sorry to see you go. You can always come back!',
      copyright: 'All rights reserved.'
    },
    paymentFailed: {
      subject: 'Payment Failed — TodoDJs',
      title: 'Payment Failed',
      greeting: 'Hey',
      message: 'We were unable to process your payment. Please update your payment method to continue your subscription.',
      reason: 'This could be due to insufficient funds, an expired card, or a declined transaction.',
      button: 'Update Payment Method',
      footer: 'If you need help, please contact our support team.',
      copyright: 'All rights reserved.'
    },
    newUserSetup: {
      subject: 'Welcome to TodoDJs — Set Your Password',
      title: 'Welcome to TodoDJs!',
      greeting: 'Hey',
      message: 'Your subscription is now active and your account has been created.',
      step: 'To get started, please set your password by clicking the button below:',
      button: 'Set Your Password',
      footer: 'This link will expire in 24 hours. After setting your password you can log in and start downloading tracks!',
      linkText: 'Or copy this link:',
      copyright: 'All rights reserved.'
    }
  },
  es: {
    welcome: {
      subject: '¡Bienvenido a TodoDJs!',
      title: '¡Bienvenido a TodoDJs!',
      subtitle: 'Tu viaje musical comienza aquí',
      greeting: 'Hola',
      message: '¡Ya estás dentro de TodoDJS! Accede a toda nuestra biblioteca creada para DJs que quieren ir al siguiente nivel. Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.',
      button: 'Comenzar a Explorar',
      footer: 'Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.',
      copyright: 'Todos los derechos reservados.'
    },
    passwordReset: {
      subject: 'Restablecer tu Contraseña — TodoDJs',
      title: 'Restablecer Contraseña',
      greeting: 'Hola',
      message: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación para establecer una nueva contraseña:',
      button: 'Restablecer Contraseña',
      footer: 'Este enlace expirará en 1 hora. Si no solicitaste esto, puedes ignorar este correo de forma segura.',
      linkText: 'O copia este enlace:',
      copyright: 'Todos los derechos reservados.'
    },
    subscription: {
      subject: 'Tu Plan {plan} está Activo — TodoDJs',
      title: '¡Suscripción Confirmada!',
      greeting: 'Hola',
      message: '¡Tu suscripción <strong style="color: #10b981;">{plan}</strong> está activa! Ahora puedes descargar pistas y acceder a funciones premium.',
      button: 'Comenzar a Descargar',
      footer: '¡Gracias por apoyar a TodoDJs!',
      copyright: 'Todos los derechos reservados.'
    },
    downloadReceipt: {
      subject: 'Tu Recibo de Descarga — TodoDJs',
      title: 'Recibo de Descarga',
      greeting: 'Hola',
      message: 'Aquí está el resumen de tus descargas recientes:',
      downloadedOn: 'Descargado el',
      copyright: 'Todos los derechos reservados.'
    },
    paymentReceipt: {
      subject: 'Pago Confirmado — TodoDJs',
      title: '¡Pago Recibido!',
      greeting: 'Hola',
      message: 'Tu pago ha sido procesado exitosamente. Aquí están los detalles:',
      plan: 'Plan',
      amount: 'Monto',
      date: 'Fecha',
      status: 'Estado',
      statusPaid: 'Pagado',
      validUntil: 'Válido Hasta',
      footer: '¡Gracias por tu apoyo! Disfruta de tu acceso premium.',
      button: 'Comenzar a Explorar',
      copyright: 'Todos los derechos reservados.'
    },
    subscriptionCancelled: {
      subject: 'Suscripción Cancelada — TodoDJs',
      title: 'Suscripción Cancelada',
      greeting: 'Hola',
      message: 'Tu suscripción ha sido cancelada. Aquí están los detalles:',
      plan: 'Plan',
      cancelledOn: 'Cancelado El',
      accessUntil: 'Acceso Hasta',
      accessNote: 'Continuarás teniendo acceso hasta el final de tu período de facturación actual.',
      reactivate: '¿Cambiaste de opinión? Puedes reactivar en cualquier momento.',
      button: 'Reactivar Suscripción',
      footer: 'Lamentamos verte ir. ¡Siempre puedes volver!',
      copyright: 'Todos los derechos reservados.'
    },
    paymentFailed: {
      subject: 'Pago Fallido — TodoDJs',
      title: 'Pago Fallido',
      greeting: 'Hola',
      message: 'No pudimos procesar tu pago. Por favor actualiza tu método de pago para continuar con tu suscripción.',
      reason: 'Esto podría deberse a fondos insuficientes, una tarjeta vencida o una transacción rechazada.',
      button: 'Actualizar Método de Pago',
      footer: 'Si necesitas ayuda, por favor contacta a nuestro equipo de soporte.',
      copyright: 'Todos los derechos reservados.'
    },
    newUserSetup: {
      subject: 'Bienvenido a TodoDJs — Configura tu Contraseña',
      title: '¡Bienvenido a TodoDJs!',
      greeting: 'Hola',
      message: 'Tu suscripción está activa y tu cuenta ha sido creada.',
      step: 'Para comenzar, configura tu contraseña haciendo clic en el botón de abajo:',
      button: 'Configurar Contraseña',
      footer: 'Este enlace expirará en 24 horas. Después de configurar tu contraseña podrás iniciar sesión y comenzar a descargar pistas.',
      linkText: 'O copia este enlace:',
      copyright: 'Todos los derechos reservados.'
    }
  }
};

// Helper function to get translation
function t(lang, key, replacements = {}) {
  const keys = key.split('.');
  let value = translations[lang] || translations.en;
  
  for (const k of keys) {
    value = value[k];
    if (!value) return key;
  }
  
  // Replace placeholders
  if (typeof value === 'string') {
    Object.keys(replacements).forEach(placeholder => {
      value = value.replace(`{${placeholder}}`, replacements[placeholder]);
    });
  }
  
  return value;
}

// Base email template
function getEmailTemplate(lang, title, content, { preheader = '', gradient = 'linear-gradient(135deg, #6366f1, #8b5cf6)' } = {}) {
  const year = new Date().getFullYear();
  const copyright = t(lang, 'welcome.copyright');
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;">
  ${preheaderHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f0f0f;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;width:100%;background:#0a0a0a;color:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:${gradient};padding:40px 30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">${title}</h1>
          </div>
          ${content}
          <div style="padding:20px 30px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#555;">© ${year} TodoDJs. ${copyright}</p>
            <p style="margin:0;font-size:11px;color:#444;">TodoDJs &middot; <a href="mailto:support@tododjs.com" style="color:#6366f1;text-decoration:none;">support@tododjs.com</a> &middot; tododjs.com</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Welcome email template
export function getWelcomeEmailTemplate(user, lang = 'en') {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'welcome.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'welcome.message')}</p>
      <div style="margin: 25px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'welcome.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'welcome.footer')}</p>
    </div>
  `;
  
  return {
    subject: t(lang, 'welcome.subject'),
    html: getEmailTemplate(lang, t(lang, 'welcome.title'), content),
    text: `${t(lang, 'welcome.greeting')} ${user.name}, ${t(lang, 'welcome.message')} ${FRONTEND_URL}`
  };
}

// Password reset email template
export function getPasswordResetEmailTemplate(user, resetToken, lang = 'en', isNewUser = false) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  if (isNewUser) {
    const content = `
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'newUserSetup.greeting')} <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'newUserSetup.message')}</p>
        <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'newUserSetup.step')}</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'newUserSetup.button')}</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'newUserSetup.footer')}</p>
        <p style="font-size: 12px; color: #555; margin-top: 20px; word-break: break-all;">${t(lang, 'newUserSetup.linkText')} ${resetUrl}</p>
      </div>
    `;

    return {
      subject: t(lang, 'newUserSetup.subject'),
      html: getEmailTemplate(lang, t(lang, 'newUserSetup.title'), content, { gradient: 'linear-gradient(135deg, #10b981, #059669)' }),
      text: `${t(lang, 'newUserSetup.greeting')} ${user.name}, ${t(lang, 'newUserSetup.message')} ${resetUrl}`
    };
  }
  
  // Regular password reset email
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'passwordReset.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'passwordReset.message')}</p>
      <div style="margin: 25px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'passwordReset.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'passwordReset.footer')}</p>
      <p style="font-size: 12px; color: #555; margin-top: 20px; word-break: break-all;">${t(lang, 'passwordReset.linkText')} ${resetUrl}</p>
    </div>
  `;
  
  return {
    subject: t(lang, 'passwordReset.subject'),
    html: getEmailTemplate(lang, t(lang, 'passwordReset.title'), content),
    text: `${t(lang, 'passwordReset.greeting')} ${user.name}, ${t(lang, 'passwordReset.message')} ${resetUrl}`
  };
}

// Subscription confirmation email template
export function getSubscriptionEmailTemplate(user, planName, lang = 'en') {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'subscription.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'subscription.message', { plan: planName })}</p>
      <div style="margin: 25px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'subscription.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'subscription.footer')}</p>
    </div>
  `;
  
  return {
    subject: t(lang, 'subscription.subject', { plan: planName }),
    html: getEmailTemplate(lang, t(lang, 'subscription.title'), content, { gradient: 'linear-gradient(135deg, #10b981, #059669)', preheader: t(lang, 'subscription.footer') }),
    text: `${t(lang, 'subscription.greeting')} ${user.name}, ${t(lang, 'subscription.message', { plan: planName })} ${FRONTEND_URL}`
  };
}

// Download receipt email template
export function getDownloadReceiptEmailTemplate(user, tracks, lang = 'en') {
  const trackList = tracks.map(t => `<li style="padding: 6px 0; color: #a0a0a0; font-size: 14px;">${t.artist} — ${t.title}</li>`).join('');
  
  const dateOptions = lang === 'es' 
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  const locale = lang === 'es' ? 'es-ES' : 'en-US';
  
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'downloadReceipt.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'downloadReceipt.message')}</p>
      <ul style="list-style: none; padding: 0; margin: 15px 0; border: 1px solid #1a1a1a; border-radius: 8px; padding: 15px;">
        ${trackList}
      </ul>
      <p style="font-size: 13px; color: #555;">${t(lang, 'downloadReceipt.downloadedOn')} ${new Date().toLocaleDateString(locale, dateOptions)}</p>
    </div>
  `;
  
  return {
    subject: t(lang, 'downloadReceipt.subject'),
    html: getEmailTemplate(lang, t(lang, 'downloadReceipt.title'), content),
    text: `${t(lang, 'downloadReceipt.greeting')} ${user.name}, ${t(lang, 'downloadReceipt.message')} ${tracks.map(t => `${t.artist} - ${t.title}`).join(', ')}`
  };
}

// ─── User Payment & Subscription Templates ───

export function getPaymentReceiptEmailTemplate(user, planName, amount, currency, endDate, lang = 'en') {
  const locale = lang === 'es' ? 'es-ES' : 'en-US';
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = new Date().toLocaleDateString(locale, dateOptions);
  const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString(locale, dateOptions) : '';
  const currencySymbol = currency === 'EUR' || currency === '€' ? '€' : currency === 'USD' || currency === '$' ? '$' : currency || '€';

  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'paymentReceipt.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'paymentReceipt.message')}</p>
      <div style="margin: 20px 0; background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'paymentReceipt.plan')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #10b981; font-weight: 700; text-align: right; border-bottom: 1px solid #1a1a1a;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'paymentReceipt.amount')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid #1a1a1a;">${currencySymbol}${amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'paymentReceipt.date')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #e0e0e0; text-align: right; border-bottom: 1px solid #1a1a1a;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'paymentReceipt.status')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #10b981; font-weight: 600; text-align: right; border-bottom: 1px solid #1a1a1a;">✓ ${t(lang, 'paymentReceipt.statusPaid')}</td>
          </tr>
          ${formattedEndDate ? `<tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888;">${t(lang, 'paymentReceipt.validUntil')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #e0e0e0; text-align: right;">${formattedEndDate}</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="margin: 25px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'paymentReceipt.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'paymentReceipt.footer')}</p>
    </div>
  `;

  return {
    subject: t(lang, 'paymentReceipt.subject'),
    html: getEmailTemplate(lang, t(lang, 'paymentReceipt.title'), content, { gradient: 'linear-gradient(135deg, #10b981, #059669)', preheader: t(lang, 'paymentReceipt.message') }),
    text: `${t(lang, 'paymentReceipt.greeting')} ${user.name}, ${t(lang, 'paymentReceipt.message')} ${planName} - ${currencySymbol}${amount}`
  };
}

export function getSubscriptionCancelledEmailTemplate(user, planName, accessUntilDate, lang = 'en') {
  const locale = lang === 'es' ? 'es-ES' : 'en-US';
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedCancelDate = new Date().toLocaleDateString(locale, dateOptions);
  const formattedAccessDate = accessUntilDate ? new Date(accessUntilDate).toLocaleDateString(locale, dateOptions) : '';

  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'subscriptionCancelled.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'subscriptionCancelled.message')}</p>
      <div style="margin: 20px 0; background: #111; border: 1px solid #1a1a1a; border-radius: 10px; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'subscriptionCancelled.plan')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #ef4444; font-weight: 700; text-align: right; border-bottom: 1px solid #1a1a1a;">${planName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888; border-bottom: 1px solid #1a1a1a;">${t(lang, 'subscriptionCancelled.cancelledOn')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #e0e0e0; text-align: right; border-bottom: 1px solid #1a1a1a;">${formattedCancelDate}</td>
          </tr>
          ${formattedAccessDate ? `<tr>
            <td style="padding: 10px 0; font-size: 13px; color: #888;">${t(lang, 'subscriptionCancelled.accessUntil')}</td>
            <td style="padding: 10px 0; font-size: 14px; color: #f59e0b; text-align: right;">${formattedAccessDate}</td>
          </tr>` : ''}
        </table>
      </div>
      ${formattedAccessDate ? `<div style="margin: 15px 0; padding: 12px 16px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #f59e0b;">${t(lang, 'subscriptionCancelled.accessNote')}</p>
      </div>` : ''}
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'subscriptionCancelled.reactivate')}</p>
      <div style="margin: 25px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'subscriptionCancelled.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'subscriptionCancelled.footer')}</p>
    </div>
  `;

  return {
    subject: t(lang, 'subscriptionCancelled.subject'),
    html: getEmailTemplate(lang, t(lang, 'subscriptionCancelled.title'), content, { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', preheader: t(lang, 'subscriptionCancelled.accessNote') }),
    text: `${t(lang, 'subscriptionCancelled.greeting')} ${user.name}, ${t(lang, 'subscriptionCancelled.message')}`
  };
}

export function getPaymentFailedEmailTemplate(user, lang = 'en') {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6;">${t(lang, 'paymentFailed.greeting')} <strong>${user.name}</strong>,</p>
      <p style="font-size: 15px; color: #a0a0a0; line-height: 1.6;">${t(lang, 'paymentFailed.message')}</p>
      <div style="margin: 15px 0; padding: 12px 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #ef4444;">${t(lang, 'paymentFailed.reason')}</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="${FRONTEND_URL}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${t(lang, 'paymentFailed.button')}</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.6;">${t(lang, 'paymentFailed.footer')}</p>
    </div>
  `;

  return {
    subject: t(lang, 'paymentFailed.subject'),
    html: getEmailTemplate(lang, t(lang, 'paymentFailed.title'), content, { gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', preheader: t(lang, 'paymentFailed.reason') }),
    text: `${t(lang, 'paymentFailed.greeting')} ${user.name}, ${t(lang, 'paymentFailed.message')}`
  };
}

// ─── Admin Notification Templates ───

function getAdminEmailTemplate(title, content) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f0f0f;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;width:100%;background:#0a0a0a;color:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Admin Notification</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${title}</p>
          </div>
          ${content}
          <div style="padding:16px 30px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;font-size:11px;color:#555;">© ${year} TodoDJs Admin &middot; Automated notification</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

function adminInfoRow(label, value) {
  return `
    <tr>
      <td style="padding: 8px 0; font-size: 13px; color: #888; width: 140px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; font-size: 14px; color: #e0e0e0; font-weight: 500;">${value}</td>
    </tr>
  `;
}

export function getAdminNewSignupTemplate(user) {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 15px; color: #a0a0a0; margin: 0 0 20px;">A new user has registered on TodoDJs.</p>
      <table style="width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; padding: 16px;">
        <tbody style="display: block; padding: 16px;">
          ${adminInfoRow('Name', user.name)}
          ${adminInfoRow('Email', `<a href="mailto:${user.email}" style="color: #6366f1; text-decoration: none;">${user.email}</a>`)}
          ${adminInfoRow('Phone', user.phoneNumber || 'Not provided')}
          ${adminInfoRow('Language', (user.preferredLanguage || 'en').toUpperCase())}
          ${adminInfoRow('Registered', formatDate(new Date()))}
        </tbody>
      </table>
    </div>
  `;

  return {
    subject: `🆕 New Signup: ${user.name} (${user.email})`,
    html: getAdminEmailTemplate('New User Registration', content),
    text: `New user registered: ${user.name} (${user.email})`
  };
}

export function getAdminNewPaymentTemplate(user, plan, amount, currency) {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 15px; color: #a0a0a0; margin: 0 0 20px;">A payment has been received!</p>
      <table style="width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; padding: 16px;">
        <tbody style="display: block; padding: 16px;">
          ${adminInfoRow('User', user.name)}
          ${adminInfoRow('Email', `<a href="mailto:${user.email}" style="color: #6366f1; text-decoration: none;">${user.email}</a>`)}
          ${adminInfoRow('Plan', `<span style="color: #10b981; font-weight: 700;">${plan}</span>`)}
          ${adminInfoRow('Amount', `<span style="color: #10b981; font-weight: 700;">${currency || '€'}${amount}</span>`)}
          ${adminInfoRow('Date', formatDate(new Date()))}
        </tbody>
      </table>
      <div style="margin-top: 20px; padding: 12px 16px; background: #10b981/10; border: 1px solid #10b98133; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #10b981;">💰 Revenue received! Subscription activated.</p>
      </div>
    </div>
  `;

  return {
    subject: `💰 New Payment: ${user.name} — ${currency || '€'}${amount} (${plan})`,
    html: getAdminEmailTemplate('New Payment Received', content),
    text: `Payment received from ${user.name} (${user.email}): ${currency || '€'}${amount} for ${plan}`
  };
}

export function getAdminCancelledSubscriptionTemplate(user, planName) {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 15px; color: #a0a0a0; margin: 0 0 20px;">A user has cancelled their subscription.</p>
      <table style="width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; padding: 16px;">
        <tbody style="display: block; padding: 16px;">
          ${adminInfoRow('User', user.name)}
          ${adminInfoRow('Email', `<a href="mailto:${user.email}" style="color: #6366f1; text-decoration: none;">${user.email}</a>`)}
          ${adminInfoRow('Plan', `<span style="color: #ef4444;">${planName || 'N/A'}</span>`)}
          ${adminInfoRow('Cancelled At', formatDate(new Date()))}
        </tbody>
      </table>
      <div style="margin-top: 20px; padding: 12px 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #ef4444;">⚠️ Subscription cancelled. Consider reaching out to the user.</p>
      </div>
    </div>
  `;

  return {
    subject: `❌ Subscription Cancelled: ${user.name} (${user.email})`,
    html: getAdminEmailTemplate('Subscription Cancelled', content),
    text: `Subscription cancelled by ${user.name} (${user.email}), plan: ${planName || 'N/A'}`
  };
}

export function getAdminExpiredSubscriptionTemplate(user, planName) {
  const content = `
    <div style="padding: 30px;">
      <p style="font-size: 15px; color: #a0a0a0; margin: 0 0 20px;">A user's subscription has expired.</p>
      <table style="width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; padding: 16px;">
        <tbody style="display: block; padding: 16px;">
          ${adminInfoRow('User', user.name)}
          ${adminInfoRow('Email', `<a href="mailto:${user.email}" style="color: #6366f1; text-decoration: none;">${user.email}</a>`)}
          ${adminInfoRow('Plan', planName || 'N/A')}
          ${adminInfoRow('Expired At', formatDate(new Date()))}
        </tbody>
      </table>
    </div>
  `;

  return {
    subject: `⏰ Subscription Expired: ${user.name} (${user.email})`,
    html: getAdminEmailTemplate('Subscription Expired', content),
    text: `Subscription expired for ${user.name} (${user.email}), plan: ${planName || 'N/A'}`
  };
}

export default {
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
};
