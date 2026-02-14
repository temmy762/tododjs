import { X, Mail, Lock as LockIcon, User } from 'lucide-react';
import { useState } from 'react';

export default function AuthModal({ isOpen, onClose, action, onSelectPlan }) {
  const [mode, setMode] = useState('login');
  const [showSubscription, setShowSubscription] = useState(false);

  if (!isOpen) return null;

  const handleAuth = (e) => {
    e.preventDefault();
    if (mode === 'signup') {
      setShowSubscription(true);
    } else {
      onClose();
    }
  };

  const handleSubscribe = (plan) => {
    console.log('Selected plan:', plan);
    onClose();
    setShowSubscription(false);
    // Trigger checkout page
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  if (showSubscription) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          <div className="p-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20 mb-4 overflow-hidden">
                <img
                  src="/images/ToDoDjs_Logo.png"
                  alt="TODODJS"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Complete Your Signup
              </h2>
              <p className="text-sm text-brand-text-tertiary">
                Choose a plan to access the entire music library
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="relative bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-accent/50 transition-all duration-200 cursor-pointer group shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-accent/10">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Basic</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">$9</span>
                    <span className="text-sm text-brand-text-tertiary/70">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 text-sm text-brand-text-tertiary">
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Stream all tracks
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> 10 downloads/month
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Standard quality
                    </li>
                  </ul>
                  <button 
                    onClick={() => handleSubscribe('basic')}
                    className="w-full py-2.5 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 transition-all duration-150 text-black text-sm font-semibold"
                  >
                    Choose Basic
                  </button>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur-sm rounded-xl p-6 border-2 border-accent transition-all duration-200 cursor-pointer group scale-[1.03] shadow-xl shadow-accent/20">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-accent to-accent-hover rounded-full text-xs font-bold text-white shadow-lg">
                  POPULAR
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Pro</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold bg-gradient-to-br from-white to-accent bg-clip-text text-transparent">$19</span>
                    <span className="text-sm text-brand-text-tertiary/70">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 text-sm text-brand-text-secondary">
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Stream all tracks
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Unlimited downloads
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> High quality (320kbps)
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Early access
                    </li>
                  </ul>
                  <button 
                    onClick={() => handleSubscribe('pro')}
                    className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover transition-all duration-150 text-white text-sm font-semibold shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40"
                  >
                    Choose Pro
                  </button>
                </div>
              </div>

              <div className="relative bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-accent/50 transition-all duration-200 cursor-pointer group shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-accent/10">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Enterprise</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">$49</span>
                    <span className="text-sm text-brand-text-tertiary/70">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 text-sm text-brand-text-tertiary">
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Everything in Pro
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Lossless quality
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> API access
                    </li>
                    <li className="flex items-center justify-center gap-2">
                      <span className="text-accent">✓</span> Priority support
                    </li>
                  </ul>
                  <button 
                    onClick={() => handleSubscribe('enterprise')}
                    className="w-full py-2.5 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 transition-all duration-150 text-black text-sm font-semibold"
                  >
                    Choose Enterprise
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-brand-text-tertiary/70 mt-8">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20 mb-4 overflow-hidden">
              <img
                src="/images/ToDoDjs_Logo.png"
                alt="TODODJS"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Join TODODJS'}
            </h2>
            <p className="text-brand-text-tertiary text-sm">
              {action?.action === 'play' && `Sign in to listen to "${action.track?.title}"`}
              {action?.action === 'download' && `Sign in to download "${action.track?.title}"`}
              {action?.action === 'view' && 'Sign in to explore the full library'}
              {!action && 'Sign in to access the music library'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-brand-text-tertiary mb-2 uppercase tracking-wider">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary/70" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Your name"
                    required
                    className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary/70 outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-brand-text-tertiary mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary/70" strokeWidth={1.5} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary/70 outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-text-tertiary mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary/70" strokeWidth={1.5} />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary/70 outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 mt-6"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-brand-text-tertiary hover:text-brand-text-secondary transition-colors duration-150"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-accent font-medium">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
