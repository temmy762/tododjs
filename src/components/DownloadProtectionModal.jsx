import { useTranslation } from 'react-i18next';

export default function DownloadProtectionModal({ alert, onDismiss }) {
  const { t } = useTranslation();
  if (!alert) return null;
  const { level, pausedUntil } = alert;

  const formatExpiry = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (level === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-dark-elevated border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-black/60">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-xl font-bold text-yellow-300">
              {t('downloadProtection.level1Title', 'Very fast downloads detected')}
            </h2>
          </div>
          <p className="text-sm text-brand-text-secondary leading-relaxed text-center mb-6">
            {t('downloadProtection.level1Message', 'We have detected a download speed higher than usual. You can continue downloading content normally, but avoid making consecutive large downloads to avoid triggering a temporary security pause. This measure helps protect TODODJS against mass downloads.')}
          </p>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors"
          >
            {t('downloadProtection.level1Button', 'Understood')}
          </button>
        </div>
      </div>
    );
  }

  if (level === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-dark-elevated border border-orange-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-black/60">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⏸️</div>
            <h2 className="text-xl font-bold text-orange-300">
              {t('downloadProtection.level2Title', 'Downloads temporarily paused')}
            </h2>
            <p className="text-sm text-orange-400 mt-1 font-semibold">
              🔒 {t('downloadProtection.level2Subtitle', 'Unusual download activity detected')}
            </p>
          </div>
          <p className="text-sm text-brand-text-secondary leading-relaxed text-center mb-4">
            {t('downloadProtection.level2Message', 'Our system has detected a download pattern incompatible with normal use of the platform. For security reasons, downloads have been suspended for 12 hours. Repeating this behavior may result in the permanent suspension of the account and the definitive loss of access to TODODJS.')}
          </p>
          <p className="text-xs text-green-400 text-center mb-2">
            ✓ {t('downloadProtection.level2CanBrowse', 'You can still browse and listen to content normally.')}
          </p>
          {pausedUntil && (
            <p className="text-xs text-brand-text-tertiary text-center mb-6">
              {t('downloadProtection.resumesAt', 'Access restores on:')} <span className="text-white font-medium">{formatExpiry(pausedUntil)}</span>
            </p>
          )}
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-colors"
          >
            {t('downloadProtection.level2Button', 'Accept')}
          </button>
        </div>
      </div>
    );
  }

  if (level === 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="bg-dark-elevated border border-red-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-black/60">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-bold text-red-400">
              {t('downloadProtection.level3Title', 'Account blocked for security reasons')}
            </h2>
          </div>
          <p className="text-sm text-brand-text-secondary leading-relaxed text-center mb-4">
            {t('downloadProtection.level3Message', 'Our system has detected an activity pattern incompatible with normal use of the platform. As a protective measure, this account has been blocked and marked for manual review. Our team will review the account\'s activity history, downloads, and usage to verify compliance with TODODJS\'s terms of use.')}
          </p>
          <p className="text-sm text-brand-text-secondary leading-relaxed text-center mb-6">
            {t('downloadProtection.level3Contact', 'Until the review is completed, access to downloads will remain blocked. If you believe this is an error, you can contact support to request a review of your case.')}
          </p>
          <div className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-center text-sm">
            {t('downloadProtection.level3Footer', 'Access blocked pending review')}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
