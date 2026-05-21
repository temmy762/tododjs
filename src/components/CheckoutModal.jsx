import { useState, useEffect } from 'react';
import { X, CreditCard, Loader, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function CheckoutModal({ isOpen, onClose, plan, user }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedCard, setSavedCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  const isSpanish = i18n.language?.startsWith('es');
  const fmtEur = (n) => new Intl.NumberFormat(isSpanish ? 'es-ES' : 'en-US', { style: 'currency', currency: 'EUR' }).format(parseFloat(n));
  const planName = isSpanish ? plan?.nameEs : plan?.name;
  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch saved default card whenever the modal opens
  useEffect(() => {
    if (!isOpen || !user) return;
    setCardLoading(true);
    setSavedCard(null);
    setError('');
    setSuccess(false);
    fetch(`${API_URL}/subscriptions/payment-method`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (data.success && data.data) setSavedCard(data.data); })
      .catch(() => {})
      .finally(() => setCardLoading(false));
  }, [isOpen, user]);

  // Redirect to Stripe hosted checkout (used when no saved card or "use different card")
  const handleCheckout = async () => {
    if (!user) { setError(t('messages.requireLogin')); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ planId: plan.planId })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.url;
      } else {
        setError(data.message || t('payment.failedCheckout'));
      }
    } catch {
      setError(t('payment.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // Charge saved card directly — no redirect needed
  const handlePayWithSavedCard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payment/subscribe-with-saved-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ planId: plan.planId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setError(data.message || t('payment.failedCheckout'));
      }
    } catch {
      setError(t('payment.genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !plan) return null;

  const PlanSummary = () => (
    <div className="bg-dark-elevated rounded-lg p-6 mb-6 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{planName}</h3>
          <p className="text-sm text-brand-text-tertiary capitalize">{t(`subscription.${plan.duration}`)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{fmtEur(plan.price)}</div>
          <div className="text-xs text-brand-text-tertiary">
            {plan.duration === 'monthly' ? t('subscription.perMonth') : t('subscription.per3Months')}
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm text-brand-text-secondary">
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /><span>{t('subscription.unlimitedDownloads')}</span></div>
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /><span>{t('subscription.fullWebAccess')}</span></div>
        {plan.type === 'shared' && <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /><span>{t('subscription.twoUsers')}</span></div>}
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /><span>{plan.durationDays} {t('subscription.daysAccess')}</span></div>
      </div>
    </div>
  );

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
          {/* ── Success State ── */}
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isSpanish ? '¡Suscripción Activada!' : 'Subscription Activated!'}
              </h2>
              <p className="text-sm text-brand-text-tertiary">
                {isSpanish ? 'Tu acceso está activo. Recargando…' : 'Your access is now active. Reloading…'}
              </p>
              <Loader className="w-5 h-5 text-accent animate-spin mx-auto mt-4" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/20 mb-4">
                  <CreditCard className="w-8 h-8 text-accent" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('subscription.subscribe')}</h2>
                <p className="text-sm text-brand-text-tertiary">{t('subscription.choosePlan')}</p>
              </div>

              <PlanSummary />

              {/* Error */}
              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* ── Loading saved card ── */}
              {cardLoading ? (
                <div className="flex items-center justify-center py-4 mb-4">
                  <Loader className="w-5 h-5 text-accent animate-spin" />
                </div>
              ) : savedCard ? (
                /* ── Has saved card ── */
                <div className="space-y-3 mb-4">
                  <p className="text-xs text-brand-text-tertiary font-semibold uppercase tracking-wider">
                    {isSpanish ? 'Elige cómo pagar' : 'Choose how to pay'}
                  </p>

                  {/* Pay with saved card */}
                  <button
                    onClick={handlePayWithSavedCard}
                    disabled={loading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 hover:border-accent/50 transition-all disabled:opacity-50 text-left"
                  >
                    <CreditCard className="w-5 h-5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white capitalize">
                        {savedCard.brand} •••• {savedCard.last4}
                      </p>
                      <p className="text-xs text-brand-text-tertiary">
                        {savedCard.last4
                      ? `${isSpanish ? 'Vence' : 'Expires'} ${String(savedCard.expMonth).padStart(2, '0')} / ${savedCard.expYear}`
                      : (isSpanish ? 'Cartera digital guardada' : 'Saved digital wallet')}
                      </p>
                    </div>
                    {loading
                      ? <Loader className="w-4 h-4 text-accent animate-spin shrink-0" />
                      : <ArrowRight className="w-4 h-4 text-accent shrink-0" />}
                  </button>

                  {/* Use different card */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50 text-sm text-brand-text-tertiary hover:text-white"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    {isSpanish ? 'Usar otro método de pago' : 'Use a different payment method'}
                  </button>

                  <button onClick={onClose} disabled={loading} className="w-full py-2.5 text-sm text-brand-text-tertiary hover:text-white transition-colors disabled:opacity-50">
                    {t('actions.cancel')}
                  </button>
                </div>
              ) : (
                /* ── No saved card — standard checkout ── */
                <>
                  <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400">{t('messages.stripeRedirect')}</p>
                  </div>
                  <div className="flex gap-3 mb-4">
                    <button onClick={onClose} disabled={loading} className="flex-1 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                      {t('actions.cancel')}
                    </button>
                    <button onClick={handleCheckout} disabled={loading} className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all shadow-lg shadow-accent/30 disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading
                        ? <><Loader className="w-5 h-5 animate-spin" />{t('common.loading')}</>
                        : <><CreditCard className="w-5 h-5" />{t('subscription.subscribe')}</>}
                    </button>
                  </div>
                </>
              )}

              <p className="text-xs text-center text-brand-text-tertiary mt-2">🔒 {t('messages.securePayment')}</p>
              <p className="text-xs text-center text-brand-text-tertiary mt-2">
                {t('pricing.billingNotice', 'Subscriptions are non-refundable. Cancel anytime to stop auto-renewal — you keep access until the end of your current billing period.')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
