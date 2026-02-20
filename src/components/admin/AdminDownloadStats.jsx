import { useState, useEffect } from 'react';
import { Download, TrendingUp, Calendar, Database } from 'lucide-react';
import API_URL from '../../config/api';

export default function AdminDownloadStats() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/downloads/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
          <p className="text-brand-text-tertiary mt-4">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-brand-text-tertiary">No statistics available</p>
        </div>
      </div>
    );
  }

  const singleDownloads = stats.downloadsByType?.find(d => d._id === 'single')?.count || 0;
  const bulkDownloads = stats.downloadsByType?.find(d => d._id === 'bulk')?.count || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Download Statistics</h1>
          <p className="text-brand-text-tertiary">Track and analyze download activity</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-brand-text-tertiary hover:text-white'
              }`}
            >
              {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Download}
          label="Total Downloads"
          value={stats.totalDownloads.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Single Downloads"
          value={singleDownloads.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={Database}
          label="Bulk Downloads"
          value={bulkDownloads.toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          label="Avg per Day"
          value={Math.round(stats.totalDownloads / (period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90)).toLocaleString()}
          color="orange"
        />
      </div>

      {/* Top Sources */}
      <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
        <h2 className="text-xl font-bold mb-4">Top Sources</h2>
        <div className="space-y-4">
          {stats.topSources?.map((source, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center font-bold text-accent">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{source.source}</div>
                  <div className="text-sm text-brand-text-tertiary">{source.platform}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-accent">{source.downloads.toLocaleString()}</div>
                <div className="text-xs text-brand-text-tertiary">downloads</div>
              </div>
            </div>
          ))}
          {(!stats.topSources || stats.topSources.length === 0) && (
            <p className="text-center text-brand-text-tertiary py-4">No data available</p>
          )}
        </div>
      </div>

      {/* Downloads Over Time Chart */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h2 className="text-xl font-bold mb-4">Downloads Over Time</h2>
        <div className="h-64 flex items-end gap-2">
          {stats.downloadsOverTime?.map((day, index) => {
            const maxCount = Math.max(...stats.downloadsOverTime.map(d => d.count));
            const height = (day.count / maxCount) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full group">
                  <div
                    className="w-full bg-accent rounded-t transition-all hover:bg-accent-hover cursor-pointer"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-elevated px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <div className="font-bold">{day.count}</div>
                    <div className="text-xs text-brand-text-tertiary">{new Date(day._id).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-xs text-brand-text-tertiary rotate-45 origin-top-left mt-4">
                  {new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
          {(!stats.downloadsOverTime || stats.downloadsOverTime.length === 0) && (
            <p className="text-center text-brand-text-tertiary w-full py-12">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 text-blue-400',
    green: 'from-green-500/20 to-emerald-500/20 text-green-400',
    purple: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    orange: 'from-orange-500/20 to-yellow-500/20 text-orange-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-6 border border-white/10`}>
      <div className="flex items-center justify-between mb-4">
        <Icon size={32} />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}
