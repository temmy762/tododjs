import { useState } from 'react';
import { X, Mail, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/forgotpassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.success) {
        setMessage(t('auth.resetEmailSent'));
        setEmail('');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Mail className="w-7 h-7 text-accent" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {t('auth.forgotPassword')}
            </h2>
            <p className="text-sm text-brand-text-tertiary">
              {t('auth.enterEmail')}
            </p>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                required
                className="w-full px-4 py-3 bg-dark-elevated border border-white/10 rounded-lg text-white placeholder-brand-text-tertiary focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-white text-black cursor-not-allowed opacity-50'
                  : 'bg-accent hover:bg-accent-hover shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40'
              }`}
            >
              {loading ? t('common.loading') : t('auth.sendResetLink')}
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-sm text-brand-text-tertiary hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
