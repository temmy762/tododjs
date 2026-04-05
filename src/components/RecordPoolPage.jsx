import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Disc, Music, ChevronRight, ArrowLeft, Loader, Download, Play,
  Search, SlidersHorizontal, Tag, X, Grid3x3, List, Calendar, SortAsc
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

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest First',    icon: Calendar },
  { value: 'oldest',  label: 'Oldest First',     icon: Calendar },
  { value: 'name',    label: 'Name A–Z',         icon: SortAsc },
  { value: 'tracks',  label: 'Most Tracks',      icon: Music },
];

export default function RecordPoolPage({ onAlbumClick, onAlbumDownload }) {
  const [view, setView] = useState('list');
  const [poolItems, setPoolItems]     = useState([]);
  const [albums, setAlbums]           = useState([]);
  const [categories, setCategories]   = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading]         = useState(false);

  // filters
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [albumCategory, setAlbumCategory]   = useState(null);
  const [sort, setSort]               = useState('newest');
  const [albumViewMode, setAlbumViewMode]   = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  // ─── data fetching ──────────────────────────────────────────────────────────

  const fetchPoolItems = useCallback(async () => {
    try {
      setLoading(true);
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
    } catch (err) { console.error('RecordPoolPage fetch error:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchAlbums = useCallback(async (item) => {
    try {
      setLoading(true);
      const url = item._type === 'source'
        ? `${API_URL}/albums?sourceId=${item._id}&limit=200`
        : `${API_URL}/collections/${item._id}/albums`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.success) setAlbums(data.data || []);
    } catch (err) { console.error('fetchAlbums error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPoolItems(); }, [fetchPoolItems]);

  // ─── derived lists ──────────────────────────────────────────────────────────

  const filteredPools = useMemo(() => {
    let items = [...poolItems];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(q));
    }
    if (activeCategory) {
      items = items.filter(i =>
        (i.genre || i.platform || '')
          .toLowerCase()
          .includes(activeCategory.toLowerCase()) ||
        i.name?.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }
    switch (sort) {
      case 'oldest':  items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'name':    items.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'tracks':  items.sort((a, b) => (b.totalTracks || 0) - (a.totalTracks || 0)); break;
      default:        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return items;
  }, [poolItems, search, activeCategory, sort]);

  const filteredAlbums = useMemo(() => {
    let list = [...albums];
    if (albumCategory) list = list.filter(a => a.genre?.toLowerCase() === albumCategory.toLowerCase());
    if (search.trim())  list = list.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()));
    switch (sort) {
      case 'oldest':  list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'name':    list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'tracks':  list.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0)); break;
      default:        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [albums, albumCategory, search, sort]);

  // album genre options derived from loaded albums
  const albumGenres = useMemo(() => {
    const genres = [...new Set(albums.map(a => a.genre).filter(Boolean))];
    return genres.sort();
  }, [albums]);

  // ─── navigation ─────────────────────────────────────────────────────────────

  const openItem = (item) => {
    setSelectedItem(item);
    setView('albums');
    setSearch('');
    setAlbumCategory(null);
    fetchAlbums(item);
  };

  const goBack = () => {
    setView('list');
    setSelectedItem(null);
    setAlbums([]);
    setSearch('');
    setAlbumCategory(null);
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6">

      {/* Back */}
      {view !== 'list' && (
        <button onClick={goBack} className="flex items-center gap-1.5 text-brand-text-tertiary hover:text-white transition-colors mb-5 text-sm">
          <ArrowLeft size={16} /> Back to Record Pools
        </button>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        {view === 'list' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">Record Pools</h1>
            <p className="text-brand-text-tertiary text-sm">
              {filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''} available
            </p>
          </div>
        ) : selectedItem ? (
          <CollectionHeader collection={selectedItem} albumCount={filteredAlbums.length} />
        ) : null}

        {/* Search + Sort + Filter controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={view === 'list' ? 'Search pools…' : 'Search albums…'}
              className="pl-8 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary/60 focus:outline-none focus:border-accent/50 w-44"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg text-sm text-white pl-3 pr-7 py-2 focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <SlidersHorizontal size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-text-tertiary pointer-events-none" />
          </div>

          {view === 'albums' && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button onClick={() => setAlbumViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${albumViewMode === 'grid' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}>
                <Grid3x3 size={14} />
              </button>
              <button onClick={() => setAlbumViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${albumViewMode === 'list' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}>
                <List size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      {view === 'list' && categories.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !activeCategory ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white border border-white/10'
            }`}
          >
            <Disc size={11} /> All Pools
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.name
                  ? 'text-white'
                  : 'bg-white/5 text-brand-text-tertiary hover:text-white border border-white/10'
              }`}
              style={activeCategory === cat.name ? { backgroundColor: cat.color || '#7C3AED' } : {}}
            >
              <Tag size={10} />
              {cat.name}
              {cat.trackCount > 0 && (
                <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{cat.trackCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Album genre filter pills (inside a pool) */}
      {view === 'albums' && albumGenres.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setAlbumCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !albumCategory ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white border border-white/10'
            }`}
          >All Genres</button>
          {albumGenres.map(g => (
            <button
              key={g}
              onClick={() => setAlbumCategory(albumCategory === g ? null : g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                albumCategory === g ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white border border-white/10'
              }`}
            >{g}</button>
          ))}
        </div>
      )}

      {/* Pool list */}
      {view === 'list' && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPools.map((item, i) => (
              <PoolCard key={item._id} item={item} index={i} onClick={() => openItem(item)} />
            ))}
            {filteredPools.length === 0 && <EmptyState icon={Disc} text={search || activeCategory ? 'No pools match your filters' : 'No record pools available yet'} />}
          </div>
        )
      )}

      {/* Album grid / list */}
      {view === 'albums' && (
        loading ? <LoadingState /> : albumViewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAlbums.map((album, i) => (
              <AlbumCard key={album._id} album={album} index={i}
                onClick={() => onAlbumClick?.(album)}
                onPlay={() => onAlbumClick?.(album, { autoPlay: true })}
                onDownload={() => onAlbumDownload?.(album)}
              />
            ))}
            {filteredAlbums.length === 0 && <EmptyState icon={Music} text="No albums match your filters" />}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlbums.map((album, i) => (
              <AlbumRow key={album._id} album={album} index={i}
                onClick={() => onAlbumClick?.(album)}
                onDownload={() => onAlbumDownload?.(album)}
              />
            ))}
            {filteredAlbums.length === 0 && <EmptyState icon={Music} text="No albums match your filters" />}
          </div>
        )
      )}
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

// Album Card with hover animation
function AlbumCard({ album, index, onClick, onPlay, onDownload }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-square overflow-hidden bg-dark-surface">
        {album.coverArt && !imgError ? (
          <img
            src={album.coverArt}
            alt={album.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music size={48} className="text-white/10" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Play and Download buttons on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              className="w-14 h-14 rounded-full bg-accent shadow-lg shadow-accent/40 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-500"
              title="Play Album"
            >
              <Play size={24} className="text-white ml-1" fill="white" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
              className="w-14 h-14 rounded-full bg-white shadow-lg shadow-black/30 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-500"
              title="Download All"
            >
              <Download size={22} className="text-black" />
            </button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white truncate mb-1 group-hover:text-accent transition-colors duration-300">{album.name}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-text-tertiary">{album.trackCount || 0} tracks</span>
          {album.genre && (
            <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium">{album.genre}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Album list-view row
function AlbumRow({ album, index, onClick, onDownload }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 p-3 rounded-xl bg-dark-elevated border border-white/5 hover:border-accent/20 cursor-pointer transition-all duration-200 hover:bg-white/[0.02] animate-in fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'both' }}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-surface flex-shrink-0">
        {album.coverArt && !imgError
          ? <img src={album.coverArt} alt={album.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music size={20} className="text-white/20" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate group-hover:text-accent transition-colors">{album.name}</p>
        <p className="text-xs text-brand-text-tertiary mt-0.5">{album.trackCount || 0} tracks{album.genre ? ` · ${album.genre}` : ''}</p>
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
