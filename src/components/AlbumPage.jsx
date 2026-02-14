import { useState } from 'react';
import { Play, Music2 } from 'lucide-react';

export default function AlbumPage({ albums, onAlbumClick }) {
  const [hoveredAlbum, setHoveredAlbum] = useState(null);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5 px-4 md:px-10 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white">Packs</h1>
            <p className="text-[10px] md:text-sm text-brand-text-tertiary mt-1">
              {albums.length} packs in your library
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-accent" />
          </div>
        </div>
      </div>

      {/* Netflix-style Pack Grid */}
      <div className="px-4 md:px-10 py-4 md:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
          {albums.map((album, index) => (
            <div
              key={album.id}
              onClick={() => onAlbumClick(album)}
              onMouseEnter={() => setHoveredAlbum(album.id)}
              onMouseLeave={() => setHoveredAlbum(null)}
              className="group cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ 
                animationDelay: `${index * 40}ms`,
                animationDuration: '500ms'
              }}
            >
              {/* Album Card */}
              <div className="relative overflow-hidden rounded-lg bg-dark-elevated shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-accent/20 group-hover:scale-105 group-hover:-translate-y-2">
                {/* Cover Art */}
                <div className="relative aspect-square">
                  <img
                    src={album.coverArt}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-2xl shadow-accent/50 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* New Badge */}
                  {album.isNew && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-accent to-purple-500 shadow-lg">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">New</span>
                    </div>
                  )}

                  {/* Track Count Badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                    <span className="text-[10px] font-medium text-white">
                      {album.trackCount} tracks
                    </span>
                  </div>
                </div>

                {/* Album Info */}
                <div className="p-3 bg-gradient-to-b from-dark-elevated to-dark-surface">
                  <h3 className="font-bold text-sm text-white truncate mb-1 group-hover:text-accent transition-colors duration-200">
                    {album.title}
                  </h3>
                  <p className="text-xs text-brand-text-tertiary truncate">
                    {album.artist}
                  </p>
                  <p className="text-[10px] text-brand-text-tertiary/60 mt-1">
                    {album.releaseDate ? new Date(album.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : album.year}
                  </p>
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 pointer-events-none ${
                  hoveredAlbum === album.id 
                    ? 'opacity-100 shadow-[0_0_30px_rgba(139,92,246,0.3)]' 
                    : 'opacity-0'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
