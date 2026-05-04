import { useState, useEffect } from 'react';
import { Download, TrendingUp, Calendar, Database } from 'lucide-react';
import API_URL, { getAuthHeaders } from '../../config/api';

export default function AdminDownloadStats() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);

  const safeJson = async (response) => {
    const text = await response.text();
    try {
      return { ok: true, json: JSON.parse(text) };
    } catch (e) {
      return { ok: false, status: response.status, raw: text };
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/downloads/stats?period=${period}`, {
        headers: getAuthHeaders(false),
        credentials: 'include'
      });

      const parsed = await safeJson(response);
      if (!parsed.ok) {
        throw new Error(`Stats endpoint returned non-JSON (HTTP ${parsed.status}): ${parsed.raw?.slice(0, 160)}`);
      }

      const json = parsed.json;
      if (!response.ok) {
        throw new Error(json?.message || `Failed to fetch statistics (HTTP ${response.status})`);
      }

      if (json.success) {
        const data = json.data || {};
        setStats({
          ...data,
          totalDownloads: data.totalDownloads ?? 0,
          downloadsByType: Array.isArray(data.downloadsByType) ? data.downloadsByType : [],
          topSources: Array.isArray(data.topSources) ? data.topSources : [],
          downloadsOverTime: Array.isArray(data.downloadsOverTime) ? data.downloadsOverTime : []
        });
      } else {
        throw new Error(json.message || 'Failed to load statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error?.message || error);
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

  const totalDownloads = stats.totalDownloads ?? 0;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Download Statistics</h1>
          <p className="text-brand-text-tertiary">Track and analyze download activity</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          value={Number(totalDownloads || 0).toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Single Downloads"
          value={Number(singleDownloads || 0).toLocaleString()}
          color="green"
        />
        <StatCard
          icon={Database}
          label="Bulk Downloads"
          value={Number(bulkDownloads || 0).toLocaleString()}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          label="Avg per Day"
          value={Math.round(Number(totalDownloads || 0) / (period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90)).toLocaleString()}
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
                <div className="font-bold text-accent">{Number(source.downloads || 0).toLocaleString()}</div>
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

        {/* Mobile: SVG area line chart */}
        <div className="md:hidden">
          <MobileLineChart data={stats.downloadsOverTime} />
        </div>

        {/* Desktop: bar chart */}
        <div className="hidden md:block overflow-x-auto">
        <div className="h-64 flex items-end gap-1" style={{ minWidth: `${Math.max(300, (stats.downloadsOverTime?.length || 0) * 14)}px` }}>
          {stats.downloadsOverTime?.map((day, index) => {
            const maxCount = Math.max(...stats.downloadsOverTime.map(d => d.count));
            const heightPx = Math.max(4, (day.count / maxCount) * 220);

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full group">
                  <div
                    className="w-full bg-accent rounded-t transition-all hover:bg-accent-hover cursor-pointer"
                    style={{ height: `${heightPx}px` }}
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
    </div>
  );
}

function MobileLineChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-center text-brand-text-tertiary py-12">No data available</p>;
  }

  const n = data.length;
  const maxCount = Math.max(...data.map(d => d.count));
  const L = 8, R = 392, T = 20, B = 130;
  const W = R - L, H = B - T;
  const px = (i) => L + (i / Math.max(n - 1, 1)) * W;
  const py = (c) => T + (1 - c / maxCount) * H;
  const pts = data.map((d, i) => ({ x: px(i), y: py(d.count), count: d.count }));
  const linePoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M${L},${B} L${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')} L${R},${B} Z`;
  const peakIdx = pts.reduce((mi, p, i, arr) => p.count > arr[mi].count ? i : mi, 0);
  const labelIdxs = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

  return (
    <svg viewBox="0 0 400 160" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e50914" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e50914" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(v => (
        <line key={v} x1={L} y1={(T + (1 - v) * H).toFixed(1)} x2={R} y2={(T + (1 - v) * H).toFixed(1)} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <polyline points={linePoints} fill="none" stroke="#e50914" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[peakIdx].x.toFixed(1)} cy={pts[peakIdx].y.toFixed(1)} r="3" fill="#e50914" />
      <text x={pts[peakIdx].x.toFixed(1)} y={(pts[peakIdx].y - 6).toFixed(1)} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">{pts[peakIdx].count}</text>
      <circle cx={pts[0].x.toFixed(1)} cy={pts[0].y.toFixed(1)} r="2" fill="#e50914" />
      {n > 1 && <circle cx={pts[n - 1].x.toFixed(1)} cy={pts[n - 1].y.toFixed(1)} r="2" fill="#e50914" />}
      {labelIdxs.map((idx, i) => (
        <text
          key={idx}
          x={pts[idx].x.toFixed(1)}
          y="152"
          textAnchor={i === 0 ? 'start' : i === labelIdxs.length - 1 ? 'end' : 'middle'}
          fontSize="7"
          fill="rgba(207,207,207,0.8)"
        >
          {new Date(data[idx]._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
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
