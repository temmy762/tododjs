import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Download, Heart, Clock, Music, X, Loader, Archive, Share2, Pause, Check } from 'lucide-react';
import GenericCoverArt from './GenericCoverArt';
import PremiumPrompt from './PremiumPrompt';
import API_URL from '../config/api';

const getTonalityColor = (tonality) => {
  const colors = {
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
  return colors[tonality] || '#FFFFFF';
};

export default function AlbumDetailView({ album, tracks = [], isLoading = false, autoPlay = false, onClose, onTrackInteraction, userFavorites = new Set(), user, onAuthRequired, onSubscribe }) {
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const likedTracks = userFavorites;
  const [promptType, setPromptType] = useState(null); // 'signup' | 'subscribe' | null
  const [shareToast, setShareToast] = useState(false);
  const [downloadingTrackId, setDownloadingTrackId] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isPremium = isAdmin || (user && user.subscription?.plan && user.subscription.plan !== 'free');
  const autoPlayTriggered = useRef(false);

  const handlePlayPause = (track) => {
    if (!track || !track.id) return;
    if (playingTrackId === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setPlayingTrackId(track.id);
      setIsPlaying(true);
    }
    onTrackInteraction?.('play', track);
  };

  // Auto-play first track when tracks load and autoPlay is enabled
  useEffect(() => {
    if (autoPlay && !autoPlayTriggered.current && !isLoading && tracks.length > 0) {
      autoPlayTriggered.current = true;
      handlePlayPause(tracks[0]);
    }
  }, [autoPlay, isLoading, tracks]);

  const requireAuth = useCallback((action) => {
    if (!user) {
      setPromptType('signup');
      return false;
    }
    if (!isPremium && (action === 'download' || action === 'downloadZip')) {
      setPromptType('subscribe');
      return false;
    }
    return true;
  }, [user, isPremium]);

  const handleDownloadTrack = useCallback(async (track, e) => {
    e?.stopPropagation();
    if (!requireAuth('download')) return;

    const trackId = track.id || track._id;
    setDownloadingTrackId(trackId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/downloads/track/${trackId}/file`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Download failed');
      }
      if (data?.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingTrackId(null);
    }
  }, [requireAuth]);

  const handleDownloadZip = useCallback(async () => {
    if (!album || !requireAuth('downloadZip')) return;
    setDownloadingZip(true);
    try {
      const token = localStorage.getItem('token');
      const albumId = album.id || album._id;
      if (!albumId) throw new Error('Album id is missing');
      const res = await fetch(`${API_URL}/downloads/album/${albumId}/file`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'ZIP download failed');
      }
      // If backend returns a signed URL, open it directly for fast download
      if (data?.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
    } catch (err) {
      console.error('ZIP download failed:', err);
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingZip(false);
    }
  }, [album, requireAuth, tracks]);

  const toggleLike = useCallback((track, e) => {
    e?.stopPropagation();
    if (!user) {
      setPromptType('signup');
      return;
    }
    onTrackInteraction?.('favorite', track);
  }, [user, onTrackInteraction]);

  const allTracksLiked = tracks.length > 0 && tracks.every(t => likedTracks.has(t.id || t._id));

  const handleLikeAlbum = useCallback(() => {
    if (!user) {
      setPromptType('signup');
      return;
    }
    // Toggle favorite on all tracks that aren't already in the desired state
    tracks.forEach(track => {
      const trackId = track.id || track._id;
      const isLiked = likedTracks.has(trackId);
      // If all are liked, unlike all; otherwise, like the ones that aren't liked yet
      if (allTracksLiked || !isLiked) {
        onTrackInteraction?.('favorite', track);
      }
    });
  }, [user, tracks, likedTracks, allTracksLiked, onTrackInteraction]);

  const handleShare = useCallback(() => {
    if (!album) return;
    const url = window.location.href;
    const text = `Check out "${album.title}" by ${album.artist}`;
    if (navigator.share) {
      navigator.share({ title: album.title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }).catch(() => {});
    }
  }, [album]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handlePlayPause(tracks[0]);
    }
  };

  // Safety check for album prop - must be after all hooks
  if (!album) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg animate-in fade-in duration-300">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 md:top-6 md:right-6 z-50 w-9 h-9 md:w-10 md:h-10 rounded-full bg-dark-elevated/80 backdrop-blur-md hover:bg-dark-elevated hover:scale-110 flex items-center justify-center transition-all duration-200 text-white shadow-lg"
      >
        <X className="w-5 h-5" strokeWidth={2} />
      </button>

      <div className="h-full overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 py-4 md:px-10 md:py-8">
          {/* Split Layout Container */}
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 animate-in slide-in-from-bottom duration-500">
            
            {/* LEFT: Album Card */}
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="bg-gradient-to-br from-dark-elevated to-dark-surface rounded-2xl overflow-hidden shadow-2xl border border-white/5 animate-in slide-in-from-left duration-500">
                {/* Album Cover - Reduced Height */}
                <div className="relative group h-[200px] md:h-[320px]">
                  {album.coverArt ? (
                    <img
                      src={album.coverArt}
                      alt={album.title || album.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-dark-surface flex items-center justify-center">
                      <Archive className="w-16 h-16 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  
                  {/* Animated Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Album Info */}
                <div className="p-4 md:p-6">
                  <div className="mb-3 md:mb-4">
                    {album.isNew && (
                      <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-accent to-purple-500 text-xs font-bold text-white uppercase tracking-wider mb-3">
                        New Release
                      </span>
                    )}
                    <h1 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2 leading-tight">
                      {album.title || album.name}
                    </h1>
                    <p className="text-sm md:text-lg text-brand-text-secondary font-medium">
                      {album.artist}
                    </p>
                  </div>

                  {/* Album Stats */}
                  <div className="flex items-center gap-4 text-sm text-brand-text-tertiary mb-6">
                    <span>{album.year}</span>
                    <span>•</span>
                    <span>{album.trackCount} tracks</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadZip}
                      disabled={downloadingZip}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg shadow-accent/30 disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {downloadingZip ? (
                        <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Archive className="w-4 h-4 text-white" />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {downloadingZip ? 'Downloading...' : 'Download All'}
                      </span>
                    </button>
                    <button
                      onClick={handleLikeAlbum}
                      className="px-4 py-3 rounded-lg bg-dark-elevated hover:bg-dark-elevated/80 transition-all duration-200 hover:scale-105 group"
                    >
                      <Heart className={`w-4 h-4 transition-colors ${allTracksLiked ? 'text-accent fill-accent' : 'text-white group-hover:text-accent'}`} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="relative px-4 py-3 rounded-lg bg-dark-elevated hover:bg-dark-elevated/80 transition-all duration-200 hover:scale-105 group"
                    >
                      <Share2 className="w-4 h-4 text-white group-hover:text-accent transition-colors" />
                      {shareToast && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-semibold whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Link copied!
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Track List */}
            <div className="animate-in slide-in-from-right duration-500" style={{ animationDelay: '100ms' }}>
              <div className="bg-gradient-to-br from-dark-surface/40 to-dark-elevated/30 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
                {/* Track List Header with Gradient */}
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5 bg-gradient-to-r from-dark-elevated/80 to-dark-surface/80 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Tracks</h2>
                    <div className="flex items-center gap-2 text-xs text-brand-text-tertiary">
                      <span>{tracks.length} tracks</span>
                    </div>
                  </div>
                </div>

                {/* Compact Track List */}
                <div className="divide-y divide-white/5">
                  {isLoading && (
                    <div className="flex items-center justify-center py-16 text-brand-text-tertiary">
                      <svg className="animate-spin h-5 w-5 mr-3 text-accent" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading tracks...
                    </div>
                  )}
                  
                  {!isLoading && tracks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-brand-text-tertiary">
                      <Music className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No tracks available</p>
                      <p className="text-sm mt-2 opacity-75">This album is being processed or has no tracks yet.</p>
                    </div>
                  )}
                  
                  {!isLoading && tracks.map((track, index) => {
                    const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
                    const isLiked = likedTracks.has(track.id);

                    return (
                      <div
                        key={track.id}
                        className="group px-3 md:px-6 py-2.5 md:py-3 hover:bg-white/5 transition-all duration-200 animate-in fade-in slide-in-from-right"
                        style={{ 
                          animationDelay: `${index * 30}ms`,
                          animationDuration: '400ms'
                        }}
                        onClick={() => handlePlayPause(track)}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          {/* Track Number / Play Button */}
                          <div className="w-6 md:w-8 flex items-center justify-center flex-shrink-0">
                            <span className={`text-sm font-medium ${
                              isCurrentlyPlaying ? 'text-accent' : 'text-brand-text-tertiary group-hover:hidden'
                            }`}>
                              {index + 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayPause(track);
                              }}
                              className="hidden group-hover:flex items-center justify-center"
                            >
                              {isCurrentlyPlaying ? (
                                <Pause className="w-4 h-4 text-accent" fill="currentColor" />
                              ) : (
                                <Play className="w-4 h-4 text-white" fill="currentColor" />
                              )}
                            </button>
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-semibold truncate transition-colors duration-200 ${
                                  isCurrentlyPlaying ? 'text-accent' : 'text-white group-hover:text-accent'
                                }`}>
                                  {track.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-brand-text-tertiary truncate">
                                    {track.artist}
                                  </p>
                                  <span className="text-brand-text-tertiary/40">•</span>
                                  <span className="text-[10px] text-brand-text-tertiary/60 truncate">
                                    {track.pool}
                                  </span>
                                </div>
                              </div>

                              {/* Genre Tag */}
                              <span className="hidden sm:inline px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40">
                                {track.genre}
                              </span>

                              <span
                                className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold text-black border border-black/10"
                                style={{ backgroundColor: getTonalityColor(track.tonality) }}
                              >
                                {track.tonality}
                              </span>

                              {/* BPM */}
                              <span className="px-1.5 sm:px-2 py-0.5 rounded bg-dark-elevated/50 text-[9px] font-medium text-brand-text-secondary">
                                {track.bpm}
                              </span>

                              {/* Date with Year */}
                              <span className="hidden md:inline text-[10px] text-brand-text-tertiary w-20 text-right">
                                {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => toggleLike(track, e)}
                              className="hover:scale-110 transition-transform duration-150"
                              title={isLiked ? 'Unlike' : 'Like'}
                            >
                              <Heart 
                                className={`w-4 h-4 ${isLiked ? 'text-accent fill-accent' : 'text-white/70 hover:text-white'}`}
                                strokeWidth={2}
                              />
                            </button>
                            <button 
                              onClick={(e) => handleDownloadTrack(track, e)}
                              disabled={downloadingTrackId === (track.id || track._id)}
                              className="hover:scale-110 transition-transform duration-150 disabled:opacity-50"
                              title="Download track"
                            >
                              {downloadingTrackId === (track.id || track._id) ? (
                                <svg className="animate-spin w-4 h-4 text-accent" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <Download className="w-4 h-4 text-white/70 hover:text-white" strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium / Signup Prompt */}
      {promptType && (
        <PremiumPrompt
          type={promptType === 'signup' ? 'signup' : 'subscribe'}
          onClose={() => setPromptType(null)}
          onSignUp={() => {
            setPromptType(null);
            onAuthRequired?.();
          }}
          onSubscribe={() => {
            setPromptType(null);
            onSubscribe?.();
          }}
        />
      )}
    </div>
  );
}
