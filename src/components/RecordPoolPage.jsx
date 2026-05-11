import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Disc, Music, ChevronRight, Loader, Download, Play,
  Search, X, Grid3x3, List, ChevronLeft,
  Calendar, Layers2, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const GRADIENTS = [
  'from-purple-600 to-indigo-800',
  'from-pink-600 to-rose-800',
  'from-blue-600 to-cyan-800',
  'from-orange-600 to-red-800',
  'from-green-600 to-teal-800',
  'from-yellow-600 to-amber-800',
];

const SCROLL_STEP = 220;
const ALBUMS_PER_PAGE = 40;

const SORT_API_MAP = {
  newest: '-createdAt',
  oldest:  'createdAt',
  name:    'name',
  tracks:  '-trackCount',
};

export default function RecordPoolPage({ onAlbumClick, onAlbumDownload }) {
  const { t } = useTranslation();

  // ── category filter bar ──────────────────────────────────────────────────────
  const [categories, setCategories]       = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const catScrollRef = useRef(null);

  // ── album grid ───────────────────────────────────────────────────────────────
  const [albums, setAlbums]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]       = useState(1);

  // ── controls ─────────────────────────────────────────────────────────────────
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const SORT_OPTIONS = useMemo(() => [
    { value: 'newest', label: t('recordPool.newestFirst') },
    { value: 'oldest', label: t('recordPool.oldestFirst') },
    { value: 'name',   label: t('recordPool.nameAZ') },
    { value: 'tracks', label: t('recordPool.mostTracks') },
  ], [t]);

  // ── fetch categories once ────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data || []); })
      .catch(() => {});
  }, []);

  // ── scroll arrows ────────────────────────────────────────────────────────────
  const updateArrows = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = catScrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [categories, updateArrows]);

  const catScrollBy = (dir) => catScrollRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' });

  // ── fetch albums ─────────────────────────────────────────────────────────────
  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort: SORT_API_MAP[sort] || '-createdAt',
        limit: ALBUMS_PER_PAGE,
        page,
      });
      if (activeCategory) params.set('category', activeCategory);
      if (search.trim()) params.set('search', search.trim());

      const res  = await fetch(`${API_URL}/albums?${params}`);
      const data = await res.json();
      if (data.success) {
        setAlbums(data.data || []);
        setTotal(data.total || data.pagination?.total || 0);
        setTotalPages(data.pages || data.pagination?.pages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [activeCategory, sort, page, search]);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleCategoryChange = (name) => { setActiveCategory(name); setPage(1); };
  const handleSortChange     = (v)    => { setSort(v); setPage(1); };
  const handleSearchChange   = (v)    => { setSearch(v); setPage(1); };
  const handlePageChange     = (p)    => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderPageNumbers = () => {
    const nums = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else if (page <= 3) {
      nums.push(1, 2, 3, '...', totalPages);
    } else if (page >= totalPages - 2) {
      nums.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
    } else {
      nums.push(1, '...', page, '...', totalPages);
    }
    return nums;
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 md:px-10 pt-5 pb-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{t('recordPool.title')}</h1>
            <p className="text-[11px] text-brand-text-tertiary mt-0.5">
              {total > 0 ? `${total.toLocaleString()} ${t('recordPool.albums')}` : ''}
              {activeCategory ? ` · ${activeCategory}` : ''}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
              <input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t('recordPool.search')}
                className="pl-7 pr-7 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50 w-36"
              />
              {search && (
                <button onClick={() => handleSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white">
                  <X size={11} />
                </button>
              )}
            </div>

            <select
              value={sort}
              onChange={e => handleSortChange(e.target.value)}
              className="bg-[#1c1c2e] border border-white/10 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1c1c2e', color: '#fff' }}>{o.label}</option>
              ))}
            </select>

            <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}>
                <Grid3x3 size={13} />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}>
                <List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Category filter bar with scroll arrows ──────────────────────── */}
        <div className="px-4 md:px-10 pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => catScrollBy(-1)}
              className={`flex-shrink-0 p-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-all duration-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <ChevronLeft size={15} />
            </button>

            <div ref={catScrollRef} className="overflow-x-auto scrollbar-hidden pb-1 flex-1">
              <div className="flex gap-2 min-w-max">
                {/* ALL pill */}
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                    !activeCategory
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'bg-white/5 text-brand-text-secondary hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Music size={13} className="flex-shrink-0" />
                  {t('common.all')}
                </button>

                {categories.map((cat) => {
                  const isActive = activeCategory === cat.name;
                  const count = cat.albumCount || 0;
                  return (
                    <button
                      key={cat._id}
                      onClick={() => handleCategoryChange(isActive ? null : cat.name)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                        isActive ? 'text-white shadow-lg' : 'bg-white/5 text-brand-text-secondary hover:bg-white/10 hover:text-white'
                      }`}
                      style={isActive ? { backgroundColor: cat.color || '#7C3AED', boxShadow: `0 4px 16px ${cat.color || '#7C3AED'}40` } : {}}
                    >
                      {cat.thumbnail
                        ? <img src={cat.thumbnail} alt={cat.name} className="w-3.5 h-3.5 rounded-sm object-cover flex-shrink-0" />
                        : <Tag size={12} className="flex-shrink-0" />
                      }
                      <span className="whitespace-nowrap">{cat.name}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                          {count > 999 ? `${Math.floor(count / 1000)}k` : count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => catScrollBy(1)}
              className={`flex-shrink-0 p-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-all duration-200 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-10 py-5">

        {/* Mobile search */}
        <div className="relative sm:hidden mb-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
          <input value={search} onChange={e => handleSearchChange(e.target.value)}
            placeholder={t('recordPool.searchMobile')}
            className="w-full pl-7 pr-7 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50"
          />
          {search && <button onClick={() => handleSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"><X size={11} /></button>}
        </div>

        {loading ? <LoadingState /> : albums.length === 0 ? (
          <EmptyState icon={Music} text={activeCategory ? t('recordPool.noAlbumsCategory') : t('recordPool.noAlbumsYet')} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {albums.map((album, i) => (
              <AlbumCard key={album._id} album={album} index={i}
                onClick={() => onAlbumClick?.(album)}
                onPlay={() => onAlbumClick?.(album, { autoPlay: true })}
                onDownload={() => onAlbumDownload?.(album)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {albums.map((album, i) => (
              <AlbumRow key={album._id} album={album} index={i}
                onClick={() => onAlbumClick?.(album)}
                onDownload={() => onAlbumDownload?.(album)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${page === 1 ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed' : 'bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/10'}`}
            >
              {t('pagination.previous')}
            </button>
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2">
              {renderPageNumbers().map((num, i) =>
                num === '...' ? (
                  <span key={`e-${i}`} className="px-2 text-brand-text-tertiary font-bold">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => handlePageChange(num)}
                    className={`min-w-[34px] h-8 rounded-lg font-bold text-sm transition-all ${page === num ? 'bg-accent text-white shadow-lg shadow-accent/40' : 'bg-transparent text-brand-text-secondary hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    {num}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${page === totalPages ? 'bg-dark-elevated/20 text-brand-text-tertiary/40 cursor-not-allowed' : 'bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/10'}`}
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Collection/Pool header shown when albums view is open
function CollectionHeader({ collection, albumCount }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const isSeries = collection._type === 'series';
  return (
    <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex-shrink-0 bg-dark-surface flex items-center justify-center">
        {collection.thumbnail && !imgError
          ? <img src={collection.thumbnail} alt={collection.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[0]} flex items-center justify-center`}><Disc size={32} className="text-white/60" /></div>}
      </div>
      <div>
        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">
          {isSeries ? t('recordPool.collectionSeries') : t('recordPool.recordPool')}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{collection.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-text-tertiary">
          {collection.year && <span className="flex items-center gap-1"><Calendar size={12} /> {collection.year}</span>}
          {isSeries && collection.collections?.length > 1 && (
            <><span className="text-white/20">·</span>
            <span>{t('recordPool.packs', { count: collection.collections.length })}</span></>
          )}
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Disc size={13} className="text-accent" />{albumCount ?? collection.totalAlbums ?? 0} {t('recordPool.albums')}</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Music size={13} className="text-accent" />{collection.totalTracks || 0} {t('recordPool.tracks')}</span>
        </div>
      </div>
    </div>
  );
}

// Unified card for any collection (source or series)
function CollectionCard({ item, index, onClick }) {
  const { t } = useTranslation();
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [imgError, setImgError] = useState(false);
  const isSource = item._itemType === 'source' || item._type === 'source';
  const subtitle = isSource
    ? (item.platform ? item.platform : null)
    : (item.year ? String(item.year) : null);
  const packCount = !isSource && item.collections?.length > 1 ? t('recordPool.packs', { count: item.collections.length }) : null;
  const entranceDelay = `${Math.min(index * 60, 480)}ms`;
  const glowDelay     = `${(index % 8) * 0.8}s`;
  return (
    <div
      onClick={onClick}
      className="neon-card group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated"
      style={{ '--entrance-delay': entranceDelay, '--neon-delay': glowDelay }}
    >
      <div className="relative aspect-square overflow-hidden bg-dark-surface">
        {item.thumbnail && !imgError ? (
          <img src={item.thumbnail} alt={item.name} onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Layers2 size={48} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {subtitle && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">{subtitle}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
          <h3 className="text-sm sm:text-lg font-bold text-white mb-0.5 drop-shadow-lg line-clamp-2">{item.name}</h3>
          {packCount && <p className="text-white/60 text-[10px] sm:text-xs">{packCount}</p>}
        </div>
      </div>
      <div className="px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm min-w-0">
          <span className="text-brand-text-tertiary flex items-center gap-1 whitespace-nowrap">
            <Disc size={12} className="text-accent" />{item.totalAlbums || 0} {t('recordPool.albums')}
          </span>
          <span className="text-brand-text-tertiary flex items-center gap-1 whitespace-nowrap">
            <Music size={12} className="text-accent" />{item.totalTracks || 0} {t('recordPool.tracks')}
          </span>
        </div>
        <ChevronRight size={16} className="text-brand-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}

// List-view row for any collection
function CollectionRow({ item, index, onClick }) {
  const { t } = useTranslation();
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [imgError, setImgError] = useState(false);
  const isSource = item._itemType === 'source' || item._type === 'source';
  const badge = isSource ? item.platform : item.year ? String(item.year) : null;
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 p-2.5 rounded-xl bg-dark-elevated border border-white/[0.05] hover:border-accent/20 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] animate-in fade-in"
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms`, animationFillMode: 'both' }}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-dark-surface flex-shrink-0">
        {item.thumbnail && !imgError
          ? <img src={item.thumbnail} alt={item.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}><Layers2 size={20} className="text-white/30" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate group-hover:text-accent transition-colors">{item.name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-brand-text-tertiary">
          <span className="flex items-center gap-1"><Disc size={10} className="text-accent" />{item.totalAlbums || 0} {t('recordPool.albums')}</span>
          <span className="flex items-center gap-1"><Music size={10} className="text-accent" />{item.totalTracks || 0} {t('recordPool.tracks')}</span>
          {badge && <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold">{badge}</span>}
        </div>
      </div>
      <ChevronRight size={15} className="text-white/20 group-hover:text-accent group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </div>
  );
}

// Resolve the best cover image for an album (coverArt → source thumbnail → null)
function albumCover(album) {
  return album.coverArt || album.sourceId?.thumbnail || album.collectionId?.thumbnail || null;
}

// Album Card with hover animation
function AlbumCard({ album, index, onClick, onPlay, onDownload }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const cover = albumCover(album);
  const delay = Math.min(index * 50, 400);
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden bg-dark-elevated border border-white/[0.06] hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 animate-in fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-square overflow-hidden bg-dark-surface">
        {cover && !imgError ? (
          <img
            src={cover}
            alt={album.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center`}>
            <Music size={32} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button type="button" onClick={e => { e.stopPropagation(); onPlay?.(); }}
            className="w-11 h-11 rounded-full bg-accent shadow-lg shadow-accent/40 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={18} className="text-white ml-0.5" fill="white" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); e.preventDefault(); onDownload?.(); }}
            className="w-11 h-11 rounded-full bg-white/90 shadow-lg flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
            <Download size={16} className="text-black" />
          </button>
        </div>
        {/* New badge for recent uploads */}
        {album.createdAt && (Date.now() - new Date(album.createdAt)) < 7 * 86400000 && (
          <span className="absolute top-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">{t('recordPool.newBadge')}</span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-semibold text-white text-xs truncate mb-1 group-hover:text-accent transition-colors">{album.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-brand-text-tertiary text-[10px]">{album.trackCount || 0} {t('recordPool.tracks')}</span>
          {album.genre && (
            <span className="px-1.5 py-0.5 bg-white/[0.08] text-brand-text-tertiary text-[9px] rounded font-medium truncate max-w-[70px]">{album.genre}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Album list-view row
function AlbumRow({ album, index, onClick, onDownload }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const cover = albumCover(album);
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 p-2.5 rounded-xl bg-dark-elevated border border-white/[0.05] hover:border-accent/20 cursor-pointer transition-all duration-200 hover:bg-white/[0.03] animate-in fade-in"
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms`, animationFillMode: 'both' }}
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-dark-surface flex-shrink-0">
        {cover && !imgError
          ? <img src={cover} alt={album.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center`}><Music size={16} className="text-white/30" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate group-hover:text-accent transition-colors">{album.name}</p>
        <p className="text-[10px] text-brand-text-tertiary mt-0.5">{album.trackCount || 0} {t('recordPool.tracks')}{album.genre ? ` · ${album.genre}` : ''}</p>
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDownload?.(); }}
        className="p-2 rounded-lg bg-white/5 hover:bg-accent/20 hover:text-accent text-brand-text-tertiary transition-all opacity-0 group-hover:opacity-100"
        title={t('actions.download')}
      >
        <Download size={15} />
      </button>
      <ChevronRight size={16} className="text-white/20 group-hover:text-accent group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader className="w-8 h-8 text-accent animate-spin" />
    </div>
  );
}

// Empty State
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <Icon size={48} className="text-brand-text-tertiary opacity-30 mb-4" />
      <p className="text-brand-text-tertiary">{text}</p>
    </div>
  );
}
