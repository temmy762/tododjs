import { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Phone } from 'lucide-react';
import API_URL from '../../config/api';
import ForgotPasswordModal from '../ForgotPasswordModal';
import { verifyUserForAction } from '../../services/passkeyService';

// Generate or retrieve a persistent device ID for this browser
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'dev_' + crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export default function AuthModal({ onClose, onSuccess }) {
  // Only login mode - registration happens through subscription payment
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Only login - registration happens through subscription payment
      console.log('=== LOGIN DEBUG ===');
        console.log('API_URL:', API_URL);
        console.log('Full URL:', `${API_URL}/auth/login`);
        console.log('Attempting login with:', formData.email);
        console.log('Device ID:', getDeviceId());
        
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            deviceId: getDeviceId()
          })
        });

        console.log('Login response status:', response.status);
        console.log('Login response headers:', response.headers);
        const data = await response.json();
        console.log('Login response data:', data);
        console.log('=== END LOGIN DEBUG ===');

        if (data.success) {
          localStorage.setItem('token', data.token);
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          onSuccess(data.user);
        } else if (data.deviceLimitReached) {
          // Device limit reached - require biometric verification
          const deviceName = data.oldestDevice?.deviceName || 'Unknown device';
          
          try {
            // Request STRICT biometric verification (no fallback)
            const verified = await verifyUserForAction('replace your oldest device and continue');
            
            if (verified) {
              // User verified - retry login with confirmation flag
              setLoading(true);
              try {
                const retryResponse = await fetch(`${API_URL}/auth/login`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    deviceId: getDeviceId(),
                    confirmDeviceReplacement: true
                  })
                });
                
                const retryData = await retryResponse.json();
                
                if (retryData.success) {
                  localStorage.setItem('token', retryData.token);
                  if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                  }
                  onSuccess(retryData.user);
                } else {
                  setError(retryData.message || 'Login failed');
                }
              } catch (retryError) {
                setError('Failed to complete login. Please try again.');
              } finally {
                setLoading(false);
              }
            } else {
              // User cancelled biometric verification
              setError('Device replacement cancelled. Please sign out from another device to continue.');
            }
          } catch (biometricError) {
            // Biometric verification failed or unavailable
            setError(biometricError.message || 'Biometric authentication is required to replace devices. Please ensure your device supports biometric authentication.');
          }
          return;
        } else {
          setError(data.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Auth error details:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      setError(`Network error: ${error.message}. Please check if the server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-elevated rounded-lg max-w-md w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
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

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
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
            <label className="block text-sm font-medium mb-2">Password</label>
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
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
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
                <span className="text-sm text-brand-text-tertiary">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-accent hover:text-accent-hover transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-brand-text-tertiary">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={switchMode}
              className="text-accent hover:text-accent-hover font-medium"
            >
              {mode === 'login' ? 'Sign up here' : 'Login here'}
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
