import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AudioPlayer({ track, isPlaying, onPlayPause, onNext, onPrevious, onClose }) {
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            onNext?.();
            return 0;
          }
          return prev + 0.5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, onNext]);

  const handleProgressChange = (e) => {
    setProgress(Number(e.target.value));
  };

  const handleVolumeChange = (e) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = (progress / 100) * 180;
  const totalTime = 180;

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-surface/98 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/40 animate-in slide-in-from-bottom duration-300">
      <div className="relative h-1 bg-white/5 group cursor-pointer" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setProgress(percentage);
      }}>
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent-hover transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden shadow-lg shadow-black/20">
            <img 
              src={track.coverArt}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {track.title}
            </h4>
            <p className="text-xs text-brand-text-tertiary truncate">
              {track.artist}
            </p>
          </div>

          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
              isLiked 
                ? 'bg-accent hover:bg-accent-hover text-white' 
                : 'bg-white hover:bg-brand-text-secondary text-black'
            }`}
          >
            <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="flex items-center gap-3">
            <button 
              onClick={onPrevious}
              className="w-8 h-8 rounded-lg bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-150 text-black"
            >
              <SkipBack className="w-4 h-4" strokeWidth={2} fill="currentColor" />
            </button>
            
            <button 
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" fill="white" strokeWidth={0} />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" strokeWidth={0} />
              )}
            </button>
            
            <button 
              onClick={onNext}
              className="w-8 h-8 rounded-lg bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-150 text-black"
            >
              <SkipForward className="w-4 h-4" strokeWidth={2} fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-brand-text-tertiary/70 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(totalTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-150 text-black"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" strokeWidth={2} />
              ) : (
                <Volume2 className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
            
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden group cursor-pointer relative" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              handleVolumeChange({ target: { value: percentage } });
            }}>
              <div 
                className="absolute inset-y-0 left-0 bg-white group-hover:bg-accent transition-colors duration-150"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
            </div>
          </div>

          <button 
            className="w-8 h-8 rounded-lg bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-150 text-black"
          >
            <Maximize2 className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
