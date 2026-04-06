import { useState, useEffect, useCallback } from 'react';
import { List, Grid3x3, ArrowUpDown, X, Loader, Music, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TrackListView from './TrackListView';
import TrackGridView from './TrackGridView';
import API_URL from '../config/api';

// Standalone Camelot colour map — independent from Library
const CAMELOT_COLORS = {
  '1A': '#63E6E2', '2A': '#86F0B0', '3A': '#B7F36A', '4A': '#FFE066',
  '5A': '#FFB86B', '6A': '#FF8B7A', '7A': '#FF7CB7', '8A': '#E8A7FF',
  '9A': '#C9B6FF', '10A': '#A7C8FF', '11A': '#8EE1FF', '12A': '#6DF3D0',
  '1B': '#27D8D3', '2B': '#34D27A', '3B': '#8CD317', '4B': '#FFC107',
  '5B': '#FF9B4A', '6B': '#FF6B6B', '7B': '#FF4DA6', '8B': '#C86BFA',
  '9B': '#9B7CFF', '10B': '#6B8CFF', '11B': '#4DD8FF', '12B': '#13D6B2',
};
const CAMELOT_KEYS = [
  '1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A','12A',
  '1B','2B','3B','4B','5B','6B','7B','8B','9B','10B','11B','12B',
];

const SORT_MAP = {
  dateAdded: '-createdAt',
  title: 'title',
  artist: 'artist',
  bpm: '-bpm',
};

function mapMashup(m) {
  return {
    id: m._id,
    _id: m._id,
    title: m.title,
    artist: m.artist,
    genre: m.genre || 'Mashup',
    bpm: m.bpm || 0,
    tonality: m.tonality || '',
    coverArt: m.coverArt || '',
    dateAdded: m.createdAt,
    pool: '',
    collection: m.genre || 'Mashup',
    downloads: m.downloads || 0,
    likes: m.likes || 0,
    source: 'mashup',
  };
}

export default function LiveMashUpPage({ onTrackInteraction, userFavorites }) {
  const { t } = useTranslation();

  // ── data state ──────────────────────────────────────────────
  const [tracks, setTracks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [settings, setSettings] = useState({ bannerImageUrl: '', pageTitle: 'Live Mashups', pageDescription: '' });
  const [loading, setLoading] = useState(true);
  const [totalTracks, setTotalTracks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── standalone filter state (completely independent) ─────────
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterTonality, setFilterTonality] = useState('all');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [currentPage, setCurrentPage] = useState(1);
  const [tracksPerPage, setTracksPerPage] = useState(30);
  const [viewMode, setViewMode] = useState('list');

  // ── fetch genres once ────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/mashups/genres`)
      .then(r => r.json())
      .then(d => { if (d.success) setGenres(d.data); })
      .catch(() => {});
    fetch(`${API_URL}/mashups/settings`)
      .then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data); })
      .catch(() => {});
  }, []);

  // ── server-side fetch with filters ──────────────────────────
  const fetchMashups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: tracksPerPage,
        sort: SORT_MAP[sortBy] || '-createdAt',
      });
      if (filterGenre !== 'all') params.set('genre', filterGenre);
      if (filterTonality !== 'all') params.set('tonality', filterTonality);

      const res = await fetch(`${API_URL}/mashups?${params}`);
      const data = await res.json();
      if (data.success) {
        setTracks(data.data.map(mapMashup));
        setTotalPages(data.pagination?.pages || 1);
        setTotalTracks(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching mashups:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, tracksPerPage, sortBy, filterGenre, filterTonality]);

  useEffect(() => { fetchMashups(); }, [fetchMashups]);

  // ── handlers ────────────────────────────────────────────────
  const handleGenreChange = (g) => { setFilterGenre(g); setCurrentPage(1); };
  const handleTonalityChange = (key) => {
    setFilterTonality(prev => prev === key ? 'all' : key);
    setCurrentPage(1);
  };
  const handleSortChange = (s) => { setSortBy(s); setCurrentPage(1); };
  const handleTracksPerPageChange = (n) => { setTracksPerPage(Number(n)); setCurrentPage(1); };
  const handlePageChange = (p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleMashupInteraction = (action, track) => {
    if (action === 'play') {
      fetch(`${API_URL}/mashups/${track.id || track._id}/playback`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data?.url) {
            onTrackInteraction?.('play', { ...track, playbackUrl: d.data.url });
          }
        })
        .catch(err => console.error('Mashup playback error:', err));
      return;
    }
    onTrackInteraction?.(action, track);
  };

  const renderPageNumbers = () => {
    const nums = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else if (currentPage <= 3) {
      nums.push(1, 2, 3, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      nums.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
    } else {
      nums.push(1, '...', currentPage, '...', totalPages);
    }
    return nums;
  };

  const hasActiveFilters = filterGenre !== 'all' || filterTonality !== 'all';

  return (
    <div className="min-h-screen">
      {/* Banner */}
      {settings.bannerImageUrl && (
        <div className="relative w-full py-4 px-4 md:px-10 bg-gradient-to-b from-black/50 to-dark-bg">
          <div className="max-w-6xl mx-auto">
            <div className="relative w-full max-h-[350px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              <img
                src={settings.bannerImageUrl}
                alt={settings.pageTitle || 'Mashups'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header + Filters */}
      <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 md:px-10 py-3 md:py-4">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white">{settings.pageTitle || t('admin.mashups')}</h1>
            <p className="text-[10px] md:text-sm text-brand-text-tertiary mt-1">
              {totalTracks.toLocaleString()} {t('admin.mashups').toLowerCase()} &bull; Page {currentPage} of {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterGenre('all'); setFilterTonality('all'); setCurrentPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 text-xs font-semibold transition-all"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-dark-elevated/80'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-dark-elevated/80'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Genre + Sort row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-text-tertiary" />
            <select
              value={filterGenre}
              onChange={e => handleGenreChange(e.target.value)}
              className="bg-dark-elevated text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 focus:border-accent focus:outline-none transition-all duration-200 cursor-pointer hover:bg-dark-elevated/80"
            >
              <option value="all">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-text-tertiary" />
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value)}
              className="bg-dark-elevated text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 focus:border-accent focus:outline-none transition-all duration-200 cursor-pointer hover:bg-dark-elevated/80"
            >
              <option value="dateAdded">Date Added (Newest)</option>
              <option value="title">Title (A-Z)</option>
              <option value="artist">Artist (A-Z)</option>
              <option value="bpm">BPM (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Camelot Key Filter — standalone */}
      <div className="px-4 md:px-10 pt-4 pb-2">
        <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/80">Filter by key:</span>
            {filterTonality !== 'all' && (
              <button
                onClick={() => { setFilterTonality('all'); setCurrentPage(1); }}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-all"
              >
                <X className="w-3 h-3" /> Clear key
              </button>
            )}
          </div>
          <div className="overflow-x-auto scrollbar-hidden">
            <div className="flex gap-2 min-w-max">
              {CAMELOT_KEYS.map(key => {
                const isActive = filterTonality === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTonalityChange(key)}
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-xs font-extrabold text-black border transition-all duration-150 flex-shrink-0 ${
                      isActive
                        ? 'border-white/80 ring-2 ring-white/60 scale-[1.08]'
                        : 'border-black/10 hover:brightness-105 hover:scale-[1.02]'
                    }`}
                    style={{ backgroundColor: CAMELOT_COLORS[key] }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Track List / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-brand-text-tertiary mx-auto mb-4" />
          <p className="text-lg text-brand-text-tertiary font-medium">No mashups found</p>
          <p className="text-sm text-brand-text-tertiary/50 mt-1">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Check back soon for fresh drops'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <TrackListView
          tracks={tracks}
          onTrackInteraction={handleMashupInteraction}
          userFavorites={userFavorites}
        />
      ) : (
        <TrackGridView
          tracks={tracks}
          onTrackInteraction={handleMashupInteraction}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-4 md:px-10 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 shadow-lg">
              <span className="text-sm font-medium text-brand-text-secondary whitespace-nowrap">Per page:</span>
              <select
                value={tracksPerPage}
                onChange={e => handleTracksPerPageChange(e.target.value)}
                className="bg-dark-elevated text-white text-sm font-semibold px-3 py-1.5 rounded-lg border border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none transition-all duration-200 cursor-pointer hover:bg-dark-elevated/80 hover:border-white/30"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${currentPage === 1 ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed' : 'bg-white/[0.05] text-white hover:bg-white/[0.08] hover:scale-105 border border-white/10 shadow-lg'}`}
              >
                Previous
              </button>
              <div className="flex items-center gap-2 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                {renderPageNumbers().map((num, i) =>
                  num === '...' ? (
                    <span key={`e-${i}`} className="px-2 text-brand-text-tertiary font-bold">...</span>
                  ) : (
                    <button
                      key={num}
                      onClick={() => handlePageChange(num)}
                      className={`min-w-[36px] h-9 rounded-lg font-bold text-sm transition-all duration-200 ${currentPage === num ? 'bg-accent text-white shadow-lg shadow-accent/40 scale-105' : 'bg-transparent text-brand-text-secondary hover:bg-white/[0.05] hover:text-white'}`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${currentPage === totalPages ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed' : 'bg-white/[0.05] text-white hover:bg-white/[0.08] hover:scale-105 border border-white/10 shadow-lg'}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
