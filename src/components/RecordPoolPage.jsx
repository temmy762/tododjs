import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Disc, Music, ChevronRight, ArrowLeft, Loader, Download, Play,
  Search, X, Grid3x3, List, ChevronLeft, ChevronRight as ChevronRightIcon,
  Calendar, Layers2
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

// Strip trailing vol/number/edition to get the series base name
function getSeriesName(name) {
  return name
    .replace(/[\s_\-]+(?:vol(?:ume)?\.?\s*\d+|ep\.?\s*\d+|n[o°]\.?\s*\d+|#\s*\d+|(?:part|pt)\.?\s*\d+|\b\d{1,2}(?:st|nd|rd|th)?\b)[\s.,:\-]*$/i, '')
    .trim() || name;
}

export default function RecordPoolPage({ onAlbumClick, onAlbumDownload }) {
  // ─── mode: 'pools' | 'pool-detail' ──────────────────────────────────────────
  const [mode, setMode]             = useState('pools');
  const [poolItems, setPoolItems]   = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [loadingMeta, setLoadingMeta]   = useState(true);

  // pool-detail state
  const [poolAlbums, setPoolAlbums]   = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);

  // filters
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // ─── initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      try {
        const [colRes, srcRes] = await Promise.all([
          fetch(`${API_URL}/collections`),
          fetch(`${API_URL}/sources`),
        ]);
        const [colData, srcData] = await Promise.all([colRes.json(), srcRes.json()]);
        const cols = (colData.success ? colData.data || [] : []).map(c => ({ ...c, _type: 'collection' }));
        const srcs = (srcData.success ? srcData.data || [] : []).map(s => ({ ...s, _type: 'source' }));
        setPoolItems([...srcs, ...cols]);
      } catch { /* ignore */ }
      finally { setLoadingMeta(false); }
    })();
  }, []);

  // ─── derived: sources (treated as collection cards) ──────────────────────────
  const sources = useMemo(() => poolItems.filter(i => i._type === 'source'), [poolItems]);

  // ─── derived: collection series grouped by (seriesName, year) ────────────────
  const collectionSeries = useMemo(() => {
    const completed = poolItems.filter(i => i._type === 'collection' && i.status === 'completed');
    const map = new Map();
    for (const col of completed) {
      const seriesName = getSeriesName(col.name);
      const year = col.year || new Date(col.createdAt || Date.now()).getFullYear();
      const key = `${seriesName.toLowerCase()}::${year}`;
      if (!map.has(key)) {
        map.set(key, {
          _id: key, _type: 'series', name: seriesName, year,
          collections: [], thumbnail: null, totalAlbums: 0, totalTracks: 0,
          createdAt: col.createdAt,
        });
      }
      const entry = map.get(key);
      entry.collections.push(col);
      entry.totalAlbums  += col.totalAlbums  || 0;
      entry.totalTracks  += col.totalTracks  || 0;
      if (!entry.thumbnail && col.thumbnail) entry.thumbnail = col.thumbnail;
      if (col.createdAt && (!entry.createdAt || col.createdAt > entry.createdAt)) entry.createdAt = col.createdAt;
    }
    return [...map.values()];
  }, [poolItems]);

  // ─── derived: all items merged + sorted ───────────────────────────────────────
  const allItems = useMemo(() => {
    const items = [
      ...sources.map(s => ({ ...s, _itemType: 'source' })),
      ...collectionSeries.map(s => ({ ...s, _itemType: 'series' })),
    ];
    switch (sort) {
      case 'oldest': items.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); break;
      case 'name':   items.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'tracks': items.sort((a, b) => (b.totalTracks || 0) - (a.totalTracks || 0)); break;
      default:       items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); break;
    }
    return items;
  }, [sources, collectionSeries, sort]);

  // ─── fetch pool/series detail albums ─────────────────────────────────────────
  const openPool = useCallback(async (item) => {
    setSelectedPool(item);
    setMode('pool-detail');
    setPoolLoading(true);
    try {
      let albums = [];
      if (item._type === 'source') {
        const res  = await fetch(`${API_URL}/albums?sourceId=${item._id}&limit=200`);
        const data = await res.json();
        if (data.success) albums = data.data || [];
      } else if (item._type === 'series') {
        const results = await Promise.all(
          item.collections.map(c =>
            fetch(`${API_URL}/collections/${c._id}/albums`).then(r => r.json())
          )
        );
        for (const data of results) {
          if (data.success) albums.push(...(data.data || []));
        }
        albums.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      setPoolAlbums(albums);
    } catch { /* ignore */ }
    finally { setPoolLoading(false); }
  }, []);

  // ─── filtered pool-detail albums ─────────────────────────────────────────────
  const filteredPoolAlbums = useMemo(() => {
    let list = search.trim()
      ? poolAlbums.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))
      : [...poolAlbums];
    switch (sort) {
      case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'name':   list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'tracks': list.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0)); break;
      default:       list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [poolAlbums, search, sort]);

  // ─── filtered sources & series for pools view ─────────────────────────────────
  const filteredSources = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(s => s.name?.toLowerCase().includes(q));
  }, [sources, search]);

  const filteredSeries = useMemo(() => {
    if (!search.trim()) return collectionSeries;
    const q = search.toLowerCase();
    return collectionSeries.filter(s => s.name?.toLowerCase().includes(q));
  }, [collectionSeries, search]);

  const filteredAllItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(i => i.name?.toLowerCase().includes(q));
  }, [allItems, search]);

  // ─── helpers ──────────────────────────────────────────────────────────────────
  const goBack = () => {
    setMode('pools');
    setSelectedPool(null);
    setPoolAlbums([]);
    setSearch('');
  };

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="px-4 md:px-10 pt-5 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {mode === 'pool-detail' && (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white transition-all">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {mode === 'pool-detail' && selectedPool ? selectedPool.name : 'Collections'}
              </h1>
              <p className="text-[11px] text-brand-text-tertiary mt-0.5">
                {mode === 'pool-detail'
                  ? `${filteredPoolAlbums.length} albums`
                  : `${filteredAllItems.length} collections`}
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

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-[#1c1c2e] border border-white/10 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1c1c2e', color: '#fff' }}>{o.label}</option>
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
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-10 py-5">

        {/* Mobile search */}
        <div className="relative sm:hidden mb-4">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search pools or collections…"
            className="w-full pl-7 pr-7 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white"><X size={11} /></button>}
        </div>

        {/* ── POOLS: All Collections (sources + series merged) ────────────── */}
        {mode === 'pools' && (
          loadingMeta ? <LoadingState /> : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers2 size={15} className="text-accent" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Collections</h2>
                <span className="text-xs text-brand-text-tertiary">({filteredAllItems.length})</span>
              </div>
              {filteredAllItems.length === 0 ? (
                <EmptyState icon={Layers2} text="No collections match your search" />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredAllItems.map((item, i) => (
                    <CollectionCard key={item._id} item={item} index={i} onClick={() => openPool(item)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAllItems.map((item, i) => (
                    <CollectionRow key={item._id} item={item} index={i} onClick={() => openPool(item)} />
                  ))}
                </div>
              )}
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

// Collection/Pool header shown when albums view is open
function CollectionHeader({ collection, albumCount }) {
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
          {isSeries ? 'Collection Series' : 'Record Pool'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{collection.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-text-tertiary">
          {collection.year && <span className="flex items-center gap-1"><Calendar size={12} /> {collection.year}</span>}
          {isSeries && collection.collections?.length > 1 && (
            <><span className="text-white/20">·</span>
            <span>{collection.collections.length} packs</span></>
          )}
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Disc size={13} className="text-accent" />{albumCount ?? collection.totalAlbums ?? 0} albums</span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1"><Music size={13} className="text-accent" />{collection.totalTracks || 0} tracks</span>
        </div>
      </div>
    </div>
  );
}

// Unified card for any collection (source or series)
function CollectionCard({ item, index, onClick }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const [imgError, setImgError] = useState(false);
  const isSource = item._itemType === 'source' || item._type === 'source';
  const subtitle = isSource
    ? (item.platform ? item.platform : null)
    : (item.year ? String(item.year) : null);
  const packCount = !isSource && item.collections?.length > 1 ? `${item.collections.length} packs` : null;
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-surface">
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
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white mb-0.5 drop-shadow-lg line-clamp-2">{item.name}</h3>
          {packCount && <p className="text-white/60 text-xs">{packCount}</p>}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-brand-text-tertiary flex items-center gap-1">
            <Disc size={12} className="text-accent" />{item.totalAlbums || 0} albums
          </span>
          <span className="text-brand-text-tertiary flex items-center gap-1">
            <Music size={12} className="text-accent" />{item.totalTracks || 0} tracks
          </span>
        </div>
        <ChevronRight size={16} className="text-brand-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}

// List-view row for any collection
function CollectionRow({ item, index, onClick }) {
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
          <span className="flex items-center gap-1"><Disc size={10} className="text-accent" />{item.totalAlbums || 0} albums</span>
          <span className="flex items-center gap-1"><Music size={10} className="text-accent" />{item.totalTracks || 0} tracks</span>
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
