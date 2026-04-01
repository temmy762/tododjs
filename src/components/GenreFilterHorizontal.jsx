import { useState, useEffect } from 'react';
import { Music, Layers } from 'lucide-react';
import API_URL from '../config/api';

export default function GenreFilterHorizontal({ activeCategory, onCategoryChange }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data || []); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative px-4 md:px-10 pt-4 md:pt-5 pb-4 md:pb-5 bg-gradient-to-b from-dark-bg via-dark-bg/98 to-dark-bg/95">
      <div className="mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Explora por Record Pools</h2>
        <p className="text-[10px] md:text-xs text-brand-text-tertiary/80 mt-1">Accede a tus record pools y packs Premium favoritos</p>
      </div>

      <div className="relative">
        <div className="overflow-x-auto scrollbar-hidden pb-3">
          <div className="flex gap-3 min-w-max pr-10">
            {/* "All" tab always first */}
            <button
              onClick={() => onCategoryChange(null)}
              className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                !activeCategory
                  ? 'bg-accent text-white shadow-lg shadow-accent/30'
                  : 'bg-white/5 text-brand-text-secondary hover:bg-white/10 hover:text-white'
              }`}
            >
              <Music size={16} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Todos</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <button
                  key={cat._id}
                  onClick={() => onCategoryChange(cat.slug, cat.name)}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'bg-white/5 text-brand-text-secondary hover:bg-white/10 hover:text-white'
                  }`}
                  style={isActive ? { backgroundColor: cat.color || '#7C3AED', boxShadow: `0 4px 20px ${cat.color || '#7C3AED'}50` } : {}}
                >
                  {cat.thumbnail ? (
                    <img src={cat.thumbnail} alt={cat.name} className="w-4 h-4 rounded-sm object-cover flex-shrink-0" />
                  ) : (
                    <Layers size={16} className="flex-shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{cat.name}</span>
                  {cat.trackCount > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                      {cat.trackCount > 999 ? `${Math.floor(cat.trackCount / 1000)}k` : cat.trackCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-3 w-24 bg-gradient-to-l from-dark-bg via-dark-bg/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
