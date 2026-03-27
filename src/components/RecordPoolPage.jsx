import { useState, useEffect, useCallback } from 'react';
import { Disc, Calendar, Music, ChevronRight, ArrowLeft, Loader, Download, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';


export default function RecordPoolPage({ onAlbumClick, onAlbumDownload, onTrackInteraction }) {
  const { t } = useTranslation();
  const [view, setView] = useState('collections'); // collections | collection | dateCard
  const [collections, setCollections] = useState([]);
  const [dateCards, setDateCards] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedDateCard, setSelectedDateCard] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/collections`);
      const data = await res.json();
      if (data.success) setCollections((data.data || []).filter(c => c.status === 'completed'));
    } catch (err) { console.error('Error fetching collections:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchDateCards = useCallback(async (collectionId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/collections/${collectionId}/date-packs`);
      const data = await res.json();
      if (data.success) setDateCards(data.data);
    } catch (err) { console.error('Error fetching date cards:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchAlbums = useCallback(async (dateCardId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/date-packs/${dateCardId}/albums`);
      const data = await res.json();
      if (data.success) setAlbums(data.data);
    } catch (err) { console.error('Error fetching albums:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const openCollection = (collection) => {
    setSelectedCollection(collection);
    setSelectedDateCard(null);
    setView('collection');
    fetchDateCards(collection._id);
  };

  const openDateCard = (dc) => {
    setSelectedDateCard(dc);
    setView('dateCard');
    fetchAlbums(dc._id);
  };

  const goBack = () => {
    if (view === 'dateCard') {
      setView('collection');
      setSelectedDateCard(null);
    } else if (view === 'collection') {
      setView('collections');
      setSelectedCollection(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6">
      {/* Header */}
      <div className="mb-8">
        {view !== 'collections' && (
          <button onClick={goBack} className="flex items-center gap-1.5 text-brand-text-tertiary hover:text-white transition-colors mb-4 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {view === 'collections' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Records Pools</h1>
            <p className="text-brand-text-tertiary">Accede a todas tus record pools y packs Premium en un único lugar.</p>
          </div>
        )}

        {view === 'collection' && selectedCollection && (
          <CollectionHeader collection={selectedCollection} />
        )}

        {view === 'dateCard' && selectedDateCard && selectedCollection && (
          <DateCardHeader dateCard={selectedDateCard} collection={selectedCollection} />
        )}
      </div>

      {/* Collections Grid */}
      {view === 'collections' && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((col, i) => (
              <CollectionCard key={col._id} collection={col} index={i} onClick={() => openCollection(col)} />
            ))}
            {collections.length === 0 && <EmptyState icon={Disc} text="No record pools available yet" />}
          </div>
        )
      )}

      {/* Collection Detail — Date Cards */}
      {view === 'collection' && selectedCollection && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dateCards.map((dc, i) => (
              <DateCard key={dc._id} dateCard={dc} index={i} onClick={() => openDateCard(dc)} />
            ))}
            {dateCards.length === 0 && <EmptyState icon={Calendar} text="No date cards in this collection yet" />}
          </div>
        )
      )}

      {/* Date Card Detail — Albums */}
      {view === 'dateCard' && selectedDateCard && (
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
            {albums.length === 0 && <EmptyState icon={Music} text="No albums in this date card yet" />}
          </div>
        )
      )}
    </div>
  );
}

// Collection Header
function CollectionHeader({ collection }) {
  return (
    <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex-shrink-0 bg-dark-surface flex items-center justify-center">
        {collection.thumbnail
          ? <img src={collection.thumbnail} alt={collection.name} className="w-full h-full object-cover" />
          : <Disc size={36} className="text-accent" />}
      </div>
      <div>
        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">Record Pool</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{collection.name}</h1>
        <div className="flex items-center gap-3 text-sm text-brand-text-tertiary">
          <span>{collection.year}</span>
          {collection.platform && <><span className="text-white/20">|</span><span>{collection.platform}</span></>}
          <span className="text-white/20">|</span>
          <span>{collection.totalDatePacks || 0} date packs</span>
          <span className="text-white/20">|</span>
          <span>{collection.totalTracks || 0} tracks</span>
        </div>
      </div>
    </div>
  );
}

// Date Card Header
function DateCardHeader({ dateCard, collection }) {
  const dateStr = new Date(dateCard.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex-shrink-0 bg-dark-surface flex items-center justify-center">
        {dateCard.thumbnail
          ? <img src={dateCard.thumbnail} alt={dateCard.name} className="w-full h-full object-cover" />
          : <Calendar size={36} className="text-accent" />}
      </div>
      <div>
        <div className="flex items-center gap-2 text-xs text-brand-text-tertiary mb-1">
          <span className="text-accent font-semibold uppercase tracking-wider">Date Pack</span>
          <ChevronRight size={12} />
          <span>{collection.name}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{dateCard.name}</h1>
        <div className="flex items-center gap-3 text-sm text-brand-text-tertiary">
          <Calendar size={14} className="text-accent" />
          <span>{dateStr}</span>
          <span className="text-white/20">|</span>
          <span>{dateCard.totalAlbums || 0} albums</span>
          <span className="text-white/20">|</span>
          <span>{dateCard.totalTracks || 0} tracks</span>
        </div>
      </div>
    </div>
  );
}

// Collection Card with hover animation
function CollectionCard({ collection, index, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-surface">
        {collection.thumbnail ? (
          <img
            src={collection.thumbnail}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Disc size={48} className="text-white/10" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{collection.name}</h3>
          <p className="text-white/60 text-sm">{collection.year} {collection.platform && `• ${collection.platform}`}</p>
        </div>
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-brand-text-tertiary"><Disc size={14} className="inline mr-1 text-accent" />{collection.totalDatePacks || 0} packs</span>
          <span className="text-brand-text-tertiary"><Music size={14} className="inline mr-1 text-accent" />{collection.totalTracks || 0} tracks</span>
        </div>
        <ChevronRight size={18} className="text-brand-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}

// Date Card with hover animation
function DateCard({ dateCard, index, onClick }) {
  const dateStr = new Date(dateCard.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-square overflow-hidden bg-dark-surface">
        {dateCard.thumbnail ? (
          <img
            src={dateCard.thumbnail}
            alt={dateCard.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Calendar size={48} className="text-white/10" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-medium text-white/90 flex items-center gap-1">
          <Calendar size={11} />{dateStr}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white drop-shadow-lg">{dateCard.name}</h3>
        </div>
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-brand-text-tertiary"><Disc size={13} className="inline mr-1 text-accent" />{dateCard.totalAlbums || 0}</span>
          <span className="text-brand-text-tertiary"><Music size={13} className="inline mr-1 text-accent" />{dateCard.totalTracks || 0}</span>
        </div>
        <ChevronRight size={16} className="text-brand-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}

// Album Card with hover animation
function AlbumCard({ album, index, onClick, onPlay, onDownload }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-square overflow-hidden bg-dark-surface">
        {album.coverArt ? (
          <img
            src={album.coverArt}
            alt={album.name}
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
