import { useTranslation } from 'react-i18next';

const REASON_LABELS = {
  account_sharing: { es: 'Compartición de cuenta', en: 'Account sharing' },
  content_sharing: { es: 'Compartición de contenido', en: 'Content sharing' },
  abusive_use:     { es: 'Uso abusivo de la plataforma', en: 'Abusive platform use' },
  piracy:          { es: 'Piratería', en: 'Piracy' },
  other:           { es: 'Otro motivo', en: 'Other reason' }
};

export default function BlockedScreen({ onLogout }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          {isEs ? 'Acceso suspendido' : 'Access suspended'}
        </h1>
        <p className="text-brand-text-tertiary text-lg mb-8">
          {isEs
            ? 'Tu cuenta ha sido bloqueada por el equipo de TodoDJs.'
            : 'Your account has been blocked by the TodoDJs team.'}
        </p>

        {/* Info card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
          <p className="text-sm text-brand-text-tertiary leading-relaxed">
            {isEs
              ? 'El acceso a tu cuenta y a todos los contenidos ha sido suspendido. No podrás descargar ni reproducir ningún track mientras tu cuenta permanezca bloqueada.'
              : 'Access to your account and all content has been suspended. You will not be able to download or play any tracks while your account remains blocked.'}
          </p>
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-brand-text-tertiary uppercase tracking-widest mb-2">
              {isEs ? '¿Crees que es un error?' : 'Think this is a mistake?'}
            </p>
            <p className="text-sm text-white">
              {isEs
                ? 'Contacta con nuestro equipo en '
                : 'Contact our team at '}
              <a href="mailto:support@tododjs.com" className="text-accent hover:underline font-medium">
                support@tododjs.com
              </a>
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
        >
          {isEs ? 'Cerrar sesión' : 'Sign out'}
        </button>

        <p className="text-xs text-brand-text-tertiary mt-6">© {new Date().getFullYear()} TodoDJs</p>
      </div>
    </div>
  );
}
