import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PaymentCancelPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="max-w-md w-full bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-8 text-center">
        {/* Cancel Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
          <XCircle className="w-10 h-10 text-orange-400" strokeWidth={2} />
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Payment Cancelled
        </h1>
        <p className="text-lg text-brand-text-tertiary mb-6">
          Your payment was cancelled. No charges were made to your account.
        </p>

        {/* Info */}
        <div className="bg-dark-elevated rounded-lg p-6 mb-6 text-left border border-white/5">
          <p className="text-sm text-brand-text-secondary">
            If you encountered any issues during checkout or have questions about our plans, please don't hesitate to contact our support team via WhatsApp.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
