import { useState, useEffect } from 'react';
import { Download, Music, Disc, Clock, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Uses keys: downloadHistory.title, downloadHistory.noDownloads, downloadHistory.noDownloadsDesc,
// downloadHistory.albumDownload, downloadHistory.unknownTrack
import GenericCoverArt from './GenericCoverArt';
import API_URL from '../config/api';

const API = API_URL;

export default function DownloadHistory({ onTrackInteraction }) {
  const { t } = useTranslation();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/downloads/history?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDownloads(data.data || []);
        setTotalPages(data.pages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching download history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading && downloads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-white">
            {t('downloadHistory.title')}
          </h3>
          <span className="text-xs text-brand-text-tertiary">({total})</span>
        </div>
      </div>

      {/* List */}
      {downloads.length === 0 ? (
        <div className="text-center py-12">
          <Download className="w-10 h-10 text-brand-text-tertiary/30 mx-auto mb-3" />
          <p className="text-sm text-brand-text-tertiary">{t('downloadHistory.noDownloads')}</p>
          <p className="text-xs text-brand-text-tertiary/60 mt-1">{t('downloadHistory.noDownloadsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {downloads.map((dl) => {
            const track = dl.trackId;
            const album = dl.albumId;
            const isAlbum = dl.type === 'bulk' || (!track && album);
            const title = isAlbum ? (album?.name || t('tracks.album')) : (track?.title || t('downloadHistory.unknownTrack'));
            const subtitle = isAlbum ? t('downloadHistory.albumDownload') : (track?.artist || '');
            const coverArt = track?.coverArt || album?.coverArt;

            return (
              <div
                key={dl._id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors group cursor-pointer"
                onClick={() => {
                  if (track && onTrackInteraction) {
                    onTrackInteraction({ type: 'play', track: { id: track._id, title: track.title, artist: track.artist, coverArt: track.coverArt } });
                  }
                }}
              >
                {/* Cover Art */}
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-dark-elevated">
                  {coverArt ? (
                    <img src={coverArt} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <GenericCoverArt title={title} artist={subtitle} size="sm" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{title}</p>
                  <p className="text-xs text-brand-text-tertiary truncate">{subtitle}</p>
                </div>

                {/* Type icon */}
                <div className="flex-shrink-0">
                  {isAlbum ? (
                    <Disc className="w-4 h-4 text-brand-text-tertiary/50" />
                  ) : (
                    <Music className="w-4 h-4 text-brand-text-tertiary/50" />
                  )}
                </div>

                {/* Size */}
                <span className="text-xs text-brand-text-tertiary/60 w-16 text-right flex-shrink-0 hidden sm:block">
                  {formatSize(dl.fileSize)}
                </span>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-brand-text-tertiary/60 w-24 justify-end flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDate(dl.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-brand-text-tertiary">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
