import { useState, useEffect, useCallback } from 'react';
import { List, Grid3x3, SlidersHorizontal, ArrowUpDown, X, Loader } from 'lucide-react';
import TrackListView from './TrackListView';
import TrackGridView from './TrackGridView';

const API = 'http://localhost:5000/api';

const GENRES = ['House', 'Tech House', 'Afro House', 'Amapiano', 'Techno', 'Hip-Hop', 'Jazz', 'Ambient', 'Dubstep', 'Trance', 'EDM'];

const mapTrack = (t) => ({
  id: t._id,
  title: t.title,
  artist: t.artist,
  bpm: t.bpm || 0,
  genre: t.genre || '',
  tonality: t.tonality?.camelot || '',
  dateAdded: t.dateAdded || t.createdAt,
  collection: t.collection || t.genre || '',
  coverArt: t.coverArt || t.albumId?.coverArt || '',
  pool: t.pool || '',
  locked: t.isLocked || false,
  duration: t.audioFile?.duration || 0,
});

export default function LibraryPage({ onTrackInteraction }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTracks, setTotalTracks] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterTonality, setFilterTonality] = useState('all');
  const [tracksPerPage, setTracksPerPage] = useState(30);

  const tonalitiesA = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A'];
  const tonalitiesB = ['1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'];

  const tonalityColorMap = {
    '1A': '#63E6E2',
    '2A': '#86F0B0',
    '3A': '#B7F36A',
    '4A': '#FFE066',
    '5A': '#FFB86B',
    '6A': '#FF8B7A',
    '7A': '#FF7CB7',
    '8A': '#E8A7FF',
    '9A': '#C9B6FF',
    '10A': '#A7C8FF',
    '11A': '#8EE1FF',
    '12A': '#6DF3D0',
    '1B': '#27D8D3',
    '2B': '#34D27A',
    '3B': '#8CD317',
    '4B': '#FFC107',
    '5B': '#FF9B4A',
    '6B': '#FF6B6B',
    '7B': '#FF4DA6',
    '8B': '#C86BFA',
    '9B': '#9B7CFF',
    '10B': '#6B8CFF',
    '11B': '#4DD8FF',
    '12B': '#13D6B2',
  };

  const sortMap = {
    dateAdded: '-dateAdded',
    title: 'title',
    artist: 'artist',
    bpm: '-bpm',
  };

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: tracksPerPage,
        sort: sortMap[sortBy] || '-dateAdded',
      });
      if (filterGenre !== 'all') params.set('genre', filterGenre);
      if (filterTonality !== 'all') params.set('tonality', filterTonality);

      const res = await fetch(`${API}/tracks/browse?${params}`);
      if (!res.ok) { console.error('Library fetch error:', res.status); return; }
      const json = await res.json();
      if (json.success) {
        setTracks(json.data.map(mapTrack));
        setTotalPages(json.pagination.pages || 1);
        setTotalTracks(json.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch library tracks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, tracksPerPage, sortBy, filterGenre, filterTonality]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (genre) => {
    setFilterGenre(genre);
    setCurrentPage(1);
  };

  const handleTonalityChange = (tonality) => {
    setFilterTonality(prev => (prev === tonality ? 'all' : tonality));
    setCurrentPage(1);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleTracksPerPageChange = (count) => {
    setTracksPerPage(Number(count));
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
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

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 md:px-10 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-white">Your Library</h1>
            <p className="text-[10px] md:text-xs text-brand-text-tertiary mt-0.5">
              {totalTracks.toLocaleString()} tracks • Page {currentPage} of {totalPages}
            </p>
          </div>
          
          {/* View Toggle and Reset */}
          <div className="flex items-center gap-2">
            {filterTonality !== 'all' && (
              <button
                onClick={() => {
                  setFilterTonality('all');
                  setCurrentPage(1);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 hover:border-accent/50 transition-all duration-200 shadow-lg shadow-accent/10"
              >
                <X className="w-4 h-4" />
                <span className="text-xs font-semibold">Reset Tonality</span>
              </button>
            )}
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
        
        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Genre Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-text-tertiary" />
            <select
              value={filterGenre}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="bg-dark-elevated text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 focus:border-accent focus:outline-none transition-all duration-200 cursor-pointer hover:bg-dark-elevated/80"
            >
              <option value="all">All Genres</option>
              {GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          {/* Sort Options */}
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

      <div className="px-4 md:px-10 pt-4 md:pt-5 pb-2">
        <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 p-4 sm:p-5">
          <div className="text-sm font-semibold text-white/80 mb-3">Elige la tonalidad:</div>

          <div className="overflow-x-auto scrollbar-hidden">
            <div className="flex gap-2 min-w-max">
              {[...tonalitiesA, ...tonalitiesB].map((tonality) => {
                const isActive = filterTonality === tonality;
                return (
                  <button
                    key={tonality}
                    type="button"
                    onClick={() => handleTonalityChange(tonality)}
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-xs font-extrabold text-black border transition-all duration-150 flex-shrink-0 ${
                      isActive
                        ? 'border-white/80 ring-2 ring-white/60 scale-[1.02]'
                        : 'border-black/10 hover:brightness-105 hover:scale-[1.02]'
                    }`}
                    style={{ backgroundColor: tonalityColorMap[tonality] }}
                  >
                    {tonality}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-white font-semibold mb-2">No tracks found</p>
          <p className="text-sm text-brand-text-tertiary">Try adjusting your filters or check back later</p>
        </div>
      ) : viewMode === 'list' ? (
        <TrackListView 
          tracks={tracks}
          onTrackInteraction={onTrackInteraction}
        />
      ) : (
        <TrackGridView 
          tracks={tracks}
          onTrackInteraction={onTrackInteraction}
        />
      )}

      {!loading && tracks.length > 0 && (
        <div className="px-4 md:px-10 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-6xl mx-auto">
            {/* Songs per page selector */}
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

            {/* Pagination controls */}
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
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-brand-text-tertiary font-bold"
                      >
                        ...
                      </span>
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
