import { useState } from 'react';
import { Play, Pause, X, Clock, Heart, Download, MoreHorizontal, Music, Building2 } from 'lucide-react';

export default function ArtistAlbumView({ profile, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [likedTracks, setLikedTracks] = useState(new Set());

  const sampleTracks = [
    { id: 1, title: "Midnight Echoes", duration: "3:45", plays: "1.2M", dateAdded: "2024-12-28" },
    { id: 2, title: "Neon Dreams", duration: "4:12", plays: "890K", dateAdded: "2024-12-27" },
    { id: 3, title: "Electric Pulse", duration: "3:28", plays: "2.1M", dateAdded: "2024-12-26" },
    { id: 4, title: "Sunset Boulevard", duration: "5:03", plays: "1.5M", dateAdded: "2024-12-25" },
    { id: 5, title: "Digital Love", duration: "3:56", plays: "3.2M", dateAdded: "2024-12-24" },
    { id: 6, title: "Cosmic Journey", duration: "4:34", plays: "750K", dateAdded: "2024-12-23" },
    { id: 7, title: "Retro Wave", duration: "3:18", plays: "1.8M", dateAdded: "2024-12-22" },
    { id: 8, title: "Future Nostalgia", duration: "4:45", plays: "2.5M", dateAdded: "2024-12-21" },
    { id: 9, title: "Starlight Symphony", duration: "3:39", plays: "920K", dateAdded: "2024-12-20" },
    { id: 10, title: "Urban Nights", duration: "4:21", plays: "1.1M", dateAdded: "2024-12-19" },
  ];

  const handlePlayPause = (trackId) => {
    if (playingTrackId === trackId) {
      setIsPlaying(!isPlaying);
    } else {
      setPlayingTrackId(trackId);
      setIsPlaying(true);
    }
  };

  const handlePlayAll = () => {
    setPlayingTrackId(sampleTracks[0].id);
    setIsPlaying(true);
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

  const formatDuration = (duration) => duration;

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
      <button
        onClick={onClose}
        className="fixed top-3 right-3 md:top-6 md:right-6 z-50 w-9 h-9 md:w-10 md:h-10 rounded-full bg-dark-surface/80 backdrop-blur-xl border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="relative">
        <div className="h-52 md:h-80 bg-gradient-to-b from-accent/20 via-accent/10 to-dark-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-purple-500/20 to-transparent" />
          <div 
            className="absolute inset-0 opacity-20 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${profile.avatar})` }}
          />
          
          <div className="relative h-full flex items-end px-4 md:px-10 pb-4 md:pb-8">
            <div className="flex items-end gap-4 md:gap-6">
              <div className="relative group">
                <div className={`w-28 h-28 md:w-56 md:h-56 rounded-lg overflow-hidden shadow-2xl ${
                  profile.hasNewContent 
                    ? 'ring-4 ring-accent/50' 
                    : 'ring-2 ring-white/10'
                }`}>
                  <img 
                    src={profile.avatar} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center ${
                  profile.type === 'label' ? 'bg-accent' : 'bg-purple-500'
                } shadow-lg`}>
                  {profile.type === 'label' ? (
                    <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
                  ) : (
                    <Music className="w-6 h-6 text-white" strokeWidth={2} />
                  )}
                </div>
              </div>

              <div className="flex-1 pb-4">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    {profile.type === 'label' ? 'Record Label' : 'Artist'}
                  </span>
                  {profile.hasNewContent && (
                    <span className="px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wide">
                      New
                    </span>
                  )}
                </div>
                
                <h1 className="text-2xl md:text-7xl font-bold text-white mb-2 md:mb-6 tracking-tight">
                  {profile.name}
                </h1>
                
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="font-semibold">{profile.trackCount} tracks</span>
                  <span>•</span>
                  <span>12.5M monthly listeners</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-dark-bg/50 to-dark-bg px-4 md:px-10 py-4 md:py-8">
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={handlePlayAll}
              className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-xl shadow-accent/30"
            >
              {isPlaying && playingTrackId === sampleTracks[0].id ? (
                <Pause className="w-6 h-6 text-white" fill="white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
              )}
            </button>
            
            <button className="w-12 h-12 rounded-full border-2 border-white/20 hover:border-white/40 hover:scale-105 flex items-center justify-center transition-all duration-200">
              <Heart className="w-5 h-5 text-white/70" strokeWidth={2} />
            </button>
            
            <button className="w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center transition-all duration-200">
              <MoreHorizontal className="w-6 h-6 text-white/70" />
            </button>
          </div>

          <div className="bg-dark-surface/30 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden">
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">
              <div className="w-10 text-center">#</div>
              <div>Title</div>
              <div className="w-24 text-center">Plays</div>
              <div className="w-20 text-center">
                <Clock className="w-4 h-4 mx-auto" />
              </div>
              <div className="w-32"></div>
            </div>

            {sampleTracks.map((track, index) => {
              const isCurrentlyPlaying = playingTrackId === track.id && isPlaying;
              const isLiked = likedTracks.has(track.id);
              
              return (
                <div
                  key={track.id}
                  className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-3 md:gap-4 px-3 md:px-6 py-2.5 md:py-3 hover:bg-white/5 group transition-all duration-200 border-b border-white/[0.02] last:border-b-0"
                >
                  <div className="w-10 flex items-center justify-center">
                    <span className={`text-sm ${isCurrentlyPlaying ? 'text-accent' : 'text-brand-text-tertiary group-hover:hidden'}`}>
                      {index + 1}
                    </span>
                    <button
                      onClick={() => handlePlayPause(track.id)}
                      className="hidden group-hover:flex items-center justify-center"
                    >
                      {isCurrentlyPlaying ? (
                        <Pause className="w-4 h-4 text-accent" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 text-white" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col justify-center min-w-0">
                    <div className={`font-semibold truncate ${isCurrentlyPlaying ? 'text-accent' : 'text-white'}`}>
                      {track.title}
                    </div>
                    <div className="text-sm text-brand-text-tertiary truncate">
                      {profile.name}
                    </div>
                  </div>

                  <div className="hidden md:flex w-24 items-center justify-center text-sm text-brand-text-tertiary">
                    {track.plays}
                  </div>

                  <div className="hidden md:flex w-20 items-center justify-center text-sm text-brand-text-tertiary">
                    {formatDuration(track.duration)}
                  </div>

                  <div className="w-auto md:w-32 flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleLike(track.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 ${
                        isLiked ? 'opacity-100' : ''
                      }`}
                    >
                      <Heart 
                        className={`w-4 h-4 ${isLiked ? 'text-accent fill-accent' : 'text-white/70'}`}
                        strokeWidth={2}
                      />
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110">
                      <Download className="w-4 h-4 text-white/70" strokeWidth={2} />
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <MoreHorizontal className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-sm text-brand-text-tertiary">
            <p className="mb-2">
              <span className="text-white font-semibold">About {profile.name}</span>
            </p>
            <p className="leading-relaxed">
              {profile.type === 'label' 
                ? `${profile.name} is a leading record label known for discovering and promoting exceptional talent across multiple genres. With a roster of innovative artists and a commitment to quality music production.`
                : `${profile.name} is a talented artist pushing the boundaries of modern music. Known for their unique sound and captivating performances, they continue to inspire fans worldwide.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
