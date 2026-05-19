import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, TrendingUp, Calendar, Database, Search, Filter, FileDown, AlertTriangle, CheckCircle, Clock, Wifi } from 'lucide-react';
import API_URL, { getAuthHeaders } from '../../config/api';

export default function AdminDownloadStats() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Logs state
  const [logs, setLogs]         = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage]   = useState(1);
  const [logsPages, setLogsPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Alerts state
  const [alerts, setAlerts]     = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const safeJson = async (response) => {
    const text = await response.text();
    try {
      return { ok: true, json: JSON.parse(text) };
    } catch (e) {
      return { ok: false, status: response.status, raw: text };
    }
  };

  const filtersRef = useRef({ search, dateFrom, dateTo, typeFilter });
  useEffect(() => { filtersRef.current = { search, dateFrom, dateTo, typeFilter }; }, [search, dateFrom, dateTo, typeFilter]);

  const fetchLogs = useCallback(async (page = 1) => {
    const { search: s, dateFrom: df, dateTo: dt, typeFilter: ft } = filtersRef.current;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (s) params.set('search', s);
      if (df) params.set('dateFrom', df);
      if (dt) params.set('dateTo', dt);
      if (ft) params.set('fileType', ft);
      const url = `${API_URL}/downloads/admin/logs?${params}`;
      const res = await fetch(url, { headers: getAuthHeaders(false) });
      const data = await res.json();
      console.log('[AdminLogs] status:', res.status, 'response:', data);
      if (data.success) {
        setLogs(data.data || []);
        setLogsTotal(data.total || 0);
        setLogsPage(data.page || 1);
        setLogsPages(data.pages || 1);
      } else {
        console.error('[AdminLogs] API error:', data.message);
        setLogs([]);
      }
    } catch (e) {
      console.error('[AdminLogs] fetch error:', e);
      setLogs([]);
    } finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [period]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(1); }, [activeTab, fetchLogs]);
  useEffect(() => {
    if (activeTab === 'logs') fetchLogs(1);
  }, [typeFilter, dateFrom, dateTo, fetchLogs]);
  useEffect(() => { if (activeTab === 'alerts') fetchAlerts(); }, [activeTab]);

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch(`${API_URL}/downloads/admin/alerts`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success) setAlerts(data.data || []);
    } catch (e) { console.error(e); }
    finally { setAlertsLoading(false); }
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (typeFilter) params.set('fileType', typeFilter);
    window.open(`${API_URL}/downloads/admin/export?${params}&token=${encodeURIComponent(token)}`, '_blank');
  };

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

  const singleDownloads = stats?.downloadsByType?.find(d => d._id === 'single')?.count || 0;
  const bulkDownloads   = stats?.downloadsByType?.find(d => d._id === 'bulk')?.count || 0;
  const totalDownloads  = stats?.totalDownloads ?? 0;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Downloads</h1>
          <p className="text-brand-text-tertiary">Track, audit and detect suspicious activity</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {[{id:'stats',label:'Statistics'},{id:'logs',label:'Download Logs'},{id:'alerts',label:'Piracy Alerts'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === t.id ? 'border-accent text-white' : 'border-transparent text-brand-text-tertiary hover:text-white'
            }`}>
            {t.label}
            {t.id === 'alerts' && alerts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* STATS TAB */}
      {activeTab === 'stats' && (
      <div>
        {loading && <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto" /></div>}
        {!loading && !stats && <p className="text-center text-brand-text-tertiary py-12">No statistics available</p>}
        {!loading && stats && (<>
        <div className="flex flex-wrap gap-2 mb-6">
          {['24h','7d','30d','90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white'
              }`}>
              {p==='24h'?'24 Hours':p==='7d'?'7 Days':p==='30d'?'30 Days':'90 Days'}
            </button>
          ))}
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
      </>)}
      </div>)}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLogs(1)}
                placeholder="Search user or file…" className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-brand-text-tertiary focus:outline-none focus:border-accent" />
            </div>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); }}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); }}
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type"
              className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent">
              <option value="" className="text-black bg-white">All types</option>
              <option value="MP3" className="text-black bg-white">MP3</option>
              <option value="ZIP" className="text-black bg-white">ZIP</option>
            </select>
            <button onClick={() => fetchLogs(1)} className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg font-semibold transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold transition-colors">
              <FileDown className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
            {logsLoading ? (
              <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-4 border-accent border-t-transparent rounded-full mx-auto" /></div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-brand-text-tertiary">
                    {['Date/Time','User','Email','File','Type','Section','Plan','IP','Browser','OS','Device'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(d => (
                    <tr key={d._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{new Date(d.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white font-medium">{d.userName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-secondary">{d.email}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-brand-text-secondary" title={d.fileName}>{d.fileName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.fileType === 'ZIP' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>{d.fileType}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{d.section}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{d.planId}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary font-mono">{d.ipAddress}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{d.deviceBrowser}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{d.deviceOS}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-brand-text-tertiary">{d.deviceName}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-12 text-brand-text-tertiary">No downloads found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {logsPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-brand-text-tertiary">{logsTotal} total records</p>
              <div className="flex gap-2">
                <button disabled={logsPage <= 1} onClick={() => { setLogsPage(p => p - 1); fetchLogs(logsPage - 1); }}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 transition-colors hover:bg-white/10">← Prev</button>
                <span className="px-3 py-1.5 text-xs text-brand-text-tertiary">Page {logsPage} / {logsPages}</span>
                <button disabled={logsPage >= logsPages} onClick={() => { setLogsPage(p => p + 1); fetchLogs(logsPage + 1); }}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 transition-colors hover:bg-white/10">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-brand-text-tertiary">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
            <button onClick={fetchAlerts} className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors">Refresh</button>
          </div>

          {alertsLoading && <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-4 border-accent border-t-transparent rounded-full mx-auto" /></div>}

          {!alertsLoading && alerts.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-white font-semibold">No suspicious activity detected</p>
              <p className="text-brand-text-tertiary text-sm mt-1">All download patterns look normal.</p>
            </div>
          )}

          <div className="space-y-3">
            {alerts.map((a, i) => {
              const colors = { high: 'border-red-500/30 bg-red-500/10', medium: 'border-yellow-500/30 bg-yellow-500/10', low: 'border-blue-500/30 bg-blue-500/10' };
              const textColors = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' };
              const icons = { bulk_spree: FileDown, multi_ip: Wifi, new_sub_mass_download: TrendingUp, unusual_hours: Clock, mass_download: AlertTriangle };
              const Icon = icons[a.type] || AlertTriangle;
              return (
                <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${colors[a.severity]}`}>
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${textColors[a.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{a.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${textColors[a.severity]}`}>{a.severity}</span>
                      <span className="text-[10px] text-brand-text-tertiary">{a.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
