import { useState, useEffect } from 'react';
import {
  Loader, Shield, Users, UserCheck, UserX, AlertTriangle, LogIn,
  UserPlus, Download, Eye, Lock, Mail
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

const timeAgo = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function AdminSecurity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/settings/security`, { headers: authHeaders() });
        if (!res.ok) { console.error('Security error:', res.status); return; }
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to fetch security data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <h2 className="text-3xl font-bold text-white mb-2">Security & Logs</h2>
        <p className="text-brand-text-tertiary">Failed to load. Make sure you're logged in as admin.</p>
      </div>
    );
  }

  const { overview, adminUsers, recentLogins, recentSignups, recentDownloads, roleDistribution } = data;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Security & Logs</h2>
        <p className="text-brand-text-tertiary">User activity, admin accounts, and security overview</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={overview.totalUsers} color="text-accent" />
        <StatCard icon={Eye} label="Active (24h)" value={overview.activeSessions} color="text-green-400" />
        <StatCard icon={Shield} label="Admins" value={overview.adminCount} color="text-blue-400" />
        <StatCard icon={UserX} label="Inactive (30d)" value={overview.inactiveCount} color="text-yellow-400" />
        <StatCard icon={Lock} label="Deactivated" value={overview.deactivatedCount} color="text-red-400" />
        <StatCard icon={Mail} label="Unverified" value={overview.unverifiedEmails} color="text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Admin Accounts */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold text-white">Admin Accounts</h3>
          </div>
          {adminUsers.length > 0 ? (
            <div className="space-y-3">
              {adminUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-dark-surface border border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{(u.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.name}</p>
                    <p className="text-xs text-brand-text-tertiary truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium ${u.isActive !== false ? 'text-green-400' : 'text-red-400'}`}>
                      {u.isActive !== false ? 'Active' : 'Disabled'}
                    </span>
                    <p className="text-xs text-brand-text-tertiary">{timeAgo(u.lastLogin)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-4">No admin accounts</p>
          )}
        </div>

        {/* Role Distribution */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Role Distribution</h3>
          </div>
          <div className="space-y-4">
            {roleDistribution.map((r, i) => {
              const pct = overview.totalUsers > 0 ? (r.count / overview.totalUsers * 100).toFixed(1) : 0;
              const colors = { admin: 'bg-red-500', user: 'bg-blue-500' };
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium capitalize">{r._id || 'Unknown'}</span>
                    <span className="text-sm text-brand-text-tertiary">{r.count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-dark-surface rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[r._id] || 'bg-gray-500'} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Download Activity */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-accent" />
              <h4 className="text-sm font-bold text-white">Top Downloaders (24h)</h4>
            </div>
            {recentDownloads.length > 0 ? (
              <div className="space-y-2">
                {recentDownloads.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-accent w-5">{i + 1}</span>
                      <span className="text-sm text-white truncate">{d.name}</span>
                      <span className="text-xs text-brand-text-tertiary capitalize">({d.plan})</span>
                    </div>
                    <span className="text-sm font-bold text-white flex-shrink-0">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-brand-text-tertiary text-xs text-center py-2">No downloads in 24h</p>
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Recent Signups (7d)</h3>
          </div>
          {recentSignups.length > 0 ? (
            <div className="space-y-2">
              {recentSignups.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-surface transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{(u.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.name}</p>
                    <p className="text-xs text-brand-text-tertiary truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-medium text-accent capitalize">{u.subscription?.plan || 'free'}</span>
                    <p className="text-xs text-brand-text-tertiary">{timeAgo(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-4">No signups in last 7 days</p>
          )}
        </div>
      </div>

      {/* Recent Logins */}
      <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <LogIn className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-white">Recent Logins (7d)</h3>
        </div>
        {recentLogins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-tertiary uppercase">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentLogins.map((u, i) => (
                  <tr key={i} className="hover:bg-dark-surface transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{(u.name || '?').charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{u.name}</p>
                          <p className="text-xs text-brand-text-tertiary">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white capitalize">{u.subscription?.plan || 'free'}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-tertiary">{timeAgo(u.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-brand-text-tertiary text-center py-8">No logins in last 7 days</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-dark-elevated rounded-xl p-4 border border-white/10">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <div className="text-xl font-bold text-white">{value.toLocaleString()}</div>
      <p className="text-xs text-brand-text-tertiary">{label}</p>
    </div>
  );
}
