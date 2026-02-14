import { useState } from 'react';
import { Play, Pause, Heart, Download, MoreHorizontal } from 'lucide-react';

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

export default function TrackGridView({ tracks, onTrackInteraction }) {
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState(new Set());

  const handlePlayPause = (track) => {
    if (playingTrackId === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setPlayingTrackId(track.id);
      setIsPlaying(true);
    }
    onTrackInteraction?.('play', track);
  };

  const toggleLike = (trackId) => {
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  return (
    <div className="px-3 md:px-10 py-4 md:py-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {tracks.map((track) => {
          const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
          const isLiked = likedTracks.has(track.id);
          
          return (
            <div
              key={track.id}
              className="group relative bg-dark-elevated/30 rounded-lg p-3 hover:bg-dark-elevated/50 transition-all duration-300 hover:scale-105 animate-in fade-in"
              onClick={() => handlePlayPause(track)}
            >
              {/* Cover Art */}
              <div className="relative mb-3 overflow-hidden rounded-md bg-dark-elevated aspect-square">
                {track.coverArt ? (
                  <img 
                    src={track.coverArt} 
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div
                  className="w-full h-full items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10"
                  style={{ display: track.coverArt ? 'none' : 'flex' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent/70"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause(track);
                    }}
                    className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/50 hover:scale-110 transition-transform duration-200"
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="currentColor" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                    )}
                  </button>
                </div>

                {/* Genre Tag */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="text-[9px] font-semibold text-white uppercase tracking-wider">
                    {track.collection}
                  </span>
                </div>

                {/* BPM Badge */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                  <span className="text-[9px] font-medium text-white">
                    {track.bpm}
                  </span>
                </div>
              </div>

              {/* Track Info */}
              <div className="space-y-1">
                <h3 className={`text-xs font-semibold truncate transition-colors duration-200 ${
                  isCurrentlyPlaying ? 'text-accent' : 'text-white group-hover:text-accent'
                }`}>
                  {track.title}
                </h3>
                <p className="text-[10px] text-brand-text-tertiary truncate">
                  {track.artist}
                </p>
                
                {/* Genre Tag and Tonality */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40">
                    {track.genre}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-black border border-black/10"
                    style={{ backgroundColor: getTonalityColor(track.tonality) }}
                  >
                    {track.tonality}
                  </span>
                  <span className="text-[9px] text-brand-text-tertiary/80">{track.bpm} BPM</span>
                </div>
                
                {/* Date and Pool */}
                <div className="flex items-center gap-1.5 text-[9px] text-brand-text-tertiary/60">
                  <span>{new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span className="truncate">{track.pool}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(track.id);
                  }}
                  className="hover:scale-110 transition-transform duration-150"
                >
                  <Heart 
                    className={`w-3.5 h-3.5 ${isLiked ? 'text-accent fill-accent' : 'text-white/70'}`}
                    strokeWidth={2}
                  />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackInteraction?.('download', track);
                  }}
                  className="hover:scale-110 transition-transform duration-150"
                >
                  <Download className="w-3.5 h-3.5 text-white/70" strokeWidth={2} />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="hover:scale-110 transition-transform duration-150"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
