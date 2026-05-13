import { useState, useCallback, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Download, Heart, Music, Archive, Share2, Pause, Check, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'es' ? 'es-ES' : 'en-US';
  const { currentTrackId, isPanelPlaying } = usePlayer();
  const likedTracks = userFavorites;
  const [promptType, setPromptType] = useState(null); // 'signup' | 'subscribe' | null
  const [shareToast, setShareToast] = useState(false);
  const [downloadingTrackId, setDownloadingTrackId] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isWithinPeriod = !!(user?.subscription?.endDate) && new Date(user.subscription.endDate) > new Date();
  const isPremium = isAdmin || (
    user &&
    (user.subscription?.planId || (user.subscription?.plan && user.subscription.plan !== 'free')) &&
    (user.subscription?.status === 'active' ||
     (user.subscription?.status === 'cancelled' && isWithinPeriod) ||
     (user.subscription?.status === 'past_due' && isWithinPeriod))
  );
  const autoPlayTriggered = useRef(false);

  const handlePlayPause = (track) => {
    if (!track || !(track.id || track._id)) return;
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

  const handleDownloadTrack = useCallback((track, e) => {
    e?.stopPropagation();
    if (!requireAuth('download')) return;
    const trackId = track.id || track._id;
    const token = localStorage.getItem('token');
    window.location.href = `${API_URL}/downloads/track/${trackId}/file?token=${encodeURIComponent(token)}`;
  }, [requireAuth]);

  const handleDownloadZip = useCallback(() => {
    if (!album || !requireAuth('downloadZip')) return;
    const albumId = album.id || album._id;
    if (!albumId) return;
    const token = localStorage.getItem('token');
    window.location.href = `${API_URL}/downloads/album/${albumId}/file?token=${encodeURIComponent(token)}`;
  }, [album, requireAuth]);

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

  // Safety check for album prop - must be after all hooks
  if (!album) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div>
        <div className="max-w-[1400px] mx-auto px-4 py-4 md:px-8 md:py-6 lg:py-8">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="mb-4 md:mb-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-elevated/60 hover:bg-dark-elevated text-white/90 hover:text-white transition-all duration-200 hover:scale-105 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            <span className="text-sm font-medium">{t('album.back', 'Back')}</span>
          </button>
          {/* Split Layout Container */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-4 lg:gap-8 animate-in slide-in-from-bottom duration-500">
            
            {/* LEFT: Album Card */}
            <div className="lg:sticky lg:top-6 h-fit">
              <div className="bg-gradient-to-br from-dark-elevated to-dark-surface rounded-2xl overflow-hidden shadow-2xl border border-white/5 animate-in slide-in-from-left duration-500">

                {/* Mobile: horizontal compact card */}
                <div className="flex lg:block">
                  {/* Cover */}
                  <div className="relative group flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 lg:w-full lg:h-[260px] xl:h-[300px]">
                    {album.coverArt ? (
                      <img
                        src={album.coverArt}
                        alt={album.title || album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-surface flex items-center justify-center">
                        <Archive className="w-10 h-10 lg:w-16 lg:h-16 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  {/* Album Info */}
                  <div className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6">
                    <div className="mb-2 lg:mb-4">
                      {album.isNew && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-purple-500 text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                          {t('album.newRelease')}
                        </span>
                      )}
                      <h1 className="text-sm sm:text-base lg:text-2xl font-bold text-white mb-1 leading-tight line-clamp-2 break-words">
                        {album.title || album.name}
                      </h1>
                      <p className="text-xs sm:text-sm lg:text-base text-brand-text-secondary font-medium truncate">
                        {album.artist}
                      </p>
                    </div>

                    {/* Album Stats */}
                    <div className="flex items-center gap-2 text-xs text-brand-text-tertiary mb-3 lg:mb-6">
                      <span>{album.year}</span>
                      <span>•</span>
                      <span>{album.trackCount} {t('album.tracks')}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadZip}
                        disabled={downloadingZip}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 lg:px-4 lg:py-3 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg shadow-accent/30 disabled:opacity-60 disabled:hover:scale-100"
                      >
                        {downloadingZip ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <Archive className="w-3.5 h-3.5 text-white" />
                        )}
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {downloadingZip ? t('album.downloading') : t('album.downloadAll')}
                        </span>
                      </button>
                      <button
                        onClick={handleLikeAlbum}
                        className="px-3 py-2 lg:px-4 lg:py-3 rounded-lg bg-dark-elevated hover:bg-dark-elevated/80 transition-all duration-200 hover:scale-105 group"
                      >
                        <Heart className={`w-3.5 h-3.5 lg:w-4 lg:h-4 transition-colors ${allTracksLiked ? 'text-accent fill-accent' : 'text-white group-hover:text-accent'}`} />
                      </button>
                      <button
                        onClick={handleShare}
                        className="relative px-3 py-2 lg:px-4 lg:py-3 rounded-lg bg-dark-elevated hover:bg-dark-elevated/80 transition-all duration-200 hover:scale-105 group"
                      >
                        <Share2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white group-hover:text-accent transition-colors" />
                        {shareToast && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-semibold whitespace-nowrap shadow-lg animate-in fade-in zoom-in-95 duration-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {t('album.linkCopied')}
                          </div>
                        )}
                      </button>
                    </div>
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
                    <h2 className="text-xl font-bold text-white">{t('album.tracks')}</h2>
                    <div className="flex items-center gap-2 text-xs text-brand-text-tertiary">
                      <span>{tracks.length} {t('album.tracks')}</span>
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
                      {t('album.loadingTracks')}
                    </div>
                  )}
                  
                  {!isLoading && tracks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-brand-text-tertiary">
                      <Music className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">{t('album.noTracksAvailable')}</p>
                      <p className="text-sm mt-2 opacity-75">{t('album.noTracksDesc')}</p>
                    </div>
                  )}
                  
                  {!isLoading && tracks.map((track, index) => {
                    const isCurrentlyPlaying = currentTrackId === (track.id || track._id) && isPanelPlaying;
                    const trackId = track.id || track._id;
                    const isLiked = likedTracks.has(trackId);

                    return (
                      <div
                        key={trackId}
                        className="group px-3 md:px-5 py-2.5 hover:bg-white/5 transition-all duration-200 animate-in fade-in slide-in-from-right cursor-pointer"
                        style={{ animationDelay: `${index * 30}ms`, animationDuration: '400ms' }}
                        onClick={() => handlePlayPause(track)}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          {/* Track Number / Play Button */}
                          <div className="w-5 md:w-7 flex items-center justify-center flex-shrink-0">
                            {isCurrentlyPlaying ? (
                              <Pause className="w-3.5 h-3.5 text-accent" fill="currentColor" />
                            ) : (
                              <>
                                <span className={`text-xs font-medium text-brand-text-tertiary group-hover:hidden`}>{index + 1}</span>
                                <Play className="w-3.5 h-3.5 text-white hidden group-hover:block" fill="currentColor" />
                              </>
                            )}
                          </div>

                          {/* Track Info — takes all remaining space */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {/* Title + artist stacked */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-xs sm:text-sm font-semibold truncate transition-colors duration-200 ${
                                isCurrentlyPlaying ? 'text-accent' : 'text-white group-hover:text-accent'
                              }`}>
                                {track.title}
                              </h3>
                              <p className="text-[10px] sm:text-xs text-brand-text-tertiary truncate mt-0.5">
                                {track.artist}
                              </p>
                            </div>

                            {/* Tags — progressively hidden on small screens */}
                            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                              <span className="hidden md:inline px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40 whitespace-nowrap">
                                {track.genre}
                              </span>
                              {track.tonality && (
                                <span
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-black border border-black/10 whitespace-nowrap"
                                  style={{ backgroundColor: getTonalityColor(track.tonality) }}
                                >
                                  {track.tonality}
                                </span>
                              )}
                              {track.bpm && (
                                <span className="px-1.5 py-0.5 rounded bg-dark-elevated/50 text-[10px] font-medium text-brand-text-secondary whitespace-nowrap">
                                  {track.bpm}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons — always visible on mobile, hover-only on desktop */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => toggleLike(track, e)}
                              className="p-1 hover:scale-110 transition-transform duration-150"
                              title={isLiked ? t('album.unlike') : t('album.like')}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'text-accent fill-accent' : 'text-white/70 hover:text-white'}`}
                                strokeWidth={2}
                              />
                            </button>
                            <button
                              onClick={(e) => handleDownloadTrack(track, e)}
                              disabled={downloadingTrackId === (track.id || track._id)}
                              className="p-1 hover:scale-110 transition-transform duration-150 disabled:opacity-50"
                              title={t('album.downloadTrack')}
                            >
                              {downloadingTrackId === (track.id || track._id) ? (
                                <svg className="animate-spin w-3.5 h-3.5 text-accent" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 hover:text-white" strokeWidth={2} />
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
          onSubscribe={() => {
            setPromptType(null);
            onSubscribe?.();
          }}
        />
      )}
    </div>
  );
}
