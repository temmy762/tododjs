import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Disc, Music, ChevronRight, ArrowLeft, Loader, Download, Play,
  Search, X, Grid3x3, List, Layers, ChevronLeft, ChevronRight as ChevronRightIcon,
  Flame, Clock, SortAsc, Filter
} from 'lucide-react';
import API_URL from '../config/api';

const GRADIENTS = [
  'from-purple-600 to-indigo-800',
  'from-pink-600 to-rose-800',
  'from-blue-600 to-cyan-800',
  'from-orange-600 to-red-800',
  'from-green-600 to-teal-800',
  'from-yellow-600 to-amber-800',
];

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name',   label: 'Name A–Z'    },
  { value: 'tracks', label: 'Most Tracks'  },
];

/**
 * RecordPoolPage — DJ-first UX
 *
 * Primary view: Category tab bar → album feed filtered by genre.
 *   Think like a DJ: browse AFRO HOUSE, LATIN BOX, etc. and see what dropped today.
 * Secondary view: "Browse Pools" → pool cards → albums inside a pool.
 */
export default function RecordPoolPage({ onAlbumClick, onAlbumDownload }) {
  // ─── mode: 'feed' | 'pools' | 'pool-detail' ─────────────────────────────────
  const [mode, setMode]             = useState('feed');   // DJ album feed
  const [poolItems, setPoolItems]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [loadingMeta, setLoadingMeta]   = useState(true);

  // feed state
  const [feedAlbums, setFeedAlbums]   = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage]       = useState(1);
  const [feedTotal, setFeedTotal]     = useState(0);
  const FEED_LIMIT = 24;

  // pool-detail state
  const [poolAlbums, setPoolAlbums]     = useState([]);
  const [poolLoading, setPoolLoading]   = useState(false);

  // filters
  const [activeCategory, setActiveCategory] = useState(null); // null = All
  const [search, setSearch]               = useState('');
  const [sort, setSort]                   = useState('newest');
  const [viewMode, setViewMode]           = useState('grid');

  const tabBarRef = useRef(null);

  // ─── initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const [colRes, srcRes, catRes] = await Promise.all([
          fetch(`${API_URL}/collections`),
          fetch(`${API_URL}/sources`),
          fetch(`${API_URL}/categories`),
        ]);
        const [colData, srcData, catData] = await Promise.all([
          colRes.json(), srcRes.json(), catRes.json()
        ]);
        const cols = (colData.success ? colData.data || [] : []).map(c => ({ ...c, _type: 'collection' }));
        const srcs = (srcData.success ? srcData.data || [] : []).map(s => ({ ...s, _type: 'source' }));
        setPoolItems([...srcs, ...cols]);
        setCategories(catData.success ? catData.data || [] : []);
      } catch { /* ignore */ }
      finally { setLoadingMeta(false); }
    })();
  }, []);

  // ─── fetch album feed (DJ view) ───────────────────────────────────────────────
  const fetchFeed = useCallback(async (page, category, searchQ, sortV) => {
    setFeedLoading(true);
    try {
      const params = new URLSearchParams({ limit: FEED_LIMIT, page });
      if (category)  params.set('category', category);
      if (searchQ.trim()) params.set('search', searchQ.trim());
      const sortMap = { newest: '-createdAt', oldest: 'createdAt', name: 'name', tracks: '-trackCount' };
      params.set('sort', sortMap[sortV] || '-createdAt');
      const res  = await fetch(`${API_URL}/albums?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeedAlbums(data.data || []);
        setFeedTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    finally { setFeedLoading(false); }
  }, []);

  // re-fetch when feed filters change
  useEffect(() => {
    if (mode === 'feed') fetchFeed(feedPage, activeCategory, search, sort);
  }, [mode, feedPage, activeCategory, search, sort, fetchFeed]);

  // reset page on filter change
  useEffect(() => { setFeedPage(1); }, [activeCategory, search, sort]);

  // ─── fetch pool detail albums ─────────────────────────────────────────────────
  const openPool = useCallback(async (item) => {
    setSelectedPool(item);
    setMode('pool-detail');
    setPoolLoading(true);
    try {
      const url = item._type === 'source'
        ? `${API_URL}/albums?sourceId=${item._id}&limit=200`
        : `${API_URL}/collections/${item._id}/albums`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.success) setPoolAlbums(data.data || []);
    } catch { /* ignore */ }
    finally { setPoolLoading(false); }
  }, []);

  // ─── filtered pool detail list ────────────────────────────────────────────────
  const filteredPoolAlbums = useMemo(() => {
    let list = [...poolAlbums];
    if (search.trim()) list = list.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()));
    switch (sort) {
      case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'name':   list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'tracks': list.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0)); break;
      default:       list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [poolAlbums, search, sort]);

  // By Pool view: only show Sources (actual record pool brands), not upload Collections
  const filteredPools = useMemo(() => {
    const sources = poolItems.filter(i => i._type === 'source');
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(i => i.name?.toLowerCase().includes(q));
  }, [poolItems, search]);

  // ─── helpers ──────────────────────────────────────────────────────────────────
  const goBack = () => {
    if (mode === 'pool-detail') { setMode('pools'); setSelectedPool(null); setPoolAlbums([]); }
    else setMode('feed');
    setSearch('');
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(prev => prev === cat ? null : cat);
    setMode('feed');
  };

  const feedPages = Math.max(1, Math.ceil(feedTotal / FEED_LIMIT));

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* ── Sticky header + category tabs ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/[0.06]">

        {/* Title row */}
        <div className="px-4 md:px-10 pt-5 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {mode !== 'feed' && (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white transition-all">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {mode === 'pool-detail' && selectedPool ? selectedPool.name
                  : mode === 'pools' ? 'Browse Pools'
                  : 'Record Pools'}
              </h1>
              <p className="text-[11px] text-brand-text-tertiary mt-0.5">
                {mode === 'feed' && !activeCategory ? `${feedTotal.toLocaleString()} albums across all pools`
                  : mode === 'feed' && activeCategory ? `${feedTotal.toLocaleString()} albums in ${activeCategory}`
                  : mode === 'pools' ? `${filteredPools.length} pools available`
                  : `${filteredPoolAlbums.length} albums`}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-7 pr-7 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50 w-36"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Sort — dark bg so option text is readable on all OS */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-[#1c1c2e] border border-white/10 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1c1c2e', color: '#fff' }}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Grid / List toggle */}
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

            {/* Browse Pools toggle */}
            <button
              onClick={() => { setMode(m => m === 'pools' ? 'feed' : 'pools'); setSearch(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                mode === 'pools' ? 'bg-accent border-accent text-white' : 'bg-white/[0.06] border-white/10 text-brand-text-tertiary hover:text-white'
              }`}
            >
              <Layers size={13} /> {mode === 'pools' ? 'By Genre' : 'By Pool'}
            </button>
          </div>
        </div>

        {/* Category tabs — only shown in feed mode */}
        {mode === 'feed' && !loadingMeta && (
          <div className="relative px-4 md:px-10 pb-0">
            <div ref={tabBarRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden pb-3 scroll-smooth">
              {/* All tab */}
              <button
                onClick={() => handleCategoryClick(null)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  !activeCategory
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-brand-text-tertiary hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Flame size={13} className={!activeCategory ? 'text-white' : 'text-brand-text-tertiary'} />
                All New Drops
              </button>

              {categories.map(cat => {
                const isActive = activeCategory === cat.name;
                return (
                  <button
                    key={cat._id}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                      isActive ? 'text-white shadow-lg' : 'text-brand-text-tertiary hover:text-white hover:bg-white/[0.06]'
                    }`}
                    style={isActive ? { backgroundColor: cat.color || '#7C3AED', boxShadow: `0 4px 14px ${cat.color || '#7C3AED'}40` } : {}}
                  >
                    {cat.thumbnail
                      ? <img src={cat.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover" onError={e => e.target.style.display='none'} />
                      : <Disc size={12} />}
                    {cat.name}
                    {cat.trackCount > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-white/20' : 'bg-white/10 text-brand-text-tertiary'}`}>
                        {cat.trackCount.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-10 py-5">

        {/* Mobile search bar */}
        <div className="relative sm:hidden mb-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search albums or pools…"
            className="w-full pl-7 pr-7 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white">
              <X size={11} />
            </button>
          )}
        </div>

        {/* ── FEED: latest albums by category ─────────────────────────────── */}
        {mode === 'feed' && (
          <>
            {feedLoading ? <LoadingState /> : feedAlbums.length === 0 ? (
              <EmptyState icon={Music} text={activeCategory ? `No albums in ${activeCategory} yet` : 'No albums available yet'} />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {feedAlbums.map((album, i) => (
                  <AlbumCard key={album._id} album={album} index={i}
                    onClick={() => onAlbumClick?.(album)}
                    onPlay={() => onAlbumClick?.(album, { autoPlay: true })}
                    onDownload={() => onAlbumDownload?.(album)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {feedAlbums.map((album, i) => (
                  <AlbumRow key={album._id} album={album} index={i}
                    onClick={() => onAlbumClick?.(album)}
                    onDownload={() => onAlbumDownload?.(album)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {feedPages > 1 && !feedLoading && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setFeedPage(p => Math.max(1, p - 1))}
                  disabled={feedPage === 1}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-brand-text-tertiary">
                  Page <span className="text-white font-semibold">{feedPage}</span> of {feedPages}
                </span>
                <button
                  onClick={() => setFeedPage(p => Math.min(feedPages, p + 1))}
                  disabled={feedPage === feedPages}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 hover:bg-white/10 transition-all"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── POOLS: browse pool cards ─────────────────────────────────────── */}
        {mode === 'pools' && (
          loadingMeta ? <LoadingState /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredPools.map((item, i) => (
                <PoolCard key={item._id} item={item} index={i} onClick={() => openPool(item)} />
              ))}
              {filteredPools.length === 0 && <EmptyState icon={Disc} text="No pools match your search" />}
            </div>
          )
        )}

        {/* ── POOL DETAIL: albums inside a specific pool ───────────────────── */}
        {mode === 'pool-detail' && selectedPool && (
          <>
            {selectedPool && (
              <CollectionHeader collection={selectedPool} albumCount={filteredPoolAlbums.length} />
            )}
            <div className="mt-5">
              {poolLoading ? <LoadingState /> : filteredPoolAlbums.length === 0 ? (
                <EmptyState icon={Music} text="No albums in this pool yet" />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredPoolAlbums.map((album, i) => (
                    <AlbumCard key={album._id} album={album} index={i}
                      onClick={() => onAlbumClick?.(album)}
                      onPlay={() => onAlbumClick?.(album, { autoPlay: true })}
                      onDownload={() => onAlbumDownload?.(album)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredPoolAlbums.map((album, i) => (
                    <AlbumRow key={album._id} album={album} index={i}
                      onClick={() => onAlbumClick?.(album)}
                      onDownload={() => onAlbumDownload?.(album)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Collection header shown when albums view is open
function CollectionHeader({ collection, albumCount }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex-shrink-0 bg-dark-surface flex items-center justify-center">
        {collection.thumbnail && !imgError
          ? <img src={collection.thumbnail} alt={collection.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[0]} flex items-center justify-center`}><Disc size={32} className="text-white/60" /></div>}
      </div>
      <div>
        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">Record Pool</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{collection.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-text-tertiary">
          {collection.year && <span>{collection.year}</span>}
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Disc size={13} className="text-accent" />{albumCount ?? collection.totalAlbums ?? 0} albums</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Music size={13} className="text-accent" />{collection.totalTracks || 0} tracks</span>
        </div>
      </div>
    </div>
  );
}

// Mother card for a collection
function PoolCard({ item, index, onClick }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-surface">
        {item.thumbnail && !imgError ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Disc size={52} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg line-clamp-2">{item.name}</h3>
          <p className="text-white/60 text-sm">{item.year}{item.platform && ` · ${item.platform}`}</p>
        </div>
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      {/* Stats */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-brand-text-tertiary flex items-center gap-1">
            <Disc size={13} className="text-accent" />{item.totalAlbums || 0} albums
          </span>
          <span className="text-brand-text-tertiary flex items-center gap-1">
            <Music size={13} className="text-accent" />{item.totalTracks || 0} tracks
          </span>
        </div>
        <ChevronRight size={18} className="text-brand-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}

// Resolve the best cover image for an album (coverArt → source thumbnail → null)
function albumCover(album) {
  return album.coverArt || album.sourceId?.thumbnail || album.collectionId?.thumbnail || null;
}

// Album Card with hover animation
function AlbumCard({ album, index, onClick, onPlay, onDownload }) {
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
          <button type="button" onClick={e => { e.stopPropagation(); onDownload?.(); }}
            className="w-11 h-11 rounded-full bg-white/90 shadow-lg flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
            <Download size={16} className="text-black" />
          </button>
        </div>
        {/* New badge for recent uploads */}
        {album.createdAt && (Date.now() - new Date(album.createdAt)) < 7 * 86400000 && (
          <span className="absolute top-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">New</span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-semibold text-white text-xs truncate mb-1 group-hover:text-accent transition-colors">{album.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-brand-text-tertiary text-[10px]">{album.trackCount || 0} tracks</span>
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
        <p className="text-[10px] text-brand-text-tertiary mt-0.5">{album.trackCount || 0} tracks{album.genre ? ` · ${album.genre}` : ''}</p>
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDownload?.(); }}
        className="p-2 rounded-lg bg-white/5 hover:bg-accent/20 hover:text-accent text-brand-text-tertiary transition-all opacity-0 group-hover:opacity-100"
        title="Download"
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
