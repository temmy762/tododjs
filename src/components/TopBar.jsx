import { Search, User, Music2, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import API_URL from '../config/api';

const tonalities = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A', '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'];

export default function TopBar({ onSearchFocus, onSearchChange, searchQuery, onSubscribe, showTonalityButton, activeTonality, onTonalityChange, user, onNavigate }) {
  const { t } = useTranslation();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onSearchFocus?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e) => {
    onSearchChange?.(e.target.value);
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/subscriptions/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.hasSubscription) {
        setSubscriptionStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-black border-b border-white/10">
      <div className="w-full flex items-center justify-between h-14 md:h-16 px-3 md:px-8">
        <div className="flex items-center flex-shrink-0">
          <img
            src="/images/ToDoDjs_Logo.png"
            alt="TODODJS"
            className="h-8 md:h-[50px] w-auto"
          />
        </div>

        <div className="flex-1 max-w-xl mx-2 md:mx-8">
          <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
            <Search className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
              isFocused ? 'text-accent' : 'text-white/40'
            }`} strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              placeholder={t('search.placeholder')}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              className={`w-full h-9 md:h-11 pl-9 md:pl-11 pr-3 md:pr-4 bg-white/5 border rounded-full text-xs md:text-sm text-white placeholder-white/30 outline-none transition-all duration-300 ${
                isFocused 
                  ? 'border-accent/60 bg-white/10 shadow-lg shadow-accent/20' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/8'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <LanguageSwitcher />
          {showTonalityButton && (
            <div className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-white/40 transition-all duration-200 shadow-lg animate-in fade-in slide-in-from-top duration-300">
              <Music2 className="w-4 h-4 text-white/80" strokeWidth={2} />
              <select
                value={activeTonality}
                onChange={(e) => onTonalityChange?.(e.target.value)}
                className="bg-transparent text-white text-xs md:text-sm font-semibold focus:outline-none cursor-pointer appearance-none pr-2"
                style={{
                  textAlign: 'center',
                  textAlignLast: 'center'
                }}
              >
                <option value="all" className="bg-dark-elevated text-white text-center">{t('tracks.allTonalities')}</option>
                {tonalities.map(tonality => (
                  <option key={tonality} value={tonality} className="bg-dark-elevated text-white text-center">
                    {tonality}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {user && subscriptionStatus?.hasSubscription ? (
            <button
              onClick={() => onNavigate?.('subscription')}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-hover border border-accent/20 transition-all duration-200 hover:scale-105 text-xs md:text-sm font-semibold text-white shadow-lg shadow-accent/30"
              title={t('subscription.manageSubscription')}
            >
              <Crown className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
              <span className="hidden sm:inline">{subscriptionStatus.plan?.type === 'shared' ? '👥' : '👤'}</span>
              <span className="hidden md:inline text-xs">{subscriptionStatus.daysRemaining}d</span>
            </button>
          ) : user?.role !== 'admin' && (
            <button
              onClick={() => onNavigate?.('pricing')}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full bg-accent hover:bg-accent-hover transition-all duration-200 hover:scale-105 text-xs md:text-sm font-semibold text-white shadow-lg shadow-accent/30"
            >
              <User className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={2} />
              <span className="hidden sm:inline">{t('subscription.subscribe')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
