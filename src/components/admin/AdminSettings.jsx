import { useState, useEffect } from 'react';
import {
  Loader, Server, Database, HardDrive, Clock, Cpu, Globe,
  Shield, Zap, Mail, CreditCard, Cloud, Settings, CheckCircle, XCircle,
  Camera, User, Upload
} from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export default function AdminSettings({ user, onUserUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/settings`, { headers: authHeaders() });
        if (!res.ok) { console.error('Settings error:', res.status); return; }
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Image must be under 5MB' });
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    setAvatarUploading(true);
    setAvatarMsg(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API}/users/avatar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setAvatarMsg({ type: 'success', text: 'Profile photo updated!' });
        onUserUpdate?.({ ...user, avatar: json.data.avatar });
      } else {
        setAvatarMsg({ type: 'error', text: json.message || 'Upload failed' });
        setAvatarPreview(null);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setAvatarMsg({ type: 'error', text: 'Upload failed. Please try again.' });
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-24">
        <Loader className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold text-white mb-2">Site Settings</h2>
        <p className="text-brand-text-tertiary">Failed to load. Make sure you're logged in as admin.</p>
      </div>
    );
  }

  const { server, config, database } = data;
  const heapPct = server.memoryUsage.heapTotal > 0
    ? (server.memoryUsage.heapUsed / server.memoryUsage.heapTotal * 100).toFixed(0)
    : 0;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-3xl font-bold text-white mb-2">Site Settings</h2>
        <p className="text-xs md:text-base text-brand-text-tertiary">Server configuration, system health, and feature flags</p>
      </div>

      {/* Admin Profile Photo */}
      <div className="bg-dark-elevated rounded-2xl p-4 md:p-6 border border-white/10 mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <Camera className="w-5 h-5 text-accent" />
          <h3 className="text-base md:text-lg font-bold text-white">Profile Photo</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-dark-surface flex items-center justify-center">
              {(avatarPreview || user?.avatar) ? (
                <img
                  src={avatarPreview || user?.avatar}
                  alt={user?.name || 'Admin'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white/20" />
              )}
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Loader className="w-6 h-6 text-accent animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <p className="text-sm text-brand-text-secondary mb-1">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-brand-text-tertiary mb-3">
              This photo will be displayed across the site. Max 5MB, JPEG/PNG/WebP.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              <Upload className="w-4 h-4" />
              {avatarUploading ? 'Uploading...' : 'Upload Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                className="hidden"
              />
            </label>
            {avatarMsg && (
              <p className={`text-xs mt-2 ${avatarMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {avatarMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-green-400" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Status</span>
          </div>
          <div className="text-lg font-bold text-green-400">Online</div>
          <div className="text-xs text-brand-text-tertiary">{server.env} mode</div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Uptime</span>
          </div>
          <div className="text-lg font-bold text-white">{formatUptime(server.uptime)}</div>
          <div className="text-xs text-brand-text-tertiary">Node {server.nodeVersion}</div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-accent" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Memory</span>
          </div>
          <div className="text-lg font-bold text-white">{server.memoryUsage.heapUsed}MB</div>
          <div className="text-xs text-brand-text-tertiary">{heapPct}% of {server.memoryUsage.heapTotal}MB heap</div>
          <div className="w-full h-1.5 bg-dark-surface rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${heapPct > 80 ? 'bg-red-500' : heapPct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${heapPct}%` }} />
          </div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-accent" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Storage</span>
          </div>
          <div className="text-lg font-bold text-white">{formatBytes(database.totalStorageBytes)}</div>
          <div className="text-xs text-brand-text-tertiary">Wasabi S3</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Server Configuration */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Server Configuration</h3>
          </div>
          <div className="space-y-3">
            <ConfigRow label="Port" value={config.port} icon={Globe} />
            <ConfigRow label="Frontend URL" value={config.frontendUrl} icon={Globe} />
            <ConfigRow label="Max Upload Size" value={config.maxFileSize} icon={HardDrive} />
            <ConfigRow label="JWT Expiry" value={config.jwtExpire} icon={Shield} />
            <ConfigRow label="Platform" value={server.platform} icon={Server} />
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Feature Flags & Integrations</h3>
          </div>
          <div className="space-y-3">
            <FeatureRow label="Tonality Detection" enabled={config.tonalityDetection} />
            <FeatureRow label="AI Fallback (OpenAI)" enabled={config.tonalityAiFallback} />
            <ConfigRow label="OpenAI Model" value={config.openaiModel} icon={Zap} />
            <FeatureRow label="Stripe Payments" enabled={config.stripeConfigured} />
            <FeatureRow label="Email Service" enabled={config.emailConfigured} />
            <ConfigRow label="Wasabi Region" value={config.wasabiRegion} icon={Cloud} />
            <ConfigRow label="Wasabi Bucket" value={config.wasabiBucket} icon={Cloud} />
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <Database className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-white">Database Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DbStat label="Tracks" value={database.totalTracks} />
          <DbStat label="Albums" value={database.totalAlbums} />
          <DbStat label="Users" value={database.totalUsers} />
          <DbStat label="Downloads" value={database.totalDownloads} />
          <DbStat label="Sources" value={database.totalSources} />
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-brand-text-tertiary" />}
        <span className="text-sm text-brand-text-tertiary">{label}</span>
      </div>
      <span className="text-sm text-white font-medium font-mono">{value}</span>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-brand-text-tertiary">{label}</span>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-green-400">Enabled</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Disabled</span>
          </>
        )}
      </div>
    </div>
  );
}

function DbStat({ label, value }) {
  return (
    <div className="bg-dark-surface rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-xs text-brand-text-tertiary mt-1">{label}</div>
    </div>
  );
}
