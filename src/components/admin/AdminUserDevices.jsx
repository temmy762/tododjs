import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Smartphone, Tablet, Globe, Wifi, WifiOff, Shield, AlertTriangle,
  Search, RefreshCw, Trash2, ChevronDown, ChevronUp, Users, Activity,
  MapPin, Clock, Zap, Eye, UserX, CheckCircle, XCircle, CreditCard, Hash
} from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = (json = false) => {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const isOnline = (date) => date && (Date.now() - new Date(date).getTime()) < 15 * 60 * 1000;

const DeviceIcon = ({ type }) => {
  if (type === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
};

const RiskBadge = ({ score }) => {
  if (score >= 60) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
      HIGH RISK
    </span>
  );
  if (score >= 30) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
      MEDIUM
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
      LOW
    </span>
  );
};

const PlanBadge = ({ plan, status }) => {
  const color = status === 'active'
    ? 'bg-accent/20 text-accent border-accent/30'
    : 'bg-white/5 text-brand-text-tertiary border-white/10';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {plan || 'Free'}
    </span>
  );
};

function UserDeviceRow({ user, onRevoke, onRevokeAll }) {
  const [expanded, setExpanded] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const handleRevoke = async (deviceId) => {
    setRevoking(deviceId);
    await onRevoke(user._id, deviceId);
    setRevoking(null);
  };

  const activeSessions = user.devices?.filter(d => isOnline(d.lastActive)).length || 0;

  return (
    <div className={`border rounded-xl transition-all duration-200 ${
      user.suspiciousSharing
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : 'border-white/10 bg-dark-elevated'
    }`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-bold text-sm">
            {user.name?.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">{user.name}</span>
            {user.suspiciousSharing && (
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            )}
            <PlanBadge plan={user.subscription?.plan} status={user.subscription?.status} />
          </div>
          <p className="text-xs text-brand-text-tertiary truncate">{user.email}</p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <div className="flex items-center gap-1 text-sm font-semibold text-white">
              {activeSessions > 0
                ? <Wifi className="w-3 h-3 text-green-400" />
                : <WifiOff className="w-3 h-3 text-brand-text-tertiary" />}
              <span>{activeSessions}</span>
            </div>
            <p className="text-xs text-brand-text-tertiary">Active</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{user.devices?.length || 0}</p>
            <p className="text-xs text-brand-text-tertiary">Devices</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{user.uniqueIPs?.length || 0}</p>
            <p className="text-xs text-brand-text-tertiary">IPs</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-brand-text-tertiary">{timeAgo(user.lastLogin)}</p>
            <p className="text-xs text-brand-text-tertiary">Last login</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user.devices?.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onRevokeAll(user._id); }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
            >
              <UserX className="w-3 h-3" />
              Revoke All
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-brand-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-brand-text-tertiary" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-2">
          {/* Mobile stats */}
          <div className="flex md:hidden items-center gap-4 mb-3 text-sm">
            <span className="text-brand-text-tertiary">{activeSessions} active · {user.devices?.length || 0} devices · {user.uniqueIPs?.length || 0} IPs</span>
          </div>

          {/* Stripe IDs */}
          {(user.subscription?.stripeCustomerId || user.subscription?.stripeSubscriptionId) && (
            <div className="mb-3 p-3 rounded-lg bg-dark-surface border border-white/10">
              <p className="text-xs font-semibold text-brand-text-secondary mb-2 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Stripe Information
              </p>
              <div className="space-y-1">
                {user.subscription.stripeCustomerId && (
                  <div className="flex items-start gap-2">
                    <Hash className="w-3 h-3 text-brand-text-tertiary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-text-tertiary">Customer ID</p>
                      <p className="text-xs font-mono text-white truncate">{user.subscription.stripeCustomerId}</p>
                    </div>
                  </div>
                )}
                {user.subscription.stripeSubscriptionId && (
                  <div className="flex items-start gap-2">
                    <Hash className="w-3 h-3 text-brand-text-tertiary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-text-tertiary">Subscription ID</p>
                      <p className="text-xs font-mono text-white truncate">{user.subscription.stripeSubscriptionId}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sharing info */}
          {user.subscription?.sharedWith?.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs font-semibold text-yellow-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Subscription shared with:
              </p>
              {user.subscription.sharedWith.map(su => (
                <p key={su._id} className="text-xs text-yellow-300">{su.name} — {su.email}</p>
              ))}
            </div>
          )}
          {user.subscription?.sharedBy && (
            <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Uses subscription from: {user.subscription.sharedBy.name} ({user.subscription.sharedBy.email})
              </p>
            </div>
          )}

          {/* Device list */}
          {user.devices?.length === 0 && (
            <p className="text-sm text-brand-text-tertiary text-center py-4">No registered devices</p>
          )}
          {user.devices?.map((device) => (
            <div
              key={device.deviceId}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isOnline(device.lastActive)
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-white/5 bg-dark-surface'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                isOnline(device.lastActive) ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-brand-text-tertiary'
              }`}>
                <DeviceIcon type={device.deviceType} />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                <div>
                  <p className="text-sm font-medium text-white truncate">
                    {device.deviceName || `${device.browser} on ${device.os}`}
                  </p>
                  <p className="text-xs text-brand-text-tertiary">{device.deviceType} · {device.browser}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-brand-text-secondary">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate font-mono">{device.ipAddress || 'No IP'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-brand-text-secondary">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{device.location || 'Unknown location'}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-brand-text-secondary">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className={isOnline(device.lastActive) ? 'text-green-400 font-medium' : ''}>
                    {isOnline(device.lastActive) ? 'Online now' : timeAgo(device.lastActive)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(device.deviceId)}
                disabled={revoking === device.deviceId}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                title="Revoke device"
              >
                {revoking === device.deviceId
                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUserDevices() {
  const [tab, setTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [stats, setStats] = useState({ totalDevices: 0, activeSessions: 0, suspiciousUsers: 0, totalUsers: 0 });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDevices = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`${API}/users/devices?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setPagination(data.pagination);
        const totalDevices = data.data.reduce((s, u) => s + (u.devices?.length || 0), 0);
        const activeSessions = data.data.reduce((s, u) => s + (u.activeSessions || 0), 0);
        const suspiciousUsers = data.data.filter(u => u.suspiciousSharing).length;
        setStats({ totalDevices, activeSessions, suspiciousUsers, totalUsers: data.pagination.total });
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  const fetchSuspects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/users/sharing-suspects`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSuspects(data.data);
    } catch (err) {
      console.error('Failed to fetch suspects:', err);
    }
  }, []);

  useEffect(() => {
    fetchDevices(1);
    fetchSuspects();
  }, [fetchDevices, fetchSuspects]);

  const handleRevoke = async (userId, deviceId) => {
    try {
      const res = await fetch(`${API}/users/${userId}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast('Device revoked successfully');
        fetchDevices(pagination.page);
        fetchSuspects();
      } else {
        showToast(data.message || 'Failed to revoke device', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleRevokeAll = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user?.devices?.length) return;
    try {
      await Promise.all(
        user.devices.map(d =>
          fetch(`${API}/users/${userId}/devices/${d.deviceId}`, {
            method: 'DELETE',
            headers: authHeaders()
          })
        )
      );
      showToast(`All devices revoked for ${user.name}`);
      fetchDevices(pagination.page);
      fetchSuspects();
    } catch {
      showToast('Failed to revoke all devices', 'error');
    }
  };

  const displayList = tab === 'suspects' ? suspects : users;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-500/20 border border-red-500/40 text-red-400'
            : 'bg-green-500/20 border border-green-500/40 text-green-400'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-accent" />
          Device & Session Management
        </h1>
        <p className="text-sm text-brand-text-tertiary mt-1">
          Monitor active sessions, track devices, and detect subscription sharing
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-elevated rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-xs text-brand-text-tertiary font-medium uppercase tracking-wide">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-brand-text-tertiary font-medium uppercase tracking-wide">Registered Devices</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalDevices}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs text-brand-text-tertiary font-medium uppercase tracking-wide">Active Now</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.activeSessions}</p>
        </div>
        <div className={`bg-dark-elevated rounded-xl p-4 border ${stats.suspiciousUsers > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${stats.suspiciousUsers > 0 ? 'text-yellow-400' : 'text-brand-text-tertiary'}`} />
            <span className="text-xs text-brand-text-tertiary font-medium uppercase tracking-wide">Suspicious</span>
          </div>
          <p className={`text-2xl font-bold ${stats.suspiciousUsers > 0 ? 'text-yellow-400' : 'text-white'}`}>{stats.suspiciousUsers}</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-xl border border-white/10 overflow-hidden p-1 bg-dark-elevated">
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'all' ? 'bg-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            All Users
          </button>
          <button
            onClick={() => setTab('suspects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'suspects' ? 'bg-yellow-500/80 text-white shadow-lg' : 'text-brand-text-secondary hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Sharing Suspects
            {suspects.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {suspects.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2.5 bg-dark-elevated border border-white/10 rounded-xl text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={() => { fetchDevices(pagination.page); fetchSuspects(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-elevated border border-white/10 text-sm text-brand-text-secondary hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20">
          <Shield className="w-12 h-12 text-brand-text-tertiary mx-auto mb-3 opacity-50" />
          <p className="text-brand-text-tertiary">
            {tab === 'suspects' ? 'No suspicious activity detected' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'suspects' && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-400">Sharing Detection Active</p>
                <p className="text-xs text-yellow-300/70 mt-0.5">
                  Users ranked by risk score based on multiple IPs, locations, and active shared subscriptions.
                  Higher score = more likely sharing credentials.
                </p>
              </div>
            </div>
          )}

          {tab === 'suspects'
            ? suspects.map(u => (
                <div key={u._id} className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 font-bold text-sm">{u.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{u.name}</span>
                        <RiskBadge score={u.riskScore} />
                        <span className="text-xs text-brand-text-tertiary">Score: {u.riskScore}</span>
                      </div>
                      <p className="text-xs text-brand-text-tertiary">{u.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-xs">
                    <div className="bg-dark-surface rounded-lg p-2">
                      <p className="text-brand-text-tertiary mb-1">Devices</p>
                      <p className="font-bold text-white text-base">{u.deviceCount}</p>
                    </div>
                    <div className="bg-dark-surface rounded-lg p-2">
                      <p className="text-brand-text-tertiary mb-1">Unique IPs</p>
                      <p className="font-bold text-red-400 text-base">{u.uniqueIPs.length}</p>
                    </div>
                    <div className="bg-dark-surface rounded-lg p-2">
                      <p className="text-brand-text-tertiary mb-1">Locations</p>
                      <p className="font-bold text-white text-base">{u.uniqueLocations.length || 0}</p>
                    </div>
                    <div className="bg-dark-surface rounded-lg p-2">
                      <p className="text-brand-text-tertiary mb-1">Shared with</p>
                      <p className="font-bold text-yellow-400 text-base">{u.sharedWith.length}</p>
                    </div>
                  </div>

                  {u.uniqueIPs.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-brand-text-tertiary mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Known IPs:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {u.uniqueIPs.map(ip => (
                          <span key={ip} className="px-2 py-0.5 rounded bg-dark-surface text-xs font-mono text-brand-text-secondary border border-white/5">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {u.sharedWith.length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Sharing with:
                      </p>
                      {u.sharedWith.map(sw => (
                        <p key={sw._id} className="text-xs text-yellow-300">{sw.name} — {sw.email}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            : users.map(u => (
                <UserDeviceRow
                  key={u._id}
                  user={u}
                  onRevoke={handleRevoke}
                  onRevokeAll={handleRevokeAll}
                />
              ))
          }
        </div>
      )}

      {/* Pagination (All Users tab only) */}
      {tab === 'all' && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-brand-text-tertiary">
            {pagination.total} users total
          </p>
          <div className="flex gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => fetchDevices(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === pagination.page
                    ? 'bg-accent text-white'
                    : 'bg-dark-elevated border border-white/10 text-brand-text-secondary hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
