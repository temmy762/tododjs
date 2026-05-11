import { useState, useEffect, useRef, useCallback } from 'react';
import { Music, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const SCROLL_STEP = 220;

// activeCategory = category NAME (e.g. "Latin Box"), not slug
// scope = 'recordpool' (default) — passed to API to filter category list
export default function GenreFilterHorizontal({ activeCategory, onCategoryChange, scope = 'recordpool' }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCategories(d.data || []);
        }
      })
      .catch(() => {});
  }, [scope]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [categories, updateArrows]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });
  };

  return (
    <div className="relative px-4 md:px-10 pt-4 md:pt-5 pb-4 md:pb-5 bg-gradient-to-b from-dark-bg via-dark-bg/98 to-dark-bg/95">
      <div className="mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{t('home.browseByRecordPool')}</h2>
        <p className="text-[10px] md:text-xs text-brand-text-tertiary/80 mt-1">{t('home.recordPoolSubtitle')}</p>
      </div>

      <div className="relative flex items-center gap-1">
        {/* Left arrow */}
        <button
          onClick={() => scrollBy(-1)}
          className={`flex-shrink-0 p-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-all duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronLeft size={16} />
        </button>

        <div ref={scrollRef} className="overflow-x-auto scrollbar-hidden pb-1 flex-1">
          <div className="flex gap-3 min-w-max">
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
              <span className="whitespace-nowrap">{t('common.all')}</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.name;
              const count = scope === 'recordpool'
                ? (cat.albumCount || cat.trackCount || 0)
                : (cat.trackCount || 0);
              return (
                <button
                  key={cat._id}
                  onClick={() => onCategoryChange(cat.name)}
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
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                      {count > 999 ? `${Math.floor(count / 1000)}k` : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scrollBy(1)}
          className={`flex-shrink-0 p-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-all duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
