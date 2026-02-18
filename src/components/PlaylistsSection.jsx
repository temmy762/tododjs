import { useState, useEffect } from 'react';
import { Disc, Loader, Star } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function PlaylistsSection({ onAlbumClick, activeGenre = 'all' }) {
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API}/albums/featured`);
        const data = await res.json();
        if (data.success) {
          setFeaturedAlbums(data.data);
        }
      } catch (err) {
        console.error('Error fetching featured albums:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const items = featuredAlbums.map(a => ({
    id: a._id,
    title: a.name,
    coverArt: a.coverArt || '',
    genre: a.genre || '',
    trackCount: a.trackCount || 0,
    year: a.year,
    source: a.sourceId?.name || '',
    _raw: a,
  }));

  const filteredItems = activeGenre === 'all'
    ? items
    : items.filter(item =>
        (item.title || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (item.genre || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (item.source || '').toLowerCase().includes(activeGenre.toLowerCase())
      );

  if (!loading && filteredItems.length === 0) return null;

  return (
    <div className="my-8 md:my-12 px-4 md:px-10">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <h2 className="text-lg md:text-2xl font-bold text-white">Featured Albums</h2>
        </div>
        <p className="text-xs md:text-sm text-brand-text-tertiary mt-1">Hand-picked by our team</p>
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
                onClick={() => onAlbumClick?.({ id: item.id, title: item.title, coverArt: item.coverArt, trackCount: item.trackCount, year: item.year, genre: item.genre })}
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
                    
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Star size={10} className="fill-white" /> Featured
                    </div>
                  </div>
                </div>
                
                <div className="px-1">
                  <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-accent transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-xs text-brand-text-tertiary truncate">
                    {item.source || item.genre}
                  </p>
                  <p className="text-[10px] text-brand-text-tertiary/60 mt-0.5">
                    {item.trackCount} tracks • {item.year}
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
