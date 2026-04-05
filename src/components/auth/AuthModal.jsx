import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Phone, Globe, Fingerprint, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../../config/api';
import ForgotPasswordModal from '../ForgotPasswordModal';
import {
  isBiometricAvailable,
  getBiometricCredential,
  registerBiometric,
  verifyBiometric,
  clearBiometric,
} from '../../services/webauthnService';

function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'dev_' + crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export default function AuthModal({ onClose, onSuccess, initialMode = 'login' }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', phoneNumber: '', preferredLanguage: 'en' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [lastLoginData, setLastLoginData] = useState(null);

  useEffect(() => {
    isBiometricAvailable().then(available => {
      setBiometricAvailable(available);
      if (available) setBiometricRegistered(!!getBiometricCredential());
    });
  }, []);

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phoneNumber: '', preferredLanguage: 'en' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError(t('auth.passwordMismatch'));
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phoneNumber: formData.phoneNumber || undefined,
            preferredLanguage: formData.preferredLanguage,
            deviceId: getDeviceId()
          })
        });
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('token', data.token);
          onSuccess(data.user);
        } else {
          setError(data.message || t('messages.signupError'));
        }
      } else {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            deviceId: getDeviceId()
          })
        });
        const data = await response.json();

        if (data.success) {
          localStorage.setItem('token', data.token);
          if (rememberMe) localStorage.setItem('rememberMe', 'true');
          if (biometricAvailable && !biometricRegistered) {
            setLastLoginData(data);
            setShowBiometricPrompt(true);
          } else {
            onSuccess(data.user);
          }
        } else if (data.deviceLimitReached) {
          setError(`Device limit reached for this account (${data.maxDevices} device${data.maxDevices > 1 ? 's' : ''} allowed). The account owner has been notified by email. If you are the account owner, please sign in on one of your registered devices and remove it from Settings → Devices to free up a slot.`);
          return;
        } else {
          setError(data.message || t('auth.invalidCredentials'));
        }
      }
    } catch (err) {
      setError(t('messages.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      await verifyBiometric();
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        throw new Error('No saved session found. Please login with your password.');
      }
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`,
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        onSuccess(data.user);
      } else {
        setError('Session expired. Please login with your password.');
        clearBiometric();
        setBiometricRegistered(false);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric verification cancelled.');
      } else {
        setError(err.message || 'Biometric login failed. Please use your password.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      await registerBiometric(lastLoginData.user._id, lastLoginData.user.name || lastLoginData.user.email);
      setBiometricRegistered(true);
    } catch { /* user declined */ }
    onSuccess(lastLoginData.user);
  };

  if (showBiometricPrompt) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-elevated rounded-2xl max-w-sm w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto mb-5">
            <Fingerprint size={40} className="text-accent" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Enable Fingerprint Login</h3>
          <p className="text-brand-text-tertiary text-sm mb-6">
            Log in faster next time using your device&apos;s biometric authentication — fingerprint, Face ID, or Windows Hello.
          </p>
          <button
            onClick={handleEnableBiometric}
            className="w-full py-3 bg-accent hover:bg-accent/80 rounded-lg text-white font-semibold text-sm mb-3 transition-all flex items-center justify-center gap-2"
          >
            <Fingerprint size={18} /> Enable Fingerprint Login
          </button>
          <button
            onClick={() => onSuccess(lastLoginData.user)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-lg text-brand-text-tertiary text-sm transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-elevated rounded-lg max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <button onClick={onClose} className="text-brand-text-tertiary hover:text-white">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth.name')}</label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t('auth.email')}</label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('auth.password')}</label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth.phoneNumber')}</label>
              <div className="relative">
                <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth.preferredLanguage')}</label>
              <div className="relative">
                <Globe size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent appearance-none"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-sm text-brand-text-tertiary">{t('auth.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-accent hover:text-accent-hover transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : mode === 'login' ? t('auth.loginButton') : t('auth.signupButton')}
          </button>
        </form>

        {mode === 'login' && biometricAvailable && biometricRegistered && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-brand-text-tertiary">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {biometricLoading
                ? <><Loader size={18} className="animate-spin" /> Verifying…</>
                : <><Fingerprint size={18} className="text-accent" /> Login with Fingerprint</>}
            </button>
          </>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-text-tertiary">
            {mode === 'login' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-accent hover:text-accent-hover font-medium"
            >
              {mode === 'login' ? t('auth.signupHere') : t('auth.loginHere')}
            </button>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
