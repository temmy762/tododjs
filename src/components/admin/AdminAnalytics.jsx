import { useState, useEffect } from 'react';
import {
  Music, Users, Download, Database, TrendingUp, Loader,
  BarChart3, UserPlus, Disc, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/analytics`, { headers: authHeaders() });
        if (!res.ok) { console.error('Analytics error:', res.status); return; }
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
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
        <h2 className="text-3xl font-bold text-white mb-2">Analytics & Reports</h2>
        <p className="text-brand-text-tertiary">Failed to load analytics data. Make sure you're logged in as admin.</p>
      </div>
    );
  }

  const { overview, growth, charts, topTracks, recentSignups } = data;

  const growthPct = (current, previous) => {
    if (!previous) return current > 0 ? '+100%' : '0%';
    const pct = ((current - previous) / previous * 100).toFixed(0);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const statCards = [
    { label: 'Total Tracks', value: overview.totalTracks, icon: Music, color: 'from-blue-500 to-cyan-500', change: growthPct(growth.tracksThisMonth, growth.tracksLastMonth) },
    { label: 'Total Members', value: overview.totalUsers, icon: Users, color: 'from-purple-500 to-pink-500', change: growthPct(growth.newUsersThisMonth, growth.newUsersLastMonth) },
    { label: 'Downloads Today', value: overview.downloadsToday, icon: Download, color: 'from-green-500 to-emerald-500', change: null },
    { label: 'Total Downloads', value: overview.totalDownloads, icon: Database, color: 'from-orange-500 to-red-500', change: growthPct(growth.downloadsThisMonth, growth.downloadsLastMonth) },
  ];

  const maxDownload = Math.max(...(charts.downloadsOverTime.map(d => d.count)), 1);
  const maxUserDay = Math.max(...(charts.usersOverTime.map(d => d.count)), 1);
  const maxGenre = Math.max(...(charts.tracksByGenre.map(g => g.count)), 1);

  const genreColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500',
    'bg-cyan-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Analytics & Reports</h2>
        <p className="text-brand-text-tertiary">Live data from your record pool</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const isPositive = stat.change && stat.change.startsWith('+');
          return (
            <div key={i} className="bg-dark-elevated rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                {stat.change && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 ${
                    isPositive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value.toLocaleString()}</h3>
              <p className="text-sm text-brand-text-tertiary">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MiniStat label="Albums" value={overview.totalAlbums} />
        <MiniStat label="Sources" value={overview.sourceCount} />
        <MiniStat label="Premium Members" value={overview.premiumUsers} />
        <MiniStat label="Pro Members" value={overview.proUsers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Downloads Over Time */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Downloads (Last 30 Days)</h3>
          </div>
          {charts.downloadsOverTime.length > 0 ? (
            <div className="flex items-end gap-1 h-48">
              {charts.downloadsOverTime.map((day, i) => {
                const height = (day.count / maxDownload) * 100;
                return (
                  <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-accent/80 hover:bg-accent rounded-t transition-all cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max(height, 1)}%` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-surface border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 text-xs">
                      <div className="font-bold text-white">{day.count}</div>
                      <div className="text-brand-text-tertiary">{new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-brand-text-tertiary">No download data yet</div>
          )}
        </div>

        {/* New Users Over Time */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">New Members (Last 30 Days)</h3>
          </div>
          {charts.usersOverTime.length > 0 ? (
            <div className="flex items-end gap-1 h-48">
              {charts.usersOverTime.map((day, i) => {
                const height = (day.count / maxUserDay) * 100;
                return (
                  <div key={i} className="flex-1 group relative flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-purple-500/80 hover:bg-purple-500 rounded-t transition-all cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max(height, 1)}%` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-surface border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 text-xs">
                      <div className="font-bold text-white">{day.count}</div>
                      <div className="text-brand-text-tertiary">{new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-brand-text-tertiary">No signups in the last 30 days</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Tracks by Genre */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Disc className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Tracks by Genre</h3>
          </div>
          {charts.tracksByGenre.length > 0 ? (
            <div className="space-y-3">
              {charts.tracksByGenre.map((g, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{g._id || 'Unknown'}</span>
                    <span className="text-xs text-brand-text-tertiary">{g.count}</span>
                  </div>
                  <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${genreColors[i % genreColors.length]} transition-all`}
                      style={{ width: `${(g.count / maxGenre) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-8">No tracks yet</p>
          )}
        </div>

        {/* Members by Plan */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Members by Plan</h3>
          </div>
          <div className="space-y-4">
            {charts.usersByPlan.map((p, i) => {
              const colors = ['bg-gray-500', 'bg-purple-500', 'bg-orange-500'];
              const pct = overview.totalUsers > 0 ? (p.count / overview.totalUsers * 100).toFixed(1) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">{p.plan}</span>
                    <span className="text-sm text-brand-text-tertiary">{p.count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full h-3 bg-dark-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[i]} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            {charts.usersByPlan.map((p, i) => (
              <div key={i}>
                <div className="text-xl font-bold text-white">{p.count}</div>
                <div className="text-xs text-brand-text-tertiary">{p.plan}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Downloaded Tracks */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Top Tracks (30d)</h3>
          </div>
          {topTracks.length > 0 ? (
            <div className="space-y-3">
              {topTracks.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-surface transition-colors">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-accent">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{t.title}</p>
                    <p className="text-xs text-brand-text-tertiary truncate">{t.artist}</p>
                  </div>
                  <div className="text-sm font-bold text-accent">{t.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-8">No downloads yet</p>
          )}
        </div>
      </div>

      {/* Growth This Month + Recent Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Summary */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">This Month's Growth</h3>
          <div className="grid grid-cols-2 gap-4">
            <GrowthCard label="New Members" value={growth.newUsersThisMonth} prev={growth.newUsersLastMonth} />
            <GrowthCard label="New Tracks" value={growth.tracksThisMonth} prev={growth.tracksLastMonth} />
            <GrowthCard label="Downloads" value={growth.downloadsThisMonth} prev={growth.downloadsLastMonth} />
            <GrowthCard label="New Albums" value={growth.albumsThisMonth} prev={null} />
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Recent Signups</h3>
          {recentSignups.length > 0 ? (
            <div className="space-y-3">
              {recentSignups.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-surface transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{(u.name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.name}</p>
                    <p className="text-xs text-brand-text-tertiary truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-medium text-accent capitalize">{u.subscription?.plan || 'free'}</span>
                    <p className="text-xs text-brand-text-tertiary">{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-8">No signups yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-dark-elevated rounded-xl p-4 border border-white/10">
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      <p className="text-xs text-brand-text-tertiary">{label}</p>
    </div>
  );
}

function GrowthCard({ label, value, prev }) {
  const pct = prev != null && prev > 0 ? ((value - prev) / prev * 100).toFixed(0) : null;
  const isUp = pct !== null && pct >= 0;

  return (
    <div className="bg-dark-surface rounded-xl p-4">
      <p className="text-xs text-brand-text-tertiary mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value.toLocaleString()}</span>
        {pct !== null && (
          <span className={`text-xs font-semibold mb-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{pct}%
          </span>
        )}
      </div>
      {prev != null && <p className="text-xs text-brand-text-tertiary mt-1">vs {prev.toLocaleString()} last month</p>}
    </div>
  );
}
