import { useState } from 'react';
import { User, Download, Music, Settings, LogOut, Heart, TrendingUp, Phone, Mail, Save, X, CheckCircle, AlertCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

export default function ProfilePage({ user, onLogout, onUserUpdate }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || ''
  });

  const planLabel = user?.subscription?.plan === 'pro' ? 'Pro' : user?.subscription?.plan === 'premium' ? 'Premium' : 'Free';

  const userStats = [
    { label: t('userDashboard.statDownloads'), value: user?.downloads?.total?.toString() || '0', icon: Download },
    { label: t('userDashboard.statPlaylists'), value: user?.playlists?.length?.toString() || '0', icon: Music },
    { label: t('userDashboard.statFavorites'), value: user?.favorites?.length?.toString() || '0', icon: Heart },
  ];


  const handleEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || ''
    });
    setEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setEditing(false);
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (formData.phoneNumber) {
      const cleaned = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
        setMessage({ type: 'error', text: t('userDashboard.invalidPhone') });
        return;
      }
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/updatedetails`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: t('userDashboard.profileUpdated') });
        setEditing(false);
        if (onUserUpdate) {
          onUserUpdate({ ...user, name: formData.name, email: formData.email, phoneNumber: formData.phoneNumber });
        }
      } else {
        setMessage({ type: 'error', text: data.message || t('messages.saveError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('messages.networkError') });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-bg pt-20 pb-10 flex items-center justify-center">
        <p className="text-brand-text-tertiary">{t('auth.login')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        {/* Header Banner */}
        <div className="relative mb-10">
          <div className="h-48 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent rounded-2xl border border-white/10 shadow-xl shadow-black/20" />
          
          <div className="absolute -bottom-16 left-8 flex items-end gap-6">
            <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-accent to-accent-hover shadow-2xl shadow-accent/30 flex items-center justify-center border-4 border-dark-bg">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <User className="w-16 h-16 text-white" strokeWidth={1.5} />
              )}
            </div>
            
            <div className="pb-2">
              <h1 className="text-3xl font-bold text-white mb-1">{user.name}</h1>
              <p className="text-sm text-brand-text-tertiary">{user.email}</p>
              {user.phoneNumber && (
                <p className="text-sm text-brand-text-tertiary flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {user.phoneNumber}
                </p>
              )}
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <TrendingUp className="w-3 h-3 text-accent" strokeWidth={2} />
                <span className="text-xs font-bold text-accent uppercase tracking-wider">{planLabel} {t('admin.member')}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-6 right-6 flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" strokeWidth={2} />
              {t('settingsPage.title')}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              {t('auth.logout')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 mt-20">
          {userStats.map((stat) => (
            <div 
              key={stat.label}
              className="p-6 rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-brand-text-tertiary group-hover:text-accent transition-colors duration-200" strokeWidth={1.5} />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-brand-text-tertiary/70 uppercase tracking-wider font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Edit Profile Section */}
        {editing && (
          <div className="mb-10 p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-accent" />
                {t('userDashboard.editProfileTitle')}
              </h2>
              <button onClick={handleCancel} className="text-brand-text-tertiary hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium mb-2 text-brand-text-secondary">{t('userDashboard.fullName')}</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-brand-text-secondary">{t('userDashboard.email')}</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-brand-text-secondary">{t('userDashboard.phoneNumber')}</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white"
                    placeholder="+1234567890"
                  />
                </div>
                <p className="text-xs text-brand-text-tertiary mt-1">{t('userDashboard.optional')}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save size={16} />
                  {saving ? t('common.loading') : t('userDashboard.save')}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-medium text-brand-text-secondary transition-colors"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Info (when not editing) */}
        {!editing && (
          <div className="mb-10 p-6 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{t('userDashboard.accountDetails')}</h2>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Pencil size={14} />
                {t('userDashboard.edit')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-brand-text-tertiary uppercase tracking-wider mb-1">{t('dashboard.name')}</p>
                <p className="text-white font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-brand-text-tertiary uppercase tracking-wider mb-1">{t('userDashboard.email')}</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-brand-text-tertiary uppercase tracking-wider mb-1">{t('userDashboard.phoneNumber')}</p>
                <p className="text-white font-medium">{user.phoneNumber || <span className="text-brand-text-tertiary italic">-</span>}</p>
              </div>
              <div>
                <p className="text-xs text-brand-text-tertiary uppercase tracking-wider mb-1">{t('userDashboard.currentPlan')}</p>
                <p className="text-white font-medium capitalize">{user.subscription?.plan || 'Free'}</p>
              </div>
              <div>
                <p className="text-xs text-brand-text-tertiary uppercase tracking-wider mb-1">{t('userDashboard.status')}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user.subscription?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {user.subscription?.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
