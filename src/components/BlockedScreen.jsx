import { useTranslation } from 'react-i18next';

const REASON_DETAILS = {
  account_sharing: {
    es: {
      label:   'ACCESO REVOCADO — COMPARTICIÓN DE CUENTA',
      body:    'Tu acceso ha sido revocado de forma inmediata y permanente por compartir tu cuenta con terceros no autorizados.',
      warning: 'Cualquier nueva cuenta vinculada a ti también puede ser bloqueada automáticamente.',
    },
    en: {
      label:   'ACCESS REVOKED — ACCOUNT SHARING',
      body:    'Your access has been immediately and permanently revoked for sharing your account with unauthorized third parties.',
      warning: 'Any new account linked to you may also be automatically blocked.',
    },
  },
  content_sharing: {
    es: {
      label:   'ACCESO REVOCADO — FILTRACIÓN DE CONTENIDO',
      body:    'Tu acceso ha sido revocado de forma inmediata y permanente por filtrar, compartir o redistribuir contenido protegido.',
      warning: 'Cualquier nueva cuenta vinculada a ti también puede ser bloqueada automáticamente.',
    },
    en: {
      label:   'ACCESS REVOKED — CONTENT LEAKING',
      body:    'Your access has been immediately and permanently revoked for leaking, sharing or redistributing protected content.',
      warning: 'Any new account linked to you may also be automatically blocked.',
    },
  },
  abusive_use: {
    es: {
      label:   'ACCESO REVOCADO — USO ABUSIVO',
      body:    'Tu acceso ha sido revocado de forma inmediata por uso abusivo de la plataforma en contra de nuestros Términos de Servicio.',
      warning: 'Cualquier nueva cuenta vinculada a ti también puede ser bloqueada automáticamente.',
    },
    en: {
      label:   'ACCESS REVOKED — ABUSIVE USE',
      body:    'Your access has been immediately revoked for abusive use of the platform in violation of our Terms of Service.',
      warning: 'Any new account linked to you may also be automatically blocked.',
    },
  },
  piracy: {
    es: {
      label:   'ACCESO REVOCADO — PIRATERÍA',
      body:    'Tu acceso ha sido revocado de forma inmediata y permanente por actividades relacionadas con la piratería de contenidos.',
      warning: 'Cualquier nueva cuenta vinculada a ti también puede ser bloqueada automáticamente.',
    },
    en: {
      label:   'ACCESS REVOKED — PIRACY',
      body:    'Your access has been immediately and permanently revoked due to content piracy activities.',
      warning: 'Any new account linked to you may also be automatically blocked.',
    },
  },
  other: {
    es: {
      label:   'ACCESO REVOCADO PERMANENTEMENTE',
      body:    'Tu acceso ha sido revocado de forma inmediata. Para más detalles sobre el motivo, contacta con el equipo de soporte.',
      warning: 'Cualquier nueva cuenta vinculada a ti también puede ser bloqueada automáticamente.',
    },
    en: {
      label:   'ACCESS PERMANENTLY REVOKED',
      body:    'Your access has been immediately revoked. For more details on the reason, please contact the support team.',
      warning: 'Any new account linked to you may also be automatically blocked.',
    },
  },
};

export default function BlockedScreen({ user, onLogout }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');
  const lang = isEs ? 'es' : 'en';

  const reason = user?.blockReason || 'other';
  const details = REASON_DETAILS[reason]?.[lang] || REASON_DETAILS.other[lang];

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">

        {/* Ban icon */}
        <div className="flex justify-center mb-4">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#e53e3e" strokeWidth="2" fill="none" />
            <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-red-600 tracking-wide uppercase mb-6">
          {isEs ? 'ACCESO DENEGADO' : 'ACCESS DENIED'}
        </h1>

        {/* Reason box */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-left mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {isEs ? 'Motivo del ban:' : 'Reason for ban:'}
          </p>

          {/* Reason label row */}
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <circle cx="12" cy="12" r="11" stroke="#e53e3e" strokeWidth="2" fill="none" />
              <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
              {details.label}
            </span>
          </div>

          {/* Body text */}
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {details.body}
          </p>

          {/* Warning */}
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {details.warning}
          </p>

          {/* Contact */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {isEs ? 'Para más información, contacta a través de:' : 'For more information, please contact:'}
            {' '}
            <a href="mailto:support@tododjs.com" className="text-red-600 font-medium hover:underline">
              support@tododjs.com
            </a>
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 mb-6">
          {isEs
            ? 'Si crees que esto es un error, contacta con el administrador del sitio.'
            : 'If you believe this is a mistake, please contact the site administrator.'}
        </p>

        {/* Button */}
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {isEs ? 'Gestionar mi cuenta' : 'Manage My Account'}
        </button>
      </div>
    </div>
  );
}
