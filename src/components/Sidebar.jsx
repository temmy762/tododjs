import { useState } from 'react';
import { Home, Disc, Library, Layers, Shield, LogIn, LogOut, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ onAdminClick, user, onLoginClick, onLogout, onProfileClick }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAdmin = user?.role === 'admin';
  const libraryPath = i18n.language === 'es' ? '/biblioteca' : '/library';

  const navItems = [
    { path: '/home', label: t('nav.home'), icon: Home },
    { path: libraryPath, label: t('nav.library'), icon: Library },
    { path: '/record-pool', label: t('nav.recordPool'), icon: Disc },
    { path: '/mashup', label: t('nav.liveMashup'), icon: Layers },
    ...(!isAdmin ? [{ path: '/pricing', label: t('subscription.pricing'), icon: CreditCard }] : [])
  ];

  const activePage = location.pathname;

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 bg-dark-surface/80 backdrop-blur-xl border-r border-white/5 z-30 flex-col items-center py-4 overflow-y-auto">

        <nav className="flex-1 flex flex-col gap-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`group relative flex flex-col items-center gap-1.5 transition-all duration-300 ${
                  isActive ? 'scale-100' : 'scale-90 hover:scale-100'
                }`}
              >
                {isActive && (
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                )}
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-accent shadow-lg shadow-accent/30' 
                    : 'bg-dark-elevated/50 group-hover:bg-dark-elevated group-hover:shadow-md'
                }`}>
                  <Icon 
                    className={`w-5 h-5 transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-brand-text-tertiary group-hover:text-white'
                    }`} 
                    strokeWidth={2}
                  />
                </div>
                
                <span className={`text-[10px] font-medium transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-brand-text-tertiary group-hover:text-brand-text-secondary'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          {/* Admin Button - Only show if user is admin */}
          {user && user.role === 'admin' && (
            <button
              onClick={() => onAdminClick?.()}
              className="group relative flex flex-col items-center gap-1.5 transition-all duration-300 hover:scale-105"
              title={t('nav.admin')}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-red-500 to-pink-500 hover:shadow-lg hover:shadow-red-500/30">
                <Shield className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium text-brand-text-tertiary group-hover:text-brand-text-secondary transition-colors duration-300">
                {t('nav.admin')}
              </span>
            </button>
          )}

          {/* User Profile or Login Button */}
          {user ? (
            <div className="relative group">
              <div
                onClick={() => onProfileClick?.()}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-hover overflow-hidden border-2 border-white/10 hover:border-accent transition-all duration-300 cursor-pointer mx-auto flex items-center justify-center"
              >
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="group relative flex flex-col items-center gap-1.5 transition-all duration-300 hover:scale-105"
              title={t('auth.login')}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-dark-elevated/50 hover:bg-accent hover:shadow-lg hover:shadow-accent/30">
                <LogIn className="w-5 h-5 text-brand-text-tertiary group-hover:text-white transition-colors" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium text-brand-text-tertiary group-hover:text-brand-text-secondary transition-colors duration-300">
                {t('nav.login')}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-surface/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 py-1 px-1 flex-1 min-w-0 max-w-[72px]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'bg-accent shadow-md shadow-accent/30' 
                    : ''
                }`}>
                  <Icon 
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-brand-text-tertiary'
                    }`} 
                    strokeWidth={2}
                  />
                </div>
                <span className={`text-[9px] font-medium transition-colors duration-200 w-full text-center truncate ${
                  isActive ? 'text-white' : 'text-brand-text-tertiary'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Admin button on mobile */}
          {user && user.role === 'admin' && (
            <button
              onClick={() => onAdminClick?.()}
              className="flex flex-col items-center gap-0.5 py-1 px-1 flex-1 min-w-0 max-w-[72px]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-500">
                <Shield className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-[9px] font-medium text-brand-text-tertiary w-full text-center truncate">{t('nav.admin')}</span>
            </button>
          )}

          {/* Login/Profile on mobile */}
          {user ? (
            <button
              onClick={() => onProfileClick?.()}
              className="flex flex-col items-center gap-0.5 py-1 px-1 flex-1 min-w-0 max-w-[72px]"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-hover overflow-hidden border border-white/10 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-[10px]">{user.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="text-[9px] font-medium text-brand-text-tertiary w-full text-center truncate">{t('nav.profile')}</span>
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex flex-col items-center gap-0.5 py-1 px-1 flex-1 min-w-0 max-w-[72px]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <LogIn className="w-5 h-5 text-brand-text-tertiary" strokeWidth={2} />
              </div>
              <span className="text-[9px] font-medium text-brand-text-tertiary w-full text-center truncate">{t('nav.login')}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
