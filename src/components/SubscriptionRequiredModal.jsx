import { X, Crown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SubscriptionRequiredModal({ isOpen, onClose, onViewPlans }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-hover border-2 border-accent/20 mb-4 shadow-lg shadow-accent/30">
              <Crown className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('subscription.subscriptionRequired')}
            </h2>
            <p className="text-sm text-brand-text-tertiary">
              {t('subscription.subscribeToDownload')}
            </p>
          </div>

          {/* Features */}
          <div className="bg-dark-elevated rounded-lg p-6 mb-6 border border-white/5">
            <h3 className="text-sm font-semibold text-brand-text-tertiary uppercase tracking-wider mb-4">
              {t('subscription.unlockFeatures')}:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-accent flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-white">{t('subscription.unlimitedDownloads')}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-accent flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-white">{t('subscription.fullWebAccess')}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-accent flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-white">{t('subscription.whatsappSupport')}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-accent flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-white">{t('subscription.noCommitment')}</span>
              </li>
            </ul>
          </div>

          {/* Pricing Info */}
          <div className="text-center mb-6">
            <p className="text-sm text-brand-text-tertiary mb-2">
              {t('subscription.startingFrom')}
            </p>
            <div className="text-3xl font-bold text-white">
              €19.99<span className="text-lg text-brand-text-tertiary">/month</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => {
                onClose();
                onViewPlans();
              }}
              className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40"
            >
              {t('subscription.viewPlans')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
