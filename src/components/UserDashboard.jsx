import { useState, useRef, useEffect } from 'react';
import {
  X, User, Mail, Phone, Save, Camera, Lock, Eye, EyeOff,
  Download, Heart, Music, TrendingUp, CheckCircle, AlertCircle,
  LogOut, Pencil, Shield, Play, Trash2
} from 'lucide-react';
import API_URL from '../config/api';

const API = API_URL;

export default function UserDashboard({ user, onClose, onUserUpdate, onLogout, onTrackInteraction }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavorites();
    }
  }, [activeTab]);

  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const removeFavorite = async (trackId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/favorites/toggle/${trackId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(prev => prev.filter(t => (t._id || t.id) !== trackId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  // Profile form
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || ''
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const planLabel = user?.subscription?.plan === 'pro' ? 'Pro' : user?.subscription?.plan === 'premium' ? 'Premium' : 'Free';
  const planColor = user?.subscription?.plan === 'premium' ? 'text-yellow-400' : user?.subscription?.plan === 'pro' ? 'text-purple-400' : 'text-brand-text-tertiary';

  const stats = [
    { label: 'Downloads', value: user?.downloads?.total?.toString() || '0', icon: Download },
    { label: 'Playlists', value: user?.playlists?.length?.toString() || '0', icon: Music },
    { label: 'Favorites', value: favorites.length > 0 ? favorites.length.toString() : (user?.favorites?.length?.toString() || '0'), icon: Heart },
  ];

  const clearMessage = () => setMessage({ type: '', text: '' });

  // ── Avatar Upload ──
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5MB' });
      return;
    }

    setUploadingAvatar(true);
    clearMessage();

    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('avatar', file);

      const res = await fetch(`${API}/users/avatar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: fd
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile photo updated!' });
        if (onUserUpdate) {
          onUserUpdate({ ...user, avatar: data.data.avatar });
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save Profile ──
  const handleSaveProfile = async () => {
    if (formData.phoneNumber) {
      const cleaned = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
        setMessage({ type: 'error', text: 'Please enter a valid phone number (e.g. +1234567890)' });
        return;
      }
    }

    setSaving(true);
    clearMessage();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/updatedetails`, {
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

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        if (onUserUpdate) {
          onUserUpdate({ ...user, name: formData.name, email: formData.email, phoneNumber: formData.phoneNumber });
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Change Password ──
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    clearMessage();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/updatepassword`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'edit', label: 'Edit Profile' },
    { id: 'password', label: 'Password' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg">
      {/* Top Bar */}
      <div className="h-14 bg-dark-elevated border-b border-white/10 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-accent" />
          <h1 className="text-base md:text-lg font-bold text-white">My Account</h1>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-dark-surface hover:bg-dark-elevated flex items-center justify-center transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-24 md:pb-10">

          {/* Avatar + Name Header */}
          <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-8">
            <div className="relative group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent to-accent-hover overflow-hidden border-2 border-white/10 flex items-center justify-center shadow-xl shadow-accent/20 shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/50 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer opacity-0 active:opacity-100"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">{user?.name}</h2>
              <p className="text-xs md:text-sm text-brand-text-tertiary break-all">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <TrendingUp className={`w-3 h-3 ${planColor}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${planColor}`}>{planLabel} Plan</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 md:mb-6 bg-dark-elevated/50 p-1 rounded-xl border border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); clearMessage(); }}
                className={`flex-1 py-2 md:py-2.5 px-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-brand-text-tertiary hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mb-6 p-3.5 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 md:p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                  >
                    <stat.icon className="w-4 h-4 text-brand-text-tertiary mb-1.5 md:mb-2" strokeWidth={1.5} />
                    <div className="text-xl md:text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-brand-text-tertiary uppercase tracking-wider font-semibold mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Account Details */}
              <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3 md:mb-4">Account Details</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Name</p>
                    <p className="text-sm text-white font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-sm text-white font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Phone</p>
                    <p className="text-sm text-white font-medium">{user?.phoneNumber || <span className="text-brand-text-tertiary italic">Not set</span>}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Subscription</p>
                    <p className={`text-sm font-medium capitalize ${planColor}`}>{user?.subscription?.plan || 'Free'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Status</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user?.subscription?.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user?.subscription?.status || 'Active'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text-tertiary uppercase tracking-wider mb-0.5">Role</p>
                    <p className="text-sm text-white font-medium capitalize">{user?.role || 'User'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => { setActiveTab('edit'); clearMessage(); }}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors text-xs md:text-sm font-medium text-white flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4 text-accent shrink-0" />
                  Edit Profile
                </button>
                <button
                  onClick={() => { setActiveTab('password'); clearMessage(); }}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors text-xs md:text-sm font-medium text-white flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 text-accent shrink-0" />
                  Change Password
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={() => { onLogout?.(); onClose(); }}
                className="w-full py-2.5 md:py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium text-red-400 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}

          {/* ── Edit Profile Tab ── */}
          {activeTab === 'edit' && (
            <div className="space-y-5">
              <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-4 md:mb-5 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-accent" />
                  Edit Profile
                </h3>

                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                        placeholder="Your name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                        placeholder="+1234567890"
                      />
                    </div>
                    <p className="text-[10px] text-brand-text-tertiary mt-1">Format: +1234567890 (7-15 digits)</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 md:mt-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setFormData({ name: user?.name || '', email: user?.email || '', phoneNumber: user?.phoneNumber || '' });
                      clearMessage();
                    }}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-medium text-brand-text-secondary text-sm transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Avatar Section */}
              <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-accent" />
                  Profile Photo
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-accent-hover overflow-hidden border-2 border-white/10 flex items-center justify-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-white" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <button
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Camera size={14} />
                      {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                    </button>
                    <p className="text-[10px] text-brand-text-tertiary mt-1.5">JPEG, PNG, WebP, or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Favorites Tab ── */}
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-accent" />
                  My Favorites
                  <span className="text-xs text-brand-text-tertiary font-normal">({favorites.length})</span>
                </h3>
              </div>

              {loadingFavorites ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                      <div className="w-12 h-12 rounded-lg bg-white/[0.06]" />
                      <div className="flex-1">
                        <div className="h-3 bg-white/[0.06] rounded-full w-3/4 mb-1.5" />
                        <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-6 h-6 text-brand-text-tertiary" />
                  </div>
                  <p className="text-sm text-brand-text-tertiary font-medium">No favorites yet</p>
                  <p className="text-xs text-brand-text-tertiary/50 mt-1">Tap the heart icon on any track to save it here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {favorites.map((track) => (
                    <div
                      key={track._id}
                      className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-dark-elevated relative">
                        {track.coverArt ? (
                          <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent/30 to-purple-500/20 flex items-center justify-center">
                            <Music className="w-5 h-5 text-white/40" />
                          </div>
                        )}
                        <button
                          onClick={() => onTrackInteraction?.('play', track)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] md:text-sm font-semibold text-white truncate">{track.title}</p>
                        <p className="text-[11px] md:text-xs text-brand-text-tertiary truncate">{track.artist}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {track.genre && (
                          <span className="hidden md:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-accent bg-accent/10 border border-accent/20">
                            {track.genre}
                          </span>
                        )}
                        <button
                          onClick={() => removeFavorite(track._id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove from favorites"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Password Tab ── */}
          {activeTab === 'password' && (
            <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-4 md:mb-5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" />
                Change Password
              </h3>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"
                    >
                      {showPasswords.current ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-brand-text-secondary">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="mt-6 px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Shield size={14} />
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
