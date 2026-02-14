import { Play, Download, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function FeaturedSpotlight({ track, onInteraction }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (action) => {
    onInteraction?.(action, track);
  };

  return (
    <div className="relative mb-10 px-10 animate-in fade-in slide-in-from-bottom duration-700">
      <div 
        className="relative overflow-hidden group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative bg-gradient-to-br from-dark-surface/80 via-dark-elevated/60 to-dark-bg/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden transition-all duration-500 group-hover:border-accent/30 shadow-xl shadow-black/20 group-hover:shadow-2xl group-hover:shadow-accent/10">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/3 via-transparent to-accent/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex flex-col md:flex-row gap-6 p-6">
            <div className="relative w-full md:w-64 aspect-square flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-br from-accent/20 to-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-dark-elevated to-dark-surface animate-pulse rounded-2xl" />
                )}
                <img 
                  src={track.coverArt}
                  alt={track.title}
                  onLoad={() => setImageLoaded(true)}
                  className={`w-full h-full object-cover rounded-2xl shadow-2xl transition-all duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } ${isHovered ? 'scale-[1.02] shadow-accent/30' : ''}`}
                />
                
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl transition-opacity duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="absolute inset-0 flex items-center justify-center gap-5">
                    <button 
                      onClick={() => handleClick('play')}
                      className="w-16 h-16 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-all duration-200 shadow-2xl shadow-accent/40 hover:scale-110 transform translate-y-2 group-hover:translate-y-0"
                    >
                      <Play className="w-7 h-7 text-white ml-0.5" fill="white" strokeWidth={0} />
                    </button>
                    <button 
                      onClick={() => handleClick('download')}
                      className="w-16 h-16 rounded-full bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-200 hover:scale-110 transform translate-y-2 group-hover:translate-y-0"
                      style={{ transitionDelay: '50ms' }}
                    >
                      <Download className="w-6 h-6 text-black" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center py-1">
              <div className="inline-flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                  <Sparkles className="w-3 h-3 text-accent" strokeWidth={2} />
                  <span className="text-xs font-semibold text-accent tracking-wider uppercase">Featured</span>
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight leading-tight transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-accent">
                {track.title}
              </h2>

              <p className="text-lg text-brand-text-tertiary mb-4 font-light tracking-wide">
                {track.artist}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-text-tertiary/70 mb-5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-elevated/50 border border-dark-border/50">
                  <Clock className="w-4 h-4" strokeWidth={1.5} />
                  <span className="font-medium">{track.bpm} BPM</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-dark-elevated/50 border border-dark-border/50">
                  <span className="font-medium">{track.collection}</span>
                </div>
                <div className="text-brand-text-tertiary/60">
                  <span>Added {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleClick('play')}
                  className="group/btn relative px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold text-sm transition-all duration-200 shadow-xl shadow-accent/25 hover:shadow-2xl hover:shadow-accent/40 hover:scale-[1.02] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" fill="white" strokeWidth={0} />
                    Play Now
                  </span>
                </button>
                <button 
                  onClick={() => handleClick('download')}
                  className="px-6 py-2.5 bg-white hover:bg-brand-text-secondary backdrop-blur-sm border border-brand-black/10 hover:border-brand-black/20 rounded-lg text-black font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" strokeWidth={2} />
                    Download
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
