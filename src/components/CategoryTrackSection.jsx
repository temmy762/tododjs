import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, Music, ChevronLeft, ChevronRight, List, Grid3x3 } from 'lucide-react';
import TrackListView from './TrackListView';
import TrackGridView from './TrackGridView';
import API_URL from '../config/api';

const mapTrack = (t) => ({
  id: t._id,
  title: t.title,
  artist: t.artist,
  bpm: t.bpm || 0,
  genre: t.genre || '',
  tonality: t.tonality?.camelot || '',
  dateAdded: t.dateAdded || t.createdAt,
  collection: t.collection || '',
  coverArt: t.coverArt || '',
  pool: t.pool || '',
  locked: t.isLocked || false,
  duration: t.audioFile?.duration || 0,
  source: t.source || 'track',
});

export default function CategoryTrackSection({
  categoryName,
  onTrackInteraction,
  userFavorites = new Set(),
}) {
  const { t } = useTranslation();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTracks, setTotalTracks] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const LIMIT = 30;

  const fetchTracks = useCallback(async () => {
    if (!categoryName) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryName,
        page,
        limit: LIMIT,
        sort: '-dateAdded',
      });
      const res = await fetch(`${API_URL}/tracks/library?${params}`);
      const json = await res.json();
      if (json.success) {
        setTracks(json.data.map(mapTrack));
        setTotalPages(json.pagination?.pages || 1);
        setTotalTracks(json.pagination?.total || 0);
      }
    } catch (err) {
      console.error('CategoryTrackSection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryName, page]);

  useEffect(() => {
    setPage(1);
  }, [categoryName]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="px-4 md:px-10 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">{categoryName}</h2>
          {!loading && (
            <p className="text-xs text-brand-text-tertiary mt-0.5">
              {totalTracks.toLocaleString()} {totalTracks !== 1 ? t('common.tracks') : t('common.track')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'bg-dark-elevated text-brand-text-tertiary hover:text-white'}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-dark-elevated text-brand-text-tertiary hover:text-white'}`}
          >
            <Grid3x3 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader size={36} className="animate-spin text-accent" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Music size={48} className="text-white/10 mb-4" />
          <p className="text-brand-text-tertiary font-medium">{t('category.noTracksIn', { category: categoryName })}</p>
          <p className="text-xs text-brand-text-tertiary/60 mt-1">
            {t('category.autoDesc')}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <TrackListView
          tracks={tracks}
          onTrackInteraction={onTrackInteraction}
          userFavorites={userFavorites}
        />
      ) : (
        <TrackGridView
          tracks={tracks}
          onTrackInteraction={onTrackInteraction}
          userFavorites={userFavorites}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i < 5 ? i + 1 : i === 5 ? '...' : totalPages;
              } else if (page >= totalPages - 3) {
                pageNum = i === 0 ? 1 : i === 1 ? '...' : totalPages - (6 - i);
              } else {
                pageNum = i === 0 ? 1 : i === 1 ? '...' : i === 5 ? '...' : i === 6 ? totalPages : page + (i - 3);
              }
              if (pageNum === '...') {
                return <span key={i} className="px-2 text-white/30 text-sm">…</span>;
              }
              return (
                <button
                  key={i}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
