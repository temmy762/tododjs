import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, CreditCard, Shield, Zap, Download, Music, Crown, Users, Tag, Loader } from 'lucide-react';
import API_URL from '../config/api';

export default function CheckoutPage({ onClose, selectedPlan }) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language?.startsWith('es');
  const fmtEur = (n) => new Intl.NumberFormat(isSpanish ? 'es-ES' : 'en-US', { style: 'currency', currency: 'EUR' }).format(parseFloat(n));
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPlan, setFetchingPlan] = useState(true);

  // Discount code state. The code is checked against Stripe BEFORE the customer
  // is sent to pay, so the total shown here is the total they are charged,
  // rather than a surprise on the payment page.
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [checkingPromo, setCheckingPromo] = useState(false);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !plan) return;
    setCheckingPromo(true);
    setPromoError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, planId: plan.planId }),
      });
      const data = await res.json();
      if (data.success) {
        setPromo(data.data);
        setPromoError('');
      } else {
        setPromo(null);
        setPromoError(data.message || t('coupons.invalid', 'That code is not valid'));
      }
    } catch {
      setPromo(null);
      setPromoError(t('coupons.checkFailed', 'Could not check that code. Try again.'));
    } finally {
      setCheckingPromo(false);
    }
  };

  const clearPromo = () => {
    setPromo(null);
    setPromoInput('');
    setPromoError('');
  };

  useEffect(() => {
    if (selectedPlan) {
      // If selectedPlan is already a plan object, use it
      if (typeof selectedPlan === 'object') {
        setPlan(selectedPlan);
        setFetchingPlan(false);
      } else {
        // Otherwise fetch the plan by ID
        fetchPlanById(selectedPlan);
      }
    }
  }, [selectedPlan]);

  const fetchPlanById = async (planId) => {
    try {
      const res = await fetch(`${API_URL}/subscriptions/plans`);
      const data = await res.json();
      if (data.success) {
        const foundPlan = data.data.find(p => p.planId === planId);
        if (foundPlan) {
          setPlan(foundPlan);
        }
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setFetchingPlan(false);
    }
  };

  const getPlanIcon = (type) => {
    return type === 'shared' ? Users : Crown;
  };

  if (fetchingPlan || !plan) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  const Icon = getPlanIcon(plan.type);
  const price = plan.price;

  const getPlanFeatures = () => {
    const features = [];
    if (plan.features.unlimitedDownloads) {
      features.push(t('subscription.unlimitedDownloads'));
    }
    if (plan.features.fullWebAccess) {
      features.push(t('subscription.fullWebAccess'));
    }
    if (plan.features.whatsappSupport) {
      features.push(t('subscription.whatsappSupport'));
    }
    if (plan.features.noCommitment) {
      features.push(t('subscription.noCommitment'));
    }
    if (plan.type === 'shared') {
      features.push(t('subscription.twoUsers'));
      features.push(t('subscription.twoDevices'));
    }
    if (plan.duration === 'quarterly') {
      features.push(t('checkout.daysAccessFeature', { count: plan.durationDays }));
    }
    return features;
  };

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: plan.planId,
          // Send the code, not the discounted price. The server re-resolves it
          // against Stripe, so a tampered price in this request changes nothing.
          ...(promo ? { promotionCode: promo.code } : {})
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.url;
      } else {
        alert(t('checkout.errorSession'));
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(t('checkout.errorProcessing'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-elevated rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-elevated border-b border-white/10 p-4 md:p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-white">{t('checkout.completeSubscription')}</h2>
            <p className="text-xs md:text-sm text-brand-text-tertiary mt-1">{t('checkout.secureCheckout')}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-dark-surface hover:bg-dark-elevated flex items-center justify-center transition-all duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left: Plan Details */}
          <div>
            {/* Selected Plan Card */}
            <div className="bg-gradient-to-br from-accent to-purple-500 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="text-white/80 text-sm capitalize">{plan.type} • {plan.duration}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold text-white">{fmtEur(price)}</span>
                <span className="text-white/80">/ {t('checkout.daysCount', { count: plan.durationDays })}</span>
              </div>
              {plan.duration === 'quarterly' && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold">
                  {t('checkout.bestValue', { count: plan.durationDays })}
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="bg-dark-surface rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">{t('checkout.whatsIncluded')}</h4>
              <div className="space-y-3">
                {getPlanFeatures().map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-accent" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-white">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Payment Summary */}
          <div>
            {/* Order Summary */}
            <div className="bg-dark-surface rounded-xl p-6 mb-6">
              <h4 className="text-lg font-bold text-white mb-4">{t('checkout.orderSummary')}</h4>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">{t('payment.plan')}</span>
                  <span className="text-white font-medium">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">{t('checkout.type')}</span>
                  <span className="text-white font-medium capitalize">{plan.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">{t('checkout.duration')}</span>
                  <span className="text-white font-medium">{t('checkout.daysCount', { count: plan.durationDays })}</span>
                </div>
              </div>

              {/* Discount code */}
              <div className="mb-4 pb-4 border-b border-white/10">
                {!promo ? (
                  <>
                    <label className="block text-xs font-medium text-brand-text-tertiary mb-2">
                      {t('coupons.haveACode', 'Have a discount code?')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(); }}
                        placeholder={t('coupons.enterCode', 'Enter code')}
                        className="flex-1 px-3 py-2 bg-dark-elevated border border-white/10 rounded-lg text-white text-sm font-mono tracking-wider placeholder-brand-text-tertiary focus:outline-none focus:border-accent transition-colors"
                      />
                      <button
                        onClick={applyPromo}
                        disabled={checkingPromo || !promoInput.trim()}
                        className="px-4 py-2 rounded-lg bg-dark-elevated hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {checkingPromo && <Loader className="w-3.5 h-3.5 animate-spin" />}
                        {t('coupons.apply', 'Apply')}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-xs text-red-400 mt-2">{promoError}</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-mono font-semibold text-green-300 tracking-wider">{promo.code}</div>
                        <div className="text-[10px] text-green-400/80 truncate">{promo.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={clearPromo}
                      className="text-green-400/60 hover:text-green-300 transition-colors flex-shrink-0"
                      title={t('coupons.remove', 'Remove')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {promo && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-text-tertiary">{t('coupons.subtotal', 'Subtotal')}</span>
                    <span className="text-brand-text-secondary">{fmtEur(promo.originalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">{t('coupons.discount', 'Discount')}</span>
                    <span className="text-green-400">-{fmtEur(promo.discountAmount)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-white">{t('checkout.total')}</span>
                <div className="text-right">
                  {promo ? (
                    <>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm text-brand-text-tertiary line-through">{fmtEur(promo.originalPrice)}</span>
                        <span className="text-2xl font-bold text-white">{fmtEur(promo.newPrice)}</span>
                      </div>
                      <div className="text-xs text-green-400">
                        {/* A first-payment-only discount has to be stated before
                            purchase, not discovered at the first renewal. */}
                        {promo.duration === 'once'
                          ? t('coupons.firstPaymentOnly', 'First payment only, renewals at full price')
                          : promo.duration === 'repeating'
                            ? t('coupons.forMonths', { count: promo.durationInMonths, defaultValue: 'For the first {{count}} month(s)' })
                            : t('coupons.everyRenewal', 'Applies to every renewal')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-white">{fmtEur(price)}</div>
                      <div className="text-xs text-brand-text-tertiary">
                        {t('checkout.oneTimePayment')}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600 text-white font-bold transition-all duration-200 hover:scale-105 shadow-lg shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t('checkout.processing')}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>{t('checkout.proceedToCheckout')}</span>
                  </>
                )}
              </button>

              <p className="text-xs text-center text-brand-text-tertiary mt-4">
                {t('checkout.stripeRedirect')}
              </p>
              <p className="text-xs text-center text-brand-text-tertiary mt-2">
                {t('pricing.billingNotice', 'Subscriptions are non-refundable. Cancel anytime to stop auto-renewal — you keep access until the end of your current billing period.')}
              </p>
            </div>

            {/* Security Badges */}
            <div className="bg-dark-surface rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-white">{t('checkout.securePayment')}</span>
              </div>
              <p className="text-xs text-brand-text-tertiary mb-4">
                {t('checkout.paymentEncrypted')}
              </p>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded bg-dark-elevated text-xs font-semibold text-white">
                  🔒 {t('checkout.sslEncrypted')}
                </div>
                <div className="px-3 py-1 rounded bg-dark-elevated text-xs font-semibold text-white">
                  💳 Stripe
                </div>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">{t('checkout.moneyBackGuarantee')}</p>
                  <p className="text-xs text-brand-text-tertiary">
                    {t('checkout.moneyBackDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
