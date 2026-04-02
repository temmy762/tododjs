import { useState, useEffect, useCallback } from 'react';
import { Disc, Music, ChevronRight, ArrowLeft, Loader, Download, Play } from 'lucide-react';
import API_URL from '../config/api';

// Gradient fallbacks when a card has no thumbnail
const GRADIENTS = [
  'from-purple-600 to-indigo-800',
  'from-pink-600 to-rose-800',
  'from-blue-600 to-cyan-800',
  'from-orange-600 to-red-800',
  'from-green-600 to-teal-800',
  'from-yellow-600 to-amber-800',
];

export default function RecordPoolPage({ onAlbumClick, onAlbumDownload }) {
  const [view, setView] = useState('list'); // list | albums
  const [collections, setCollections] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/collections`);
      const data = await res.json();
      if (data.success) setCollections(data.data || []);
    } catch (err) { console.error('Error fetching collections:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchAlbums = useCallback(async (collectionId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/collections/${collectionId}/albums`);
      const data = await res.json();
      if (data.success) setAlbums(data.data || []);
    } catch (err) { console.error('Error fetching albums:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const openCollection = (col) => {
    setSelectedCollection(col);
    setView('albums');
    fetchAlbums(col._id);
  };

  const goBack = () => {
    setView('list');
    setSelectedCollection(null);
    setAlbums([]);
  };

  return (
    <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6">
      {/* Header */}
      <div className="mb-8">
        {view !== 'list' && (
          <button onClick={goBack} className="flex items-center gap-1.5 text-brand-text-tertiary hover:text-white transition-colors mb-4 text-sm">
            <ArrowLeft size={16} /> Back to Record Pools
          </button>
        )}

        {view === 'list' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Record Pools</h1>
            <p className="text-brand-text-tertiary">Access all your premium record pools in one place.</p>
          </div>
        )}

        {view === 'albums' && selectedCollection && (
          <CollectionHeader collection={selectedCollection} />
        )}
      </div>

      {/* Collection Cards */}
      {view === 'list' && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((col, i) => (
              <PoolCard key={col._id} item={col} index={i} onClick={() => openCollection(col)} />
            ))}
            {collections.length === 0 && <EmptyState icon={Disc} text="No record pools available yet" />}
          </div>
        )
      )}

      {/* Albums (flat, sorted by date) */}
      {view === 'albums' && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map((album, i) => (
              <AlbumCard
                key={album._id}
                album={album}
                index={i}
                onClick={() => onAlbumClick?.(album)}
                onPlay={() => onAlbumClick?.(album, { autoPlay: true })}
                onDownload={() => onAlbumDownload?.(album)}
              />
            ))}
            {albums.length === 0 && <EmptyState icon={Music} text="No albums in this collection yet" />}
          </div>
        )
      )}
    </div>
  );
}

// Collection header shown when albums view is open
function CollectionHeader({ collection }) {
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
          <span className="flex items-center gap-1"><Disc size={13} className="text-accent" />{collection.totalAlbums || 0} albums</span>
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
