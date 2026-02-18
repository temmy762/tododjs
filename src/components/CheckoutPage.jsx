import { useState, useEffect } from 'react';
import { Check, X, CreditCard, Shield, Zap, Download, Music, Crown, Users } from 'lucide-react';
import API_URL from '../config/api';

export default function CheckoutPage({ onClose, selectedPlan }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPlan, setFetchingPlan] = useState(true);

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
      features.push('Unlimited Downloads');
    }
    if (plan.features.fullWebAccess) {
      features.push('Full Web Access');
    }
    if (plan.features.whatsappSupport) {
      features.push('WhatsApp Support');
    }
    if (plan.features.noCommitment) {
      features.push('No Commitment');
    }
    if (plan.type === 'shared') {
      features.push('Access for 2 Users');
      features.push('2 Devices/IP');
    }
    if (plan.duration === 'quarterly') {
      features.push(`${plan.durationDays} days access`);
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
          planId: plan.planId
        })
      });

      const data = await response.json();

      if (data.success) {
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
                <span className="text-5xl font-bold text-white">€{price}</span>
                <span className="text-white/80">/ {plan.durationDays} days</span>
              </div>
              {plan.duration === 'quarterly' && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm font-semibold">
                  Best value - {plan.durationDays} days access
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="bg-dark-surface rounded-xl p-6">
              <h4 className="text-lg font-bold text-white mb-4">What's Included</h4>
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
              <h4 className="text-lg font-bold text-white mb-4">Order Summary</h4>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">Plan</span>
                  <span className="text-white font-medium">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">Type</span>
                  <span className="text-white font-medium capitalize">{plan.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-text-tertiary">Duration</span>
                  <span className="text-white font-medium">{plan.durationDays} days</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-white">Total</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">€{price}</div>
                  <div className="text-xs text-brand-text-tertiary">
                    one-time payment
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
