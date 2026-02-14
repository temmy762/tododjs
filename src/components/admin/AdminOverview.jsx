import { useState, useEffect } from 'react';
import { Music, Users, Download, CreditCard, TrendingUp, Upload, UserPlus, Activity, Loader, RefreshCw } from 'lucide-react';

const API = 'http://localhost:5000/api';

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const activityIcon = (type) => {
  switch (type) {
    case 'download': return Download;
    case 'upload': return Upload;
    case 'signup': return UserPlus;
    case 'upgrade': return TrendingUp;
    default: return Activity;
  }
};

export default function AdminOverview({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.message || 'Failed to load overview');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchOverview} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  const { stats, recentActivity, systemStatus } = data;

  const statCards = [
    { label: 'Total Tracks', value: stats.totalTracks.toLocaleString(), icon: Music, change: stats.tracksChange, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, change: stats.usersChange, color: 'from-purple-500 to-pink-500' },
    { label: 'Downloads Today', value: stats.downloadsToday.toLocaleString(), icon: Download, change: stats.downloadsChange, color: 'from-green-500 to-emerald-500' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), icon: CreditCard, change: stats.subscriptionsChange, color: 'from-orange-500 to-red-500' },
  ];

  const quickActions = [
    { label: 'Upload Track', icon: Upload, color: 'bg-accent', section: 'tracks' },
    { label: 'Create Album', icon: Music, color: 'bg-purple-500', section: 'recordpool' },
    { label: 'Add User', icon: UserPlus, color: 'bg-green-500', section: 'users' },
    { label: 'View Reports', icon: Activity, color: 'bg-orange-500', section: 'analytics' },
  ];

  const memPct = systemStatus.memoryTotalMB > 0
    ? Math.round((systemStatus.memoryUsedMB / systemStatus.memoryTotalMB) * 100)
    : 0;

  const formatUptime = (secs) => {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">Dashboard Overview</h2>
          <p className="text-xs md:text-base text-brand-text-tertiary">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="w-9 h-9 rounded-lg bg-dark-elevated border border-white/10 flex items-center justify-center text-brand-text-tertiary hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change.startsWith('+');
          return (
            <div
              key={index}
              className="bg-dark-elevated rounded-2xl p-4 md:p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2} />
                </div>
                <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
                  isPositive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-white mb-0.5 md:mb-1">{stat.value}</h3>
              <p className="text-[10px] md:text-sm text-brand-text-tertiary">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-dark-elevated rounded-2xl p-4 md:p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-xl font-bold text-white">Recent Activity</h3>
            <span className="text-[10px] md:text-xs text-brand-text-tertiary">Live</span>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-brand-text-tertiary text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-2 md:space-y-4">
              {recentActivity.map((item, index) => {
                const Icon = activityIcon(item.type);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg hover:bg-dark-surface transition-colors duration-200"
                  >
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-dark-surface flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-accent" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm text-white">
                        <span className="font-semibold">{item.user}</span> {item.action}
                      </p>
                      <p className="text-[10px] md:text-xs text-brand-text-tertiary">{timeAgo(item.time)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-dark-elevated rounded-2xl p-4 md:p-6 border border-white/10">
          <h3 className="text-base md:text-xl font-bold text-white mb-4 md:mb-6">Quick Actions</h3>
          <div className="space-y-2 md:space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => onNavigate?.(action.section)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-lg ${action.color} hover:opacity-90 transition-all duration-200 hover:scale-105 text-white text-sm font-medium shadow-lg`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* System Status */}
          <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">System Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-tertiary">Server</span>
                <span className="text-green-400 font-medium">● {systemStatus.server === 'online' ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-tertiary">Memory</span>
                <span className="text-white font-medium">{systemStatus.memoryUsedMB}MB / {systemStatus.memoryTotalMB}MB ({memPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-tertiary">Uptime</span>
                <span className="text-white font-medium">{formatUptime(systemStatus.uptime)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brand-text-tertiary">API</span>
                <span className="text-green-400 font-medium">● Healthy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
