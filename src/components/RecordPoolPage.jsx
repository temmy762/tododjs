import { useState, useEffect, useCallback } from 'react';
import { Disc, Calendar, Music, ChevronRight, ArrowLeft, Loader, Download, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';


export default function RecordPoolPage({ onAlbumClick, onAlbumDownload, onTrackInteraction }) {
  const { t } = useTranslation();
  const [view, setView] = useState('list'); // list | dateCards | albums
  const [collections, setCollections] = useState([]);
  const [sources, setSources] = useState([]);
  const [dateCards, setDateCards] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null); // { ...item, _type: 'collection'|'source' }
  const [selectedDateCard, setSelectedDateCard] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [colRes, srcRes] = await Promise.all([
        fetch(`${API_URL}/collections`),
        fetch(`${API_URL}/sources`)
      ]);
      const [colData, srcData] = await Promise.all([colRes.json(), srcRes.json()]);
      if (colData.success) setCollections((colData.data || []).filter(c => c.status === 'completed'));
      if (srcData.success) setSources(srcData.data || []);
    } catch (err) { console.error('Error fetching record pool:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchDateCards = useCallback(async (parent) => {
    try {
      setLoading(true);
      const url = parent._type === 'source'
        ? `${API_URL}/date-packs/source/${parent._id}`
        : `${API_URL}/collections/${parent._id}/date-packs`;
      const res = await fetch(url);
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

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openParent = (item) => {
    setSelectedParent(item);
    setSelectedDateCard(null);
    setView('dateCards');
    fetchDateCards(item);
  };

  const openDateCard = (dc) => {
    setSelectedDateCard(dc);
    setView('albums');
    fetchAlbums(dc._id);
  };

  const goBack = () => {
    if (view === 'albums') {
      setView('dateCards');
      setSelectedDateCard(null);
    } else if (view === 'dateCards') {
      setView('list');
      setSelectedParent(null);
    }
  };

  const allItems = [
    ...collections.map(c => ({ ...c, _type: 'collection' })),
    ...sources.map(s => ({ ...s, _type: 'source' }))
  ];

  return (
    <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6">
      {/* Header */}
      <div className="mb-8">
        {view !== 'list' && (
          <button onClick={goBack} className="flex items-center gap-1.5 text-brand-text-tertiary hover:text-white transition-colors mb-4 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {view === 'list' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Records Pools</h1>
            <p className="text-brand-text-tertiary">Accede a todas tus record pools y packs Premium en un único lugar.</p>
          </div>
        )}

        {view === 'dateCards' && selectedParent && (
          <ParentHeader parent={selectedParent} />
        )}

        {view === 'albums' && selectedDateCard && selectedParent && (
          <DateCardHeader dateCard={selectedDateCard} parent={selectedParent} />
        )}
      </div>

      {/* Unified List Grid */}
      {view === 'list' && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allItems.map((item, i) => (
              <PoolCard key={`${item._type}-${item._id}`} item={item} index={i} onClick={() => openParent(item)} />
            ))}
            {allItems.length === 0 && <EmptyState icon={Disc} text="No record pools available yet" />}
          </div>
        )
      )}

      {/* Date Cards */}
      {view === 'dateCards' && selectedParent && (
        loading ? <LoadingState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dateCards.map((dc, i) => (
              <DateCard key={dc._id} dateCard={dc} index={i} onClick={() => openDateCard(dc)} />
            ))}
            {dateCards.length === 0 && <EmptyState icon={Calendar} text="No date cards yet" />}
          </div>
        )
      )}

      {/* Albums */}
      {view === 'albums' && selectedDateCard && (
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
            {albums.length === 0 && <EmptyState icon={Music} text="No albums in this date pack yet" />}
          </div>
        )
      )}
    </div>
  );
}

// Parent Header (Collection or Source)
function ParentHeader({ parent }) {
  return (
    <div className="flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex-shrink-0 bg-dark-surface flex items-center justify-center">
        {parent.thumbnail
          ? <img src={parent.thumbnail} alt={parent.name} className="w-full h-full object-cover" />
          : <Disc size={36} className="text-accent" />}
      </div>
      <div>
        <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">Record Pool</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{parent.name}</h1>
        <div className="flex items-center gap-3 text-sm text-brand-text-tertiary">
          {parent.year && <span>{parent.year}</span>}
          {parent.platform && <><span className="text-white/20">|</span><span>{parent.platform}</span></>}
          {parent._type === 'collection' && <><span className="text-white/20">|</span><span>{parent.totalDatePacks || 0} date packs</span></>}
          <span className="text-white/20">|</span>
          <span>{parent.totalTracks || 0} tracks</span>
        </div>
      </div>
    </div>
  );
}

// Date Card Header
function DateCardHeader({ dateCard, parent }) {
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
          <span>{parent.name}</span>
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

// Unified Pool Card (Collection or Source)
function PoolCard({ item, index, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-elevated border border-white/5 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-dark-surface">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Disc size={48} className="text-white/10" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{item.name}</h3>
          <p className="text-white/60 text-sm">{item.year}{item.platform && ` • ${item.platform}`}</p>
        </div>
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          {item._type === 'collection'
            ? <span className="text-brand-text-tertiary"><Disc size={14} className="inline mr-1 text-accent" />{item.totalDatePacks || 0} packs</span>
            : <span className="text-brand-text-tertiary"><Disc size={14} className="inline mr-1 text-accent" />{item.totalAlbums || 0} albums</span>
          }
          <span className="text-brand-text-tertiary"><Music size={14} className="inline mr-1 text-accent" />{item.totalTracks || 0} tracks</span>
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
