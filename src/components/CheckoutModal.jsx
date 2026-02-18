import { useState } from 'react';
import { X, CreditCard, Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function CheckoutModal({ isOpen, onClose, plan, user }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSpanish = i18n.language === 'es';
  const planName = isSpanish ? plan?.nameEs : plan?.name;

  const handleCheckout = async () => {
    if (!user) {
      setError(t('messages.requireLogin'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId: plan.planId })
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data.message || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <CreditCard className="w-8 h-8 text-accent" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('subscription.subscribe')}
            </h2>
            <p className="text-sm text-brand-text-tertiary">
              {t('subscription.choosePlan')}
            </p>
          </div>

          {/* Plan Summary */}
          <div className="bg-dark-elevated rounded-lg p-6 mb-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{planName}</h3>
                <p className="text-sm text-brand-text-tertiary capitalize">
                  {t(`subscription.${plan.duration}`)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">€{plan.price}</div>
                <div className="text-xs text-brand-text-tertiary">
                  {plan.duration === 'monthly' ? t('subscription.perMonth') : t('subscription.per3Months')}
                </div>
              </div>
            </div>

            {/* Features Summary */}
            <div className="space-y-2 text-sm text-brand-text-secondary">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span>{t('subscription.unlimitedDownloads')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span>{t('subscription.fullWebAccess')}</span>
              </div>
              {plan.type === 'shared' && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                  <span>{t('subscription.twoUsers')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span>{plan.durationDays} {t('subscription.daysAccess')}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400">
              You will be redirected to Stripe's secure checkout page to complete your payment.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {t('subscription.subscribe')}
                </>
              )}
            </button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-center text-brand-text-tertiary mt-4">
            🔒 Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
