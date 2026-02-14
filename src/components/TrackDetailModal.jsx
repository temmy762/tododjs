import { X, Play, Download, Heart, Share2, Clock, Music2, Disc3, Calendar, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function TrackDetailModal({ isOpen, onClose, track, onAction }) {
  const [isLiked, setIsLiked] = useState(false);

  if (!isOpen || !track) return null;

  const handleAction = (action) => {
    onAction?.(action, track);
  };

  const relatedTracks = [
    { id: 1, title: 'Similar Track 1', artist: 'Artist Name', coverArt: 'https://picsum.photos/seed/rel1/200' },
    { id: 2, title: 'Similar Track 2', artist: 'Artist Name', coverArt: 'https://picsum.photos/seed/rel2/200' },
    { id: 3, title: 'Similar Track 3', artist: 'Artist Name', coverArt: 'https://picsum.photos/seed/rel3/200' },
    { id: 4, title: 'Similar Track 4', artist: 'Artist Name', coverArt: 'https://picsum.photos/seed/rel4/200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary backdrop-blur-sm border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="overflow-y-auto max-h-[90vh] scrollbar-hidden">
          <div className="relative h-64 bg-gradient-to-b from-dark-elevated to-dark-surface">
            <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-dark-surface/50 to-transparent" />
            <img 
              src={track.coverArt} 
              alt={track.title}
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
            
            <div className="absolute inset-0 flex items-end p-10">
              <div className="flex items-end gap-6 w-full">
                <div className="relative w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
                  <img 
                    src={track.coverArt} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 pb-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 mb-3">
                    <TrendingUp className="w-3 h-3 text-accent" strokeWidth={2} />
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">Premium Track</span>
                  </div>
                  
                  <h1 className="text-4xl font-bold text-white mb-2 leading-tight">
                    {track.title}
                  </h1>
                  <p className="text-xl text-brand-text-secondary mb-4">
                    {track.artist}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleAction('play')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40"
                    >
                      <Play className="w-4 h-4" fill="white" strokeWidth={0} />
                      Play
                    </button>
                    <button 
                      onClick={() => handleAction('download')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 rounded-lg text-black text-sm font-semibold transition-all duration-150"
                    >
                      <Download className="w-4 h-4" strokeWidth={2} />
                      Download
                    </button>
                    <button 
                      onClick={() => setIsLiked(!isLiked)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
                        isLiked 
                          ? 'bg-accent hover:bg-accent-hover border-accent/50 text-white' 
                          : 'bg-white hover:bg-brand-text-secondary border-brand-black/10 hover:border-brand-black/20 text-black'
                      } border`}
                    >
                      <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} strokeWidth={2} />
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 text-black">
                      <Share2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10">
            <div className="grid md:grid-cols-2 gap-8 mb-10">
              <div>
                <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Track Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-brand-text-tertiary">
                      <Clock className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm">BPM</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{track.bpm}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-brand-text-tertiary">
                      <Music2 className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm">Key</span>
                    </div>
                    <span className="text-sm font-semibold text-white">A Minor</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-brand-text-tertiary">
                      <Disc3 className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm">Genre</span>
                    </div>
                    <span className="text-sm font-semibold text-white">House</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-brand-text-tertiary">
                      <Calendar className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm">Released</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Tags & Mood</h3>
                <div className="flex flex-wrap gap-2">
                  {['Energetic', 'Uplifting', 'Dance', 'Night', 'Club', 'Peak Time'].map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-brand-text-secondary hover:bg-white/10 hover:border-white/20 transition-all duration-150 cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Waveform Preview</h3>
              <div className="h-24 bg-white/5 rounded-lg border border-white/10 flex items-end justify-center gap-0.5 p-4 overflow-hidden">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div 
                    key={i}
                    className="flex-1 bg-gradient-to-t from-accent to-accent/50 rounded-sm transition-all duration-150 hover:from-accent-hover hover:to-accent"
                    style={{ 
                      height: `${Math.random() * 100}%`,
                      minHeight: '10%'
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Similar Tracks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedTracks.map((relTrack) => (
                  <div 
                    key={relTrack.id}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-dark-elevated shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-accent/20 transition-all duration-200">
                      <img 
                        src={relTrack.coverArt}
                        alt={relTrack.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          <Play className="w-4 h-4 text-white ml-0.5" fill="white" strokeWidth={0} />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors duration-150">
                      {relTrack.title}
                    </h4>
                    <p className="text-xs text-brand-text-tertiary truncate">
                      {relTrack.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
