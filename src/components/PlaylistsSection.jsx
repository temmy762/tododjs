import { useState, useEffect } from 'react';
import { Disc, Loader } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function PlaylistsSection({ playlists: fallbackPlaylists, onPlaylistClick, activeGenre = 'all' }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(`${API}/sources`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setSources(data.data);
        }
      } catch (err) {
        console.error('Error fetching sources for featured:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  // Use live sources if available, otherwise fall back to mock playlists
  const items = sources.length > 0
    ? sources.map(s => ({
        id: s._id,
        title: s.name,
        coverArt: s.thumbnail || '',
        curator: s.platform || 'TodoDJS',
        trackCount: s.totalTracks || 0,
        albumCount: s.totalAlbums || 0,
        isTrending: s.totalTracks > 5,
      }))
    : fallbackPlaylists;

  const filteredItems = activeGenre === 'all'
    ? items
    : items.filter(item =>
        (item.title || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (item.curator || '').toLowerCase().includes(activeGenre.toLowerCase())
      );

  if (filteredItems.length === 0 && activeGenre !== 'all') return null;

  return (
    <div className="my-8 md:my-12 px-4 md:px-10">
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold text-white">Featured Collections</h2>
        <p className="text-xs md:text-sm text-brand-text-tertiary mt-1">Browse curated record pools and sources</p>
      </div>
      
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onPlaylistClick(item)}
                className="flex-shrink-0 w-36 md:w-48 group cursor-pointer"
              >
                <div className="relative mb-3 overflow-hidden rounded-lg bg-dark-elevated shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-accent/20 group-hover:scale-105">
                  <div className="aspect-square relative">
                    {item.coverArt ? (
                      <img
                        src={item.coverArt}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full items-center justify-center bg-gradient-to-br from-accent/30 to-purple-500/20"
                      style={{ display: item.coverArt ? 'none' : 'flex' }}
                    >
                      <Disc className="w-10 h-10 text-accent/50" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {item.isTrending && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r from-accent to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        Featured
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="px-1">
                  <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-accent transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-xs text-brand-text-tertiary truncate">
                    {item.curator}
                  </p>
                  <p className="text-[10px] text-brand-text-tertiary/60 mt-0.5">
                    {item.trackCount} tracks{item.albumCount ? ` • ${item.albumCount} albums` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
