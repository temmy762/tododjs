import { Play, Download, Search, Filter, Grid, List, Clock, Music2 } from 'lucide-react';
import { useState } from 'react';
import TrackCard from '../components/TrackCard';

export default function CollectionPage({ onTrackInteraction }) {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const tracks = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    bpm: 120 + Math.floor(Math.random() * 40),
    collection: ['House', 'Techno', 'Jazz', 'Hip-Hop'][Math.floor(Math.random() * 4)],
    coverArt: `https://picsum.photos/seed/coll${i}/200`,
    dateAdded: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-dark-bg pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-10">
        <div className="relative h-64 rounded-2xl overflow-hidden mb-8 shadow-xl shadow-black/20">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-accent/20 to-dark-bg" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent" />
          
          <div className="relative h-full flex flex-col justify-end p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4 w-fit">
              <Music2 className="w-3 h-3 text-white" strokeWidth={2} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Collection</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">My Downloads</h1>
            <p className="text-lg text-brand-text-secondary mb-4">127 tracks • 8.2 GB</p>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-all duration-150 shadow-lg shadow-accent/30">
                <Play className="w-4 h-4" fill="white" strokeWidth={0} />
                Play All
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 rounded-lg text-black font-semibold transition-all duration-150">
                <Download className="w-4 h-4" strokeWidth={2} />
                Download All
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-tertiary/70" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in collection..."
                className="w-80 h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary/70 outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150"
              />
            </div>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-accent/50 transition-all duration-150"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title A-Z</option>
              <option value="artist">Artist A-Z</option>
              <option value="bpm">BPM</option>
            </select>

            <button className="h-10 px-4 bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 rounded-lg text-black transition-all duration-150 flex items-center gap-2">
              <Filter className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm font-semibold">Filters</span>
            </button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-all duration-150 ${
                viewMode === 'grid' 
                  ? 'bg-accent text-white' 
                  : 'bg-white hover:bg-brand-text-secondary text-black'
              }`}
            >
              <Grid className="w-4 h-4" strokeWidth={2} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-all duration-150 ${
                viewMode === 'list' 
                  ? 'bg-accent text-white' 
                  : 'bg-white hover:bg-brand-text-secondary text-black'
              }`}
            >
              <List className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-6 gap-4">
            {tracks.map((track) => (
              <TrackCard 
                key={track.id}
                track={track}
                onInteraction={onTrackInteraction}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <div 
                key={track.id}
                className="group flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-150 cursor-pointer"
              >
                <div className="w-8 text-center text-sm text-brand-text-tertiary/70 font-medium">
                  {index + 1}
                </div>
                
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg shadow-black/20">
                  <img 
                    src={track.coverArt}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors duration-150">
                    {track.title}
                  </div>
                  <div className="text-xs text-brand-text-tertiary truncate">
                    {track.artist}
                  </div>
                </div>

                <div className="text-sm text-brand-text-tertiary/70 font-medium">
                  {track.bpm} BPM
                </div>

                <div className="text-sm text-brand-text-tertiary/70">
                  {track.collection}
                </div>

                <div className="flex items-center gap-2 text-xs text-brand-text-tertiary/70">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  {new Date(track.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover flex items-center justify-center transition-all duration-150">
                    <Play className="w-4 h-4 text-white" fill="white" strokeWidth={0} />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-white hover:bg-brand-text-secondary flex items-center justify-center transition-all duration-150 text-black">
                    <Download className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
