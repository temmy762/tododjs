import { useState, useEffect, useMemo } from 'react';
import { List, Grid3x3, ArrowUpDown, X, Loader, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TrackListView from './TrackListView';
import TrackGridView from './TrackGridView';
import GenericCoverArt from './GenericCoverArt';
import API_URL from '../config/api';


export default function LiveMashUpPage({ onTrackInteraction, userFavorites }) {
  const { t } = useTranslation();
  const [mashups, setMashups] = useState([]);
  const [settings, setSettings] = useState({ videoUrl: '', pageTitle: 'Mash Ups', pageDescription: '' });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [tracksPerPage, setTracksPerPage] = useState(30);

  useEffect(() => {
    fetchMashups();
    fetchSettings();
  }, []);

  const fetchMashups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/mashups`);
      const data = await res.json();
      if (data.success) {
        setMashups(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching mashups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/mashups/settings`);
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch {}
  };

  const extractYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // Map mashups to track-like objects for TrackListView/TrackGridView
  const tracks = useMemo(() => {
    return mashups.map(m => ({
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
    }));
  }, [mashups]);

  const processedTracks = useMemo(() => {
    const sorted = [...tracks].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'bpm':
          return b.bpm - a.bpm;
        case 'dateAdded':
        default:
          return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
    });
    return sorted;
  }, [tracks, sortBy]);

  const totalPages = Math.ceil(processedTracks.length / tracksPerPage);
  const startIndex = (currentPage - 1) * tracksPerPage;
  const currentTracks = processedTracks.slice(startIndex, startIndex + tracksPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleTracksPerPageChange = (count) => {
    setTracksPerPage(Number(count));
    setCurrentPage(1);
  };

  // Override play to use mashup playback endpoint
  const handleMashupInteraction = (action, track) => {
    if (action === 'play') {
      // Fetch mashup playback URL and pass to parent
      fetch(`${API}/mashups/${track.id || track._id}/playback`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.url) {
            onTrackInteraction?.('play', { ...track, playbackUrl: data.data.url });
          }
        })
        .catch(err => console.error('Mashup playback error:', err));
      return;
    }
    onTrackInteraction?.(action, track);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const embedUrl = extractYouTubeEmbedUrl(settings.videoUrl);

  return (
    <div className="min-h-screen">
      {/* Hero Video Section */}
      {embedUrl && (
        <div className="relative w-full py-4 px-4 md:px-10 bg-gradient-to-b from-black/50 to-dark-bg">
          <div className="max-w-4xl mx-auto">
            <div className="relative w-full aspect-video max-h-[350px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src={embedUrl}
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 md:px-10 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white">{settings.pageTitle || t('admin.mashups')}</h1>
            <p className="text-[10px] md:text-sm text-brand-text-tertiary mt-1">
              {settings.pageDescription || `${processedTracks.length} ${t('admin.mashups').toLowerCase()} ${t('common.available') || 'available'}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-dark-elevated/80'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-dark-elevated text-brand-text-tertiary hover:text-white hover:bg-dark-elevated/80'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-text-tertiary" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
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

      {/* Track List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : processedTracks.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-brand-text-tertiary mx-auto mb-4" />
          <p className="text-lg text-brand-text-tertiary font-medium">No mashups available yet</p>
          <p className="text-sm text-brand-text-tertiary/50 mt-1">Check back soon for fresh drops</p>
        </div>
      ) : viewMode === 'list' ? (
        <TrackListView 
          tracks={currentTracks}
          onTrackInteraction={handleMashupInteraction}
          userFavorites={userFavorites}
        />
      ) : (
        <TrackGridView 
          tracks={currentTracks}
          onTrackInteraction={handleMashupInteraction}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-10 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 shadow-lg">
              <span className="text-sm font-medium text-brand-text-secondary whitespace-nowrap">Songs per page:</span>
              <select
                value={tracksPerPage}
                onChange={(e) => handleTracksPerPageChange(e.target.value)}
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
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  currentPage === 1
                    ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed'
                    : 'bg-white/[0.05] text-white hover:bg-white/[0.08] hover:scale-105 border border-white/10 shadow-lg'
                }`}
              >
                Previous
              </button>

              <div className="flex items-center gap-2 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                {renderPageNumbers().map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-brand-text-tertiary font-bold">...</span>
                    );
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[36px] h-9 rounded-lg font-bold text-sm transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-accent text-white shadow-lg shadow-accent/40 scale-105'
                          : 'bg-transparent text-brand-text-secondary hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  currentPage === totalPages
                    ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed'
                    : 'bg-white/[0.05] text-white hover:bg-white/[0.08] hover:scale-105 border border-white/10 shadow-lg'
                }`}
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
