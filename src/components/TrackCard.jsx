import { Play, Download, Lock } from 'lucide-react';
import { useState } from 'react';

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

export default function TrackCard({ track, onInteraction }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = (action) => {
    onInteraction?.(action, track);
  };

  return (
    <div
      className="group relative flex-shrink-0 w-44 cursor-pointer"
      onClick={() => handleClick('play')}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-dark-elevated mb-3 transition-all duration-200 ease-out group-hover:scale-[1.03] shadow-lg shadow-black/20 group-hover:shadow-2xl group-hover:shadow-accent/20">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-dark-elevated animate-pulse" />
        )}
        <img 
          src={track.coverArt} 
          alt={track.title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:opacity-70`}
        />
        
        {track.locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white/60" strokeWidth={1.5} />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClick('play');
            }}
            className="w-11 h-11 rounded-full bg-accent hover:bg-accent-hover hover:scale-110 flex items-center justify-center transition-all duration-150 transform translate-y-2 group-hover:translate-y-0 shadow-xl shadow-accent/30"
          >
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" strokeWidth={0} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClick('download');
            }}
            className="w-11 h-11 rounded-full bg-white hover:bg-brand-text-secondary hover:scale-110 flex items-center justify-center transition-all duration-150 transform translate-y-2 group-hover:translate-y-0 shadow-xl"
          >
            <Download className="w-5 h-5 text-black" strokeWidth={2} />
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors duration-150">
          {track.title}
        </h3>
        <p className="text-xs text-brand-text-tertiary truncate font-medium">
          {track.artist}
        </p>
        
        {/* Genre Tag */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40">
            {track.genre}
          </span>
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-black border border-black/10"
            style={{ backgroundColor: getTonalityColor(track.tonality) }}
          >
            {track.tonality}
          </span>
          <span className="text-[10px] font-medium text-brand-text-tertiary/80">{track.bpm} BPM</span>
        </div>
        
        {/* Date and Pool */}
        <div className="flex items-center gap-1.5 text-[10px] text-brand-text-tertiary/60 mt-1">
          <span>{new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>•</span>
          <span className="truncate">{track.pool}</span>
        </div>
      </div>
    </div>
  );
}
