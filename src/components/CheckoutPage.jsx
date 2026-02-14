import { useState } from 'react';
import { Check, X, CreditCard, Shield, Zap, Download, Music, Crown } from 'lucide-react';

export default function CheckoutPage({ onClose, selectedPlan = 'premium' }) {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);

  // Map plan names from AuthModal to CheckoutPage format
  const planMapping = {
    'basic': 'premium',
    'pro': 'pro',
    'enterprise': 'pro' // Map enterprise to pro for now
  };

  const mappedPlan = planMapping[selectedPlan] || selectedPlan;

  const plans = {
    premium: {
      name: 'Premium',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      color: 'from-purple-500 to-pink-500',
      icon: Music,
      features: [
        '50 downloads per day',
        'WAV & MP3 quality',
        'Priority support',
        'Exclusive content',
        'No ads',
        'Offline downloads'
      ]
    },
    pro: {
      name: 'Pro',
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      color: 'from-orange-500 to-red-500',
      icon: Crown,
      features: [
        'Unlimited downloads',
        'WAV & FLAC quality',
        '24/7 priority support',
        'Early access to new tracks',
        'API access',
        'Advanced analytics',
        'Custom playlists',
        'No ads'
      ]
    }
  };

  const plan = plans[mappedPlan];
  const Icon = plan.icon;
  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const savings = billingPeriod === 'yearly' 
    ? Math.round((1 - (plan.yearlyPrice / (plan.monthlyPrice * 12))) * 100)
    : 0;

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/payment/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: mappedPlan,
          billingPeriod
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error processing checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-elevated rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-elevated border-b border-white/10 p-4 md:p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-white">Complete Your Subscription</h2>
            <p className="text-xs md:text-sm text-brand-text-tertiary mt-1">Secure checkout powered by Stripe</p>
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
            <div className={`bg-gradient-to-br ${plan.color} rounded-2xl p-6 mb-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="text-white/80 text-sm">Perfect for DJs</p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold text-white">${price}</span>
                <span className="text-white/80">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
              </div>
              {savings > 0 && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold">
                  Save {savings}% with yearly billing
                </div>
              )}
            </div>

            {/* Billing Period Toggle */}
            <div className="bg-dark-surface rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-white mb-3">Billing Period</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    billingPeriod === 'monthly'
                      ? 'bg-accent text-white'
                      : 'bg-dark-elevated text-brand-text-tertiary hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 relative ${
                    billingPeriod === 'yearly'
                      ? 'bg-accent text-white'
                      : 'bg-dark-elevated text-brand-text-tertiary hover:text-white'
                  }`}
                >
                  Yearly
                  {savings > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold">
                      Save {savings}%
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-dark-surface rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">What's Included</h4>
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
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
              <h4 className="text-lg font-bold text-white mb-4">Order Summary</h4>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">Plan</span>
                  <span className="text-white font-medium">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">Billing</span>
                  <span className="text-white font-medium capitalize">{billingPeriod}</span>
                </div>
                {savings > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-text-tertiary">Discount</span>
                    <span className="text-green-400 font-medium">-{savings}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-white">Total</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">${price}</div>
                  <div className="text-xs text-brand-text-tertiary">
                    {billingPeriod === 'monthly' ? 'per month' : 'per year'}
                  </div>
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Proceed to Checkout</span>
                  </>
                )}
              </button>

              <p className="text-xs text-center text-brand-text-tertiary mt-4">
                You'll be redirected to Stripe's secure checkout
              </p>
            </div>

            {/* Security Badges */}
            <div className="bg-dark-surface rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-white">Secure Payment</span>
              </div>
              <p className="text-xs text-brand-text-tertiary mb-4">
                Your payment information is encrypted and secure. We use Stripe for payment processing.
              </p>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded bg-dark-elevated text-xs font-semibold text-white">
                  🔒 SSL Encrypted
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
                  <p className="text-sm font-semibold text-white mb-1">30-Day Money Back Guarantee</p>
                  <p className="text-xs text-brand-text-tertiary">
                    Not satisfied? Get a full refund within 30 days, no questions asked.
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
