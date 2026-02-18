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
    }
  },
  es: {
    welcome: {
      subject: '¡Bienvenido a TodoDJs!',
      title: '¡Bienvenido a TodoDJs!',
      subtitle: 'Tu viaje musical comienza aquí',
      greeting: 'Hola',
      message: '¡Gracias por unirte a TodoDJs! Ahora tienes acceso a nuestra colección curada de pistas de alta calidad.',
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
function getEmailTemplate(lang, title, content) {
  const year = new Date().getFullYear();
  const copyright = t(lang, 'welcome.copyright');
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${title}</h1>
      </div>
      ${content}
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${year} TodoDJs. ${copyright}</p>
      </div>
    </div>
  `;
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
export function getPasswordResetEmailTemplate(user, resetToken, lang = 'en') {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  
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
  
  const titleContent = `
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${t(lang, 'subscription.title')}</h1>
    </div>
  `;
  
  const year = new Date().getFullYear();
  const copyright = t(lang, 'subscription.copyright');
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border-radius: 12px; overflow: hidden;">
      ${titleContent}
      ${content}
      <div style="padding: 20px 30px; border-top: 1px solid #1a1a1a; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #555;">© ${year} TodoDJs. ${copyright}</p>
      </div>
    </div>
  `;
  
  return {
    subject: t(lang, 'subscription.subject', { plan: planName }),
    html,
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

export default {
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
  getSubscriptionEmailTemplate,
  getDownloadReceiptEmailTemplate
};
