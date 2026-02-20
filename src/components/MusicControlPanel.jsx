import { X, Pause, Play, Info, Volume2, VolumeX, SkipBack, SkipForward, Music } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PremiumPrompt from './PremiumPrompt';
import API_URL from '../config/api';

const PREVIEW_LIMIT_SECONDS = 30;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildWaveform = (seed) => {
  const barCount = 140;
  const numSeed = typeof seed === 'number' ? seed : hashString(String(seed));
  const bars = new Array(barCount).fill(0).map((_, i) => {
    const a = Math.sin((i + 1) * 0.35 + numSeed * 0.8);
    const b = Math.cos((i + 1) * 0.18 + numSeed * 1.7);
    const c = Math.sin((i + 1) * 0.07 + numSeed * 0.3);
    const v = Math.abs(a * 0.5 + b * 0.3 + c * 0.2);
    const h = 4 + Math.round(v * 28);
    return h;
  });
  return bars;
};

const getTonalityColor = (tonality) => {
  const colors = {
    '1A': '#63E6E2', '2A': '#86F0B0', '3A': '#B7F36A', '4A': '#FFE066',
    '5A': '#FFB86B', '6A': '#FF8B7A', '7A': '#FF7CB7', '8A': '#E8A7FF',
    '9A': '#C9B6FF', '10A': '#A7C8FF', '11A': '#8EE1FF', '12A': '#6DF3D0',
    '1B': '#27D8D3', '2B': '#34D27A', '3B': '#8CD317', '4B': '#FFC107',
    '5B': '#FF9B4A', '6B': '#FF6B6B', '7B': '#FF4DA6', '8B': '#C86BFA',
    '9B': '#9B7CFF', '10B': '#6B8CFF', '11B': '#4DD8FF', '12B': '#13D6B2',
  };
  return colors[tonality] || null;
};

export default function MusicControlPanel({
  track,
  isPlaying,
  progress,
  onPlayPause,
  onProgressChange,
  onClose,
  onSubscribe,
  onAuthRequired,
  user,
}) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const [previewLimitHit, setPreviewLimitHit] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const audioRef = useRef(null);
  const infoButtonRef = useRef(null);
  const infoPopoverRef = useRef(null);
  const lastTrackIdRef = useRef(null);
  const volumeTimeoutRef = useRef(null);

  const isPremium = user && user.subscription?.plan && user.subscription.plan !== 'free';

  const totalSeconds = audioDuration || track?.duration || 0;

  const waveform = useMemo(() => {
    const seed = track?.id || track?._id || '1';
    return buildWaveform(seed);
  }, [track?.id, track?._id]);

  // Fetch signed playback URL when track changes
  useEffect(() => {
    const trackId = track?.id || track?._id;
    if (!trackId || trackId === lastTrackIdRef.current) return;
    lastTrackIdRef.current = trackId;

    setPreviewLimitHit(false);

    const fetchPlaybackUrl = async () => {
      setAudioLoading(true);
      try {
        const res = await fetch(`${API_URL}/tracks/${trackId}/playback`);
        const data = await res.json();
        if (data.success && data.data?.url) {
          setAudioUrl(data.data.url);
        } else {
          setAudioUrl(null);
        }
      } catch (err) {
        console.error('Error fetching playback URL:', err);
        setAudioUrl(null);
      } finally {
        setAudioLoading(false);
      }
    };

    fetchPlaybackUrl();
  }, [track?.id, track?._id]);

  // Control audio play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.play().catch(err => console.log('Playback blocked:', err.message));
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  // Sync audio time → progress + enforce preview limit
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isScrubbing) return;
    setAudioCurrentTime(audio.currentTime);

    // Enforce preview limit for non-premium users
    if (!isPremium && audio.currentTime >= PREVIEW_LIMIT_SECONDS && !previewLimitHit) {
      audio.pause();
      setPreviewLimitHit(true);
      setShowPrompt(true);
      onPlayPause?.(); // sync parent isPlaying state
      return;
    }

    if (audio.duration) {
      onProgressChange?.((audio.currentTime / audio.duration) * 100);
    }
  }, [isScrubbing, onProgressChange, isPremium, previewLimitHit, onPlayPause]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setAudioDuration(audio.duration);
  }, []);

  const handleAudioEnded = useCallback(() => {
    onProgressChange?.(100);
    onPlayPause?.();
  }, [onProgressChange, onPlayPause]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
    }
  }, []);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  }, []);

  useEffect(() => {
    if (!isInfoOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsInfoOpen(false);
    };

    const onPointerDown = (e) => {
      const inButton = infoButtonRef.current?.contains(e.target);
      const inPopover = infoPopoverRef.current?.contains(e.target);
      if (!inButton && !inPopover) setIsInfoOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isInfoOpen]);

  if (!track) return null;

  const setProgressFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const pct = (x / rect.width) * 100;
    onProgressChange?.(pct);
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (pct / 100) * audio.duration;
    }
  };

  const activeBars = Math.round((progress / 100) * waveform.length);
  const tonalityColor = getTonalityColor(track.tonality);

  const handleVolumeHover = (enter) => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    if (enter) {
      setShowVolume(true);
    } else {
      volumeTimeoutRef.current = setTimeout(() => setShowVolume(false), 400);
    }
  };

  const coverArtJsx = (
    <div className="relative group/cover flex-shrink-0">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-dark-elevated shadow-lg shadow-black/30 ring-1 ring-white/10">
        {track.coverArt ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div
          className="w-full h-full items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10"
          style={{ display: track.coverArt ? 'none' : 'flex' }}
        >
          <Music className="w-5 h-5 text-accent/70" />
        </div>
      </div>
      {isPlaying && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-end gap-[2px]">
          <div className="w-[3px] h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-[3px] h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-[3px] h-1.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );

  const renderWaveform = (waveData, barCount, progressPct) => {
    const active = Math.round((progressPct / 100) * barCount);
    return (
      <div
        className="relative h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden cursor-pointer select-none group/wave"
        onPointerDown={(e) => {
          e.preventDefault();
          setIsScrubbing(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          setProgressFromEvent(e);
        }}
        onPointerMove={(e) => { if (isScrubbing) setProgressFromEvent(e); }}
        onPointerUp={(e) => {
          setIsScrubbing(false);
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
        }}
        onPointerCancel={() => setIsScrubbing(false)}
        onClick={(e) => setProgressFromEvent(e)}
      >
        <div className="absolute inset-0 flex items-end gap-[1px] px-2 py-1.5">
          {waveData.slice(0, barCount).map((h, i) => {
            const isActive = i < active;
            return (
              <div
                key={i}
                className="rounded-full transition-colors duration-100"
                style={{
                  width: '2px',
                  height: `${h}px`,
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.15)',
                }}
              />
            );
          })}
        </div>
        {/* Glow under played portion */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-accent to-accent/50 transition-all duration-100"
          style={{ width: `${progressPct}%` }}
        />
        {/* Scrub head */}
        <div
          className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-black/40 ring-2 ring-accent/50 opacity-0 group-hover/wave:opacity-100 transition-opacity duration-150"
          style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
    );
  };

  return (
    <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-[45]">
      {/* Gradient top edge */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="bg-dark-surface/[0.97] backdrop-blur-2xl shadow-2xl shadow-black/50">
        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
          />
        )}

        <div className="w-full px-3 sm:px-6">
          <div className="mx-auto w-full max-w-[1400px] py-2.5">

            {/* ── Desktop layout ── */}
            <div className="hidden sm:flex items-center gap-4">

              {/* Left: Cover + Track Info */}
              <div className="flex items-center gap-3 w-[280px] min-w-0 flex-shrink-0">
                {coverArtJsx}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate leading-tight">{track.title}</div>
                  <div className="text-[11px] text-brand-text-tertiary truncate leading-tight mt-0.5">{track.artist}</div>
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {track.genre && (
                      <span className="px-1.5 py-[1px] rounded text-[8px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/20">
                        {track.genre}
                      </span>
                    )}
                    {track.tonality && tonalityColor && (
                      <span
                        className="px-1.5 py-[1px] rounded text-[8px] font-extrabold text-black border border-black/10"
                        style={{ backgroundColor: tonalityColor }}
                      >
                        {track.tonality}
                      </span>
                    )}
                    {track.bpm > 0 && (
                      <span className="px-1.5 py-[1px] rounded text-[8px] font-semibold text-white/60 bg-white/[0.06] border border-white/[0.06]">
                        {track.bpm}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Controls + Waveform */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Transport controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={skipBack}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-150"
                    title="Back 10s"
                  >
                    <SkipBack className="w-3.5 h-3.5" fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={onPlayPause}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-white/10 hover:shadow-xl hover:shadow-white/20 hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-black" fill="black" strokeWidth={0} />
                    ) : (
                      <Play className="w-5 h-5 text-black ml-0.5" fill="black" strokeWidth={0} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={skipForward}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-150"
                    title="Forward 10s"
                  >
                    <SkipForward className="w-3.5 h-3.5" fill="currentColor" />
                  </button>
                </div>

                {/* Time + Waveform */}
                <span className="text-[10px] font-mono text-brand-text-tertiary w-9 text-right flex-shrink-0 tabular-nums">
                  {formatTime(audioCurrentTime)}
                </span>

                <div className="relative flex-1 min-w-0">
                  {isInfoOpen && (
                    <div className="absolute bottom-full right-0 mb-2 hidden lg:block" ref={infoPopoverRef}>
                      <div className="px-3 py-1.5 rounded-lg bg-dark-elevated border border-white/10 text-[10px] text-brand-text-secondary whitespace-nowrap shadow-xl shadow-black/40">
                        Pre-escucha a baja calidad de audio. La descarga se realiza con el 100% de calidad.
                      </div>
                    </div>
                  )}
                  {renderWaveform(waveform, waveform.length, progress)}
                </div>

                <span className="text-[10px] font-mono text-brand-text-tertiary w-9 flex-shrink-0 tabular-nums">
                  {formatTime(totalSeconds)}
                </span>
              </div>

              {/* Right: Volume + Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 w-[200px] justify-end">
                {/* Volume control */}
                <div
                  className="relative flex items-center gap-1.5"
                  onMouseEnter={() => handleVolumeHover(true)}
                  onMouseLeave={() => handleVolumeHover(false)}
                >
                  <button
                    type="button"
                    onClick={() => setMuted(m => !m)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all duration-150"
                  >
                    {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${showVolume ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        if (muted) setMuted(false);
                      }}
                      className="w-full h-1 accent-accent cursor-pointer appearance-none bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                </div>

                <button
                  ref={infoButtonRef}
                  type="button"
                  onClick={() => setIsInfoOpen((v) => !v)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-all duration-150"
                >
                  <Info className="w-3.5 h-3.5" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 bg-white/[0.04] hover:text-white hover:bg-white/10 transition-all duration-150"
                  title="Close player"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>

                <button
                  type="button"
                  onClick={onSubscribe}
                  className="ml-1 px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover transition-all duration-200 text-white text-[11px] font-bold shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:scale-105 active:scale-95"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* ── Mobile layout ── */}
            <div className="sm:hidden space-y-2.5">
              <div className="flex items-center gap-3">
                {coverArtJsx}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{track.title}</div>
                  <div className="text-[10px] text-brand-text-tertiary truncate">{track.artist}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {track.genre && (
                      <span className="px-1.5 py-[1px] rounded text-[8px] font-bold uppercase bg-accent/20 text-accent border border-accent/20">
                        {track.genre}
                      </span>
                    )}
                    {track.bpm > 0 && (
                      <span className="text-[9px] text-white/50">{track.bpm} BPM</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={onPlayPause}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/10"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-black" fill="black" strokeWidth={0} />
                    ) : (
                      <Play className="w-5 h-5 text-black ml-0.5" fill="black" strokeWidth={0} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-brand-text-tertiary w-7 text-right tabular-nums">{formatTime(audioCurrentTime)}</span>
                {renderWaveform(waveform, 80, progress)}
                <span className="text-[9px] font-mono text-brand-text-tertiary w-7 tabular-nums">{formatTime(totalSeconds)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Preview limit indicator for non-premium */}
      {!isPremium && previewLimitHit && !showPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-[45] flex items-center justify-center py-1.5 bg-gradient-to-r from-accent/90 to-purple-500/90 backdrop-blur-sm">
          <span className="text-[11px] font-semibold text-white mr-3">Preview ended</span>
          <button
            onClick={() => setShowPrompt(true)}
            className="px-3 py-1 rounded-full bg-white text-black text-[11px] font-bold hover:bg-white/90 transition-all"
          >
            Go Premium
          </button>
        </div>
      )}

      {/* Premium / Signup Prompt */}
      {showPrompt && (
        <PremiumPrompt
          type={user ? 'subscribe' : 'signup'}
          onClose={() => setShowPrompt(false)}
          onSignUp={() => {
            setShowPrompt(false);
            onAuthRequired?.();
          }}
          onSubscribe={() => {
            setShowPrompt(false);
            onSubscribe?.();
          }}
        />
      )}
    </div>
  );
}
