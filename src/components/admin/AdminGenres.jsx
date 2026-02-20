import { useState, useEffect } from 'react';
import { Loader, Music, Disc, AlertTriangle, CheckCircle, BarChart3, Zap } from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

const CAMELOT_WHEEL = [
  { code: '1A', key: 'Ab minor', color: 'bg-red-500' },
  { code: '1B', key: 'B major', color: 'bg-red-400' },
  { code: '2A', key: 'Eb minor', color: 'bg-orange-500' },
  { code: '2B', key: 'F# major', color: 'bg-orange-400' },
  { code: '3A', key: 'Bb minor', color: 'bg-yellow-500' },
  { code: '3B', key: 'Db major', color: 'bg-yellow-400' },
  { code: '4A', key: 'F minor', color: 'bg-lime-500' },
  { code: '4B', key: 'Ab major', color: 'bg-lime-400' },
  { code: '5A', key: 'C minor', color: 'bg-green-500' },
  { code: '5B', key: 'Eb major', color: 'bg-green-400' },
  { code: '6A', key: 'G minor', color: 'bg-emerald-500' },
  { code: '6B', key: 'Bb major', color: 'bg-emerald-400' },
  { code: '7A', key: 'D minor', color: 'bg-teal-500' },
  { code: '7B', key: 'F major', color: 'bg-teal-400' },
  { code: '8A', key: 'A minor', color: 'bg-cyan-500' },
  { code: '8B', key: 'C major', color: 'bg-cyan-400' },
  { code: '9A', key: 'E minor', color: 'bg-blue-500' },
  { code: '9B', key: 'G major', color: 'bg-blue-400' },
  { code: '10A', key: 'B minor', color: 'bg-indigo-500' },
  { code: '10B', key: 'D major', color: 'bg-indigo-400' },
  { code: '11A', key: 'F# minor', color: 'bg-violet-500' },
  { code: '11B', key: 'A major', color: 'bg-violet-400' },
  { code: '12A', key: 'Db minor', color: 'bg-pink-500' },
  { code: '12B', key: 'E major', color: 'bg-pink-400' },
];

const genreColors = {
  'House': 'from-blue-500 to-cyan-500',
  'Tech House': 'from-purple-500 to-blue-500',
  'Afro House': 'from-orange-500 to-yellow-500',
  'Amapiano': 'from-green-500 to-emerald-500',
  'Techno': 'from-gray-500 to-gray-700',
  'Hip-Hop': 'from-red-500 to-pink-500',
  'Jazz': 'from-amber-500 to-orange-500',
  'Ambient': 'from-teal-500 to-cyan-500',
  'Dubstep': 'from-violet-500 to-purple-500',
  'Trance': 'from-indigo-500 to-blue-500',
  'EDM': 'from-pink-500 to-rose-500',
};

export default function AdminGenres() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/analytics/genres`, { headers: authHeaders() });
        if (!res.ok) { console.error('Genre stats error:', res.status); return; }
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error('Failed to fetch genre stats:', err);
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
        <h2 className="text-3xl font-bold text-white mb-2">DJ Genre Management</h2>
        <p className="text-brand-text-tertiary">Failed to load data. Make sure you're logged in as admin.</p>
      </div>
    );
  }

  const { genreStats, camelotStats, tonalitySourceStats, genreCamelotCross, summary } = data;
  const maxGenreCount = Math.max(...genreStats.map(g => g.count), 1);
  const maxCamelotCount = Math.max(...camelotStats.map(c => c.count), 1);

  const camelotMap = {};
  camelotStats.forEach(c => { camelotMap[c._id] = c.count; });

  const tonalityCoverage = summary.totalTracks > 0
    ? (summary.tracksWithTonality / summary.totalTracks * 100).toFixed(1)
    : 0;

  const sourceLabels = {
    'audio-analysis': 'Audio Analysis',
    'openai': 'OpenAI',
    'id3-tag': 'ID3 Tag',
    'manual': 'Manual',
    'unknown': 'Unknown'
  };

  const sourceColors = {
    'audio-analysis': 'bg-green-500',
    'openai': 'bg-blue-500',
    'id3-tag': 'bg-purple-500',
    'manual': 'bg-orange-500',
    'unknown': 'bg-gray-500'
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">DJ Genre Management</h2>
        <p className="text-brand-text-tertiary">Genre breakdown, Camelot wheel tonalities, and detection stats</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-accent" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Total Tracks</span>
          </div>
          <div className="text-2xl font-bold text-white">{summary.totalTracks.toLocaleString()}</div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Disc className="w-5 h-5 text-accent" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Genres Used</span>
          </div>
          <div className="text-2xl font-bold text-white">{genreStats.length} / {summary.genreEnum.length}</div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Tonality Coverage</span>
          </div>
          <div className="text-2xl font-bold text-white">{tonalityCoverage}%</div>
          <div className="text-xs text-brand-text-tertiary">{summary.tracksWithTonality.toLocaleString()} tracks</div>
        </div>
        <div className="bg-dark-elevated rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-brand-text-tertiary uppercase font-semibold">Needs Review</span>
          </div>
          <div className="text-2xl font-bold text-white">{summary.needsReviewCount.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Genre Breakdown */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Genre Breakdown</h3>
          </div>
          <div className="space-y-3">
            {genreStats.map((g, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${genreColors[g._id] || 'from-gray-500 to-gray-600'}`} />
                    <span className="text-sm text-white font-medium">{g._id || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-brand-text-tertiary">
                    <span>{g.count} tracks</span>
                    <span className="text-white font-medium">{g.avgBpm ? Math.round(g.avgBpm) : '—'} BPM avg</span>
                    {g.minBpm && g.maxBpm && (
                      <span className="hidden group-hover:inline">{g.minBpm}–{g.maxBpm}</span>
                    )}
                  </div>
                </div>
                <div className="w-full h-2.5 bg-dark-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${genreColors[g._id] || 'from-gray-500 to-gray-600'} transition-all`}
                    style={{ width: `${(g.count / maxGenreCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {genreStats.length === 0 && (
              <p className="text-brand-text-tertiary text-center py-8">No tracks yet</p>
            )}
          </div>
        </div>

        {/* Camelot Key Distribution */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Disc className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Camelot Wheel</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CAMELOT_WHEEL.map((item) => {
              const count = camelotMap[item.code] || 0;
              const intensity = maxCamelotCount > 0 ? Math.max(0.15, count / maxCamelotCount) : 0.15;
              return (
                <div
                  key={item.code}
                  className="relative rounded-lg p-2.5 border border-white/5 hover:border-white/20 transition-all group cursor-default"
                  style={{ backgroundColor: `rgba(255,255,255,${intensity * 0.08})` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs font-bold text-white">{item.code}</span>
                  </div>
                  <div className="text-xs text-brand-text-tertiary truncate">{item.key}</div>
                  <div className={`text-sm font-bold mt-1 ${count > 0 ? 'text-white' : 'text-white/20'}`}>{count}</div>
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-dark-surface/95 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">{item.code}</div>
                      <div className="text-xs text-brand-text-tertiary">{item.key}</div>
                      <div className="text-lg font-bold text-accent mt-1">{count} tracks</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Tonality Detection Sources */}
        <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-white">Detection Sources</h3>
          </div>
          <div className="space-y-4">
            {tonalitySourceStats.map((s, i) => {
              const label = sourceLabels[s._id] || s._id || 'None';
              const color = sourceColors[s._id] || 'bg-gray-500';
              const pct = summary.totalTracks > 0 ? (s.count / summary.totalTracks * 100).toFixed(1) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <span className="text-sm text-white font-medium">{label}</span>
                    </div>
                    <span className="text-xs text-brand-text-tertiary">{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {tonalitySourceStats.length === 0 && (
              <p className="text-brand-text-tertiary text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* Top Genre + Key Combos */}
        <div className="lg:col-span-2 bg-dark-elevated rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Top Genre + Key Combinations</h3>
          {genreCamelotCross.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {genreCamelotCross.map((item, i) => (
                <div key={i} className="bg-dark-surface rounded-xl p-3 border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${genreColors[item._id.genre] || 'from-gray-500 to-gray-600'}`} />
                    <span className="text-xs text-white font-medium truncate">{item._id.genre}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-accent">{item._id.camelot}</span>
                    <span className="text-xs text-brand-text-tertiary">{item.count} tracks</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-tertiary text-center py-8">No cross-reference data yet</p>
          )}
        </div>
      </div>

      {/* Available Genres */}
      <div className="bg-dark-elevated rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">Available Genres</h3>
        <div className="flex flex-wrap gap-2">
          {summary.genreEnum.map((genre, i) => {
            const stat = genreStats.find(g => g._id === genre);
            const hasData = stat && stat.count > 0;
            return (
              <div
                key={i}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  hasData
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-dark-surface border-white/10 text-brand-text-tertiary'
                }`}
              >
                {genre}
                {hasData && <span className="ml-2 text-xs opacity-70">({stat.count})</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
