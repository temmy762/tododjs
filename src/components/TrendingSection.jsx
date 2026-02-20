import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Download, Play, Flame, Sparkles } from 'lucide-react';
import GenericCoverArt from './GenericCoverArt';
import API_URL from '../config/api';

const PERIOD_OPTIONS = [
  { value: '24h', label: '24h', labelFull: '24 Hours' },
  { value: '7d', label: '7d', labelFull: '7 Days' },
  { value: '30d', label: '30d', labelFull: '30 Days' },
];

export default function TrendingSection({ onTrackInteraction, activeGenre = 'all' }) {
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [activeTab, setActiveTab] = useState('trending');
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrendingTracks();
  }, [period]);

  useEffect(() => {
    fetchRecentTracks();
  }, []);

  const fetchTrendingTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/downloads/trending?period=${period}&limit=10`);
      
      if (!response.ok) {
        console.error('Trending API error:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setTrendingTracks(data.data || []);
      } else {
        console.error('Trending API returned error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching trending tracks:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTracks = async () => {
    try {
      const response = await fetch(`${API_URL}/downloads/recent?limit=10`);
      
      if (!response.ok) {
        console.error('Recent API error:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setRecentTracks(data.data || []);
      } else {
        console.error('Recent API returned error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching recent tracks:', error.message || error);
    }
  };

  const rawTracks = activeTab === 'trending' ? trendingTracks : recentTracks;

  const displayTracks = activeGenre === 'all'
    ? rawTracks
    : rawTracks.filter(track =>
        (track.genre || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (track.collection || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (track.title || '').toLowerCase().includes(activeGenre.toLowerCase())
      );

  return (
    <div className="px-3 md:px-6 py-5 md:py-8">
      {/* Header */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between mb-5 md:mb-6">
        {/* Tab Switcher */}
        <div className="flex items-center bg-white/[0.04] rounded-xl p-1 border border-white/[0.06] w-fit">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 md:py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === 'trending'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'text-brand-text-tertiary hover:text-white'
            }`}
          >
            <Flame size={15} className={activeTab === 'trending' ? 'text-white' : 'text-brand-text-tertiary'} />
            <span>Trending</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 md:py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === 'recent'
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'text-brand-text-tertiary hover:text-white'
            }`}
          >
            <Sparkles size={15} className={activeTab === 'recent' ? 'text-white' : 'text-brand-text-tertiary'} />
            <span>New Drops</span>
          </button>
        </div>

        {/* Period Chips */}
        {activeTab === 'trending' && (
          <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06] w-fit">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
                  period === p.value
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-brand-text-tertiary hover:text-white'
                }`}
              >
                <span className="md:hidden">{p.label}</span>
                <span className="hidden md:inline">{p.labelFull}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-xl bg-white/[0.06] mb-2.5" />
              <div className="h-3 bg-white/[0.06] rounded-full w-3/4 mb-1.5" />
              <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4">
          {displayTracks.map((track, index) => (
            <TrackCard
              key={track._id}
              track={track}
              rank={activeTab === 'trending' ? index + 1 : null}
              onTrackInteraction={onTrackInteraction}
            />
          ))}
        </div>
      )}

      {displayTracks.length === 0 && !loading && (
        <div className="text-center py-16 md:py-12">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            {activeTab === 'trending' ? (
              <TrendingUp className="w-6 h-6 text-brand-text-tertiary" />
            ) : (
              <Clock className="w-6 h-6 text-brand-text-tertiary" />
            )}
          </div>
          <p className="text-sm text-brand-text-tertiary font-medium">
            {activeTab === 'trending' ? 'No trending tracks yet' : 'No recent uploads yet'}
          </p>
          <p className="text-xs text-brand-text-tertiary/50 mt-1">Check back soon for updates</p>
        </div>
      )}
    </div>
  );
}

function TrackCard({ track, rank, onTrackInteraction }) {
  const rankColors = {
    1: 'from-yellow-500 to-amber-600',
    2: 'from-slate-300 to-slate-400',
    3: 'from-orange-600 to-amber-700',
  };

  return (
    <div
      className="group relative rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
    >
      {/* Cover Art */}
      <div className="relative aspect-square overflow-hidden">
        {rank && (
          <div className={`absolute top-2 left-2 z-10 min-w-[26px] h-[26px] px-1.5 rounded-lg flex items-center justify-center font-bold text-[11px] text-white shadow-lg ${
            rankColors[rank] ? `bg-gradient-to-br ${rankColors[rank]}` : 'bg-white/20 backdrop-blur-md border border-white/10'
          }`}>
            {rank}
          </div>
        )}
        {track.coverArt ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        {!track.coverArt ? (
          <GenericCoverArt title={track.title} artist={track.artist} size="full" className="aspect-square" />
        ) : (
          <div className="absolute inset-0 hidden">
            <GenericCoverArt title={track.title} artist={track.artist} size="full" className="aspect-square" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <button
          onClick={() => onTrackInteraction('play', track)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <div className="w-11 h-11 md:w-12 md:h-12 bg-accent rounded-full flex items-center justify-center shadow-xl shadow-accent/40 transition-transform duration-300 group-hover:scale-100 scale-75">
            <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white ml-0.5" />
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5 md:p-3">
        <h3 className="font-semibold text-[13px] md:text-sm text-white truncate leading-tight">{track.title}</h3>
        <p className="text-[11px] md:text-xs text-brand-text-tertiary truncate mt-0.5">{track.artist}</p>
        
        <div className="flex items-center justify-between mt-2">
          {track.trendingDownloads !== undefined ? (
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-accent font-medium">
              <Download size={11} />
              <span>{track.trendingDownloads}</span>
            </div>
          ) : (
            <span />
          )}

          {track.sourceId && (
            <span className="text-[10px] text-brand-text-tertiary/60 truncate max-w-[60%] text-right">
              {track.sourceId.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
