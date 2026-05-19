import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError(t('payment.noSessionId'));
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/stripe/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await res.json();

      if (data.success) {
        // Payment confirmed — now wait for the webhook to activate the subscription
        await pollSubscriptionActivation(token);
      } else {
        setError(data.message || 'Payment verification failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred while verifying your payment');
      setLoading(false);
    }
  };

  const pollSubscriptionActivation = async (token) => {
    const MAX_ATTEMPTS = 15;
    const INTERVAL_MS = 2000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${API_URL}/subscriptions/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data?.isActive) {
          // Subscription is live — trigger a full auth/me refresh then show success
          try {
            await fetch(`${API_URL}/auth/me`, {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include'
            });
          } catch (_) {}
          setSuccess(true);
          setLoading(false);
          setTimeout(() => navigate('/'), 5000);
          return;
        }
      } catch (_) {}
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    // Webhook didn't fire within 30s — show success anyway (webhook may still arrive)
    try {
      await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch (_) {}
    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate('/'), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <Loader className="w-16 h-16 text-accent animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t('payment.verifying')}</p>
          <p className="text-brand-text-tertiary text-sm mt-2">{t('payment.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
        <div className="max-w-md w-full bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-red-500/20 shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('payment.verificationFailed')}</h1>
          <p className="text-brand-text-tertiary mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150"
          >
            {t('payment.returnToHome')}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
        <div className="max-w-md w-full bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-green-500/20 shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-6 animate-in zoom-in duration-500">
            <CheckCircle className="w-10 h-10 text-green-400" strokeWidth={2} />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-3">
            {t('subscription.paymentSuccessful')}
          </h1>
          <p className="text-lg text-green-400 mb-6">
            {t('subscription.subscriptionActivated')}
          </p>


          {/* Thank You Message */}
          <p className="text-brand-text-tertiary mb-6">
            {t('subscription.thankYou')}! {t('payment.unlimitedAccess')}
          </p>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 flex items-center justify-center gap-2"
          >
            {t('payment.startDownloading')}
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Auto Redirect Notice */}
          <p className="text-xs text-brand-text-tertiary mt-4">
            {t('payment.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
