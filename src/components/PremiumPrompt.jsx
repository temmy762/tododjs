import { X, Crown, Music, Download, Zap } from 'lucide-react';

export default function PremiumPrompt({ type = 'subscribe', onClose, onSignUp, onSubscribe }) {
  const isAuth = type === 'subscribe';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-dark-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Gradient header */}
        <div className="relative h-32 bg-gradient-to-br from-accent via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
          <Crown className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.5} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {!isAuth ? (
            <>
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Create a Free Account
              </h2>
              <p className="text-sm text-brand-text-tertiary text-center mb-6">
                Sign up to like tracks, create playlists, and preview songs. Upgrade to Premium for full access and unlimited downloads.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Unlock Full Access
              </h2>
              <p className="text-sm text-brand-text-tertiary text-center mb-6">
                Upgrade to Premium to download tracks, listen to full songs, and get unlimited access to the entire catalog.
              </p>
            </>
          )}

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-accent" />
              </div>
              <span className="text-brand-text-secondary">Full-length song streaming</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-accent" />
              </div>
              <span className="text-brand-text-secondary">Unlimited high-quality downloads</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-accent" />
              </div>
              <span className="text-brand-text-secondary">Early access to new releases</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {!isAuth ? (
              <>
                <button
                  onClick={onSignUp}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600 text-white font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/30"
                >
                  Sign Up Free
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-brand-text-tertiary hover:text-white text-sm transition-colors"
                >
                  Maybe later
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSubscribe}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600 text-white font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/30"
                >
                  Go Premium
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-brand-text-tertiary hover:text-white text-sm transition-colors"
                >
                  Continue with preview
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
