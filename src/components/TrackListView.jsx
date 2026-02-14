import { useState } from 'react';
import { Play, Pause, Heart, Download, Clock } from 'lucide-react';
import GenericCoverArt from './GenericCoverArt';

const getGenreColor = (genre) => {
  const colors = {
    'House': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    'Deep House': 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    'Techno': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    'Trance': 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
    'Dubstep': 'bg-red-500/20 text-red-300 border border-red-500/30',
    'Electro': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    'Synthwave': 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    'Jazz': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    'Chill': 'bg-green-500/20 text-green-300 border border-green-500/30',
    'Ambient': 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    'Hip-Hop': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    'Lounge': 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    'Electro Swing': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  };
  return colors[genre] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
};

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

export default function TrackListView({ tracks, onTrackInteraction, userFavorites = new Set() }) {
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = (track) => {
    if (playingTrackId === track.id) {
      setIsPlaying(!isPlaying);
      onTrackInteraction?.('play', track);
    } else {
      setPlayingTrackId(track.id);
      setIsPlaying(true);
      onTrackInteraction?.('play', track);
    }
  };

  return (
    <div className="px-3 md:px-6 lg:px-10">
      {/* ── Mobile Card Layout ── */}
      <div className="md:hidden space-y-2 py-2">
        {tracks.map((track, index) => {
          const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
          const isLiked = userFavorites.has(track.id || track._id);
          
          return (
            <div
              key={track.id}
              className="bg-dark-elevated/40 rounded-xl border border-white/[0.04] overflow-hidden animate-in fade-in"
              style={{ animationDelay: `${index * 15}ms`, animationDuration: '250ms' }}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Cover Art with Play Overlay */}
                <div
                  className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-dark-elevated relative cursor-pointer"
                  onClick={() => handlePlayPause(track)}
                >
                  {track.coverArt ? (
                    <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }} />
                  ) : null}
                  <div style={{ display: track.coverArt ? 'none' : 'block' }}>
                    <GenericCoverArt title={track.title} artist={track.artist} size="md" />
                  </div>
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${isCurrentlyPlaying ? 'opacity-100' : 'opacity-0'}`}>
                    {isCurrentlyPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    )}
                  </div>
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isCurrentlyPlaying ? 'text-accent' : 'text-white'}`}>
                    {track.title}
                  </div>
                  <div className="text-xs text-brand-text-tertiary truncate">{track.artist}</div>
                </div>

                {/* Play Button */}
                <button
                  onClick={() => handlePlayPause(track)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isCurrentlyPlaying ? 'bg-accent shadow-lg shadow-accent/30' : 'bg-white/10'
                  }`}
                >
                  {isCurrentlyPlaying ? (
                    <Pause className="w-4 h-4 text-white" fill="white" strokeWidth={0} />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" strokeWidth={0} />
                  )}
                </button>
              </div>

              {/* Badges + Actions Row */}
              <div className="flex items-center justify-between px-3 pb-3 pt-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {track.genre && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getGenreColor(track.genre)}`}>
                      {track.genre}
                    </span>
                  )}
                  {track.tonality && (
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-black border border-black/10"
                      style={{ backgroundColor: getTonalityColor(track.tonality) }}
                    >
                      {track.tonality}
                    </span>
                  )}
                  {track.bpm > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-brand-text-secondary bg-dark-elevated/80">
                      {track.bpm}
                    </span>
                  )}
                  <span className="text-[9px] text-brand-text-tertiary/60">
                    {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {track.pool && (
                    <>
                      <span className="text-[9px] text-brand-text-tertiary/40">•</span>
                      <span className="text-[9px] text-brand-text-tertiary/60 truncate max-w-[80px]">{track.pool}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => onTrackInteraction?.('favorite', track)}
                  >
                    <Heart className={`w-4 h-4 transition-colors ${isLiked ? 'text-accent fill-accent' : 'text-white/30'}`} strokeWidth={2} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackInteraction?.('download', track);
                    }}
                  >
                    <Download className="w-4 h-4 text-white/30" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop Table Layout ── */}
      <div className="hidden md:block overflow-x-auto scrollbar-hidden">
        <div className="min-w-[900px] grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-2 px-3 py-1.5 border-b border-white/5 text-[9px] font-semibold text-brand-text-tertiary uppercase tracking-wider sticky top-0 bg-dark-bg/95 backdrop-blur-md z-10">
          <div className="w-6 text-center">#</div>
          <div>Title</div>
          <div className="w-16 text-center">Genre</div>
          <div className="w-16 text-center">Tonality</div>
          <div className="w-12 text-center">BPM</div>
          <div className="w-24 text-center">Date Added</div>
          <div className="w-20">Pool</div>
          <div className="w-24"></div>
        </div>

        {tracks.map((track, index) => {
          const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
          const isLiked = userFavorites.has(track.id || track._id);
          
          return (
            <div
              key={track.id}
              className="min-w-[900px] grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-2 px-3 py-1.5 hover:bg-white/5 group transition-all duration-150 border-b border-white/[0.01] last:border-b-0 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 20}ms`, animationDuration: '300ms' }}
              onClick={() => handlePlayPause(track)}
            >
              <div className="w-6 flex items-center justify-center">
                <span className={`text-[10px] ${isCurrentlyPlaying ? 'text-accent' : 'text-brand-text-tertiary group-hover:hidden'}`}>
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
                    <Pause className="w-3 h-3 text-accent" fill="currentColor" />
                  ) : (
                    <Play className="w-3 h-3 text-white" fill="currentColor" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-dark-elevated">
                  {track.coverArt ? (
                    <img 
                      src={track.coverArt} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
                    />
                  ) : null}
                  <div style={{ display: track.coverArt ? 'none' : 'block' }}>
                    <GenericCoverArt title={track.title} artist={track.artist} size="sm" />
                  </div>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <div className={`text-xs font-semibold truncate ${isCurrentlyPlaying ? 'text-accent' : 'text-white'}`}>
                    {track.title}
                  </div>
                  <div className="text-[10px] text-brand-text-tertiary truncate">
                    {track.artist}
                  </div>
                </div>
              </div>

              <div className="w-16 flex items-center justify-center">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40">
                  {track.genre}
                </span>
              </div>

              <div className="w-16 flex items-center justify-center">
                <span
                  className="px-2 py-1 rounded-md text-[10px] font-extrabold text-black border border-black/10"
                  style={{ backgroundColor: getTonalityColor(track.tonality) }}
                >
                  {track.tonality}
                </span>
              </div>

              <div className="w-12 flex items-center justify-center">
                <span className="px-1 py-0.5 rounded text-[9px] font-medium text-brand-text-secondary bg-dark-elevated/50">
                  {track.bpm}
                </span>
              </div>

              <div className="w-24 flex items-center justify-center text-[10px] text-brand-text-tertiary">
                {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>

              <div className="w-20 flex items-center text-[9px] text-brand-text-tertiary/80 truncate">
                {track.pool}
              </div>

              <div className="w-24 flex items-center justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackInteraction?.('favorite', track);
                  }}
                  className={`opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110 ${
                    isLiked ? '!opacity-100' : ''
                  }`}
                >
                  <Heart 
                    className={`w-3 h-3 transition-colors ${isLiked ? 'text-accent fill-accent' : 'text-white/70'}`}
                    strokeWidth={2}
                  />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackInteraction?.('download', track);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
                >
                  <Download className="w-3 h-3 text-white/70" strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
