import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FolderOpen, Music, Trash2, Eye, Plus, AlertCircle, CheckCircle, X, ChevronRight, Home, Calendar, Disc, Edit2, Loader, Image as ImageIcon, Star, Minimize2, Maximize2 } from 'lucide-react';
import ManageAlbumModal from './ManageAlbumModal';
import API_URL from '../../config/api';

const API = API_URL;
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Authorization': `Bearer ${getToken()}` });

export default function AdminRecordPool() {
  const [view, setView] = useState('sources'); // sources | dateCards | albums
  const [sources, setSources] = useState([]);
  const [dateCards, setDateCards] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDateCard, setSelectedDateCard] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // 'createSource' | 'editSource' | 'createDateCard' | 'editDateCard' | 'uploadAlbum'
  const [editItem, setEditItem] = useState(null);

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/sources`);
      const data = await res.json();
      if (data.success) setSources(data.data);
    } catch (err) { console.error('Error fetching sources:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchDateCards = useCallback(async (sourceId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/date-packs/source/${sourceId}`);
      const data = await res.json();
      if (data.success) setDateCards(data.data);
    } catch (err) { console.error('Error fetching date cards:', err); }
    finally { setLoading(false); }
  }, []);

  const fetchAlbums = useCallback(async (dateCardId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/date-packs/${dateCardId}/albums`);
      const data = await res.json();
      if (data.success) setAlbums(data.data);
    } catch (err) { console.error('Error fetching albums:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const navigateToSource = (source) => {
    setSelectedSource(source);
    setSelectedDateCard(null);
    setView('dateCards');
    fetchDateCards(source._id);
  };

  const navigateToDateCard = (dc) => {
    setSelectedDateCard(dc);
    setView('albums');
    fetchAlbums(dc._id);
  };

  const navigateBack = (target) => {
    if (target === 'sources') {
      setView('sources');
      setSelectedSource(null);
      setSelectedDateCard(null);
      fetchSources();
    } else if (target === 'dateCards') {
      setView('dateCards');
      setSelectedDateCard(null);
      if (selectedSource) fetchDateCards(selectedSource._id);
    }
  };

  const handleDeleteSource = async (source) => {
    if (!confirm(`Delete "${source.name}"? This will delete ALL date cards, albums, and tracks under it.`)) return;
    try {
      const res = await fetch(`${API}/sources/${source._id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) fetchSources();
    } catch (err) { console.error('Error deleting source:', err); }
  };

  const handleDeleteDateCard = async (dc) => {
    if (!confirm(`Delete "${dc.name}"? This will delete all albums and tracks.`)) return;
    try {
      const res = await fetch(`${API}/date-packs/${dc._id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success && selectedSource) fetchDateCards(selectedSource._id);
    } catch (err) { console.error('Error deleting date card:', err); }
  };

  const handleDeleteAlbum = async (album) => {
    if (!confirm(`Delete "${album.name}"? This will delete all tracks.`)) return;
    try {
      const res = await fetch(`${API}/albums/${album._id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success && selectedDateCard) fetchAlbums(selectedDateCard._id);
    } catch (err) { console.error('Error deleting album:', err); }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Record Pool Management</h1>
            <p className="text-brand-text-tertiary text-sm">Manage sources, date cards, and albums</p>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => navigateBack('sources')} className={`flex items-center gap-1 transition-colors ${view === 'sources' ? 'text-white font-semibold' : 'text-brand-text-tertiary hover:text-accent'}`}>
            <Home size={14} /> Sources
          </button>
          {selectedSource && (
            <>
              <ChevronRight size={14} className="text-brand-text-tertiary" />
              <button onClick={() => navigateBack('dateCards')} className={`transition-colors ${view === 'dateCards' ? 'text-white font-semibold' : 'text-brand-text-tertiary hover:text-accent'}`}>
                {selectedSource.name}
              </button>
            </>
          )}
          {selectedDateCard && (
            <>
              <ChevronRight size={14} className="text-brand-text-tertiary" />
              <span className="text-white font-semibold">{selectedDateCard.name}</span>
            </>
          )}
        </div>

        {/* Sources View */}
        {view === 'sources' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Sources</h2>
              <button onClick={() => { setModal('createSource'); setEditItem(null); }} className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors">
                <Plus size={18} /> New Source
              </button>
            </div>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sources.map(s => (
                  <SourceCard key={s._id} source={s} onView={navigateToSource} onEdit={() => { setEditItem(s); setModal('editSource'); }} onDelete={handleDeleteSource} />
                ))}
                {sources.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <FolderOpen size={48} className="mx-auto mb-4 text-brand-text-tertiary opacity-50" />
                    <p className="text-brand-text-tertiary">No sources yet. Create your first source!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Date Cards View */}
        {view === 'dateCards' && selectedSource && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Date Cards — {selectedSource.name}</h2>
              <button onClick={() => { setModal('createDateCard'); setEditItem(null); }} className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors">
                <Plus size={18} /> New Date Card
              </button>
            </div>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dateCards.map(dc => (
                  <DateCardItem key={dc._id} dateCard={dc} onView={navigateToDateCard} onEdit={() => { setEditItem(dc); setModal('editDateCard'); }} onDelete={handleDeleteDateCard} />
                ))}
                {dateCards.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Calendar size={48} className="mx-auto mb-4 text-brand-text-tertiary opacity-50" />
                    <p className="text-brand-text-tertiary">No date cards yet. Create one to start adding albums!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Albums View */}
        {view === 'albums' && selectedDateCard && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Albums — {selectedDateCard.name}</h2>
              <button onClick={() => setModal('uploadAlbum')} className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors">
                <Upload size={18} /> Upload Album
              </button>
            </div>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {albums.map(a => (
                  <AlbumCard key={a._id} album={a} onView={() => setSelectedAlbum(a)} onDelete={handleDeleteAlbum} />
                ))}
                {albums.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Disc size={48} className="mx-auto mb-4 text-brand-text-tertiary opacity-50" />
                    <p className="text-brand-text-tertiary">No albums yet. Upload a ZIP of MP3s!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {(modal === 'createSource' || modal === 'editSource') && (
          <SourceModal
            source={modal === 'editSource' ? editItem : null}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetchSources(); }}
          />
        )}

        {(modal === 'createDateCard' || modal === 'editDateCard') && selectedSource && (
          <DateCardModal
            sourceId={selectedSource._id}
            dateCard={modal === 'editDateCard' ? editItem : null}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetchDateCards(selectedSource._id); }}
          />
        )}

        {modal === 'uploadAlbum' && selectedSource && selectedDateCard && (
          <AlbumUploadModal
            sourceId={selectedSource._id}
            datePackId={selectedDateCard._id}
            sourceName={selectedSource.name}
            dateCardName={selectedDateCard.name}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetchAlbums(selectedDateCard._id); }}
          />
        )}

        {selectedAlbum && (
          <ManageAlbumModal
            album={selectedAlbum}
            onClose={() => setSelectedAlbum(null)}
            onUpdate={() => { if (selectedDateCard) fetchAlbums(selectedDateCard._id); }}
          />
        )}
      </div>
    </div>
  );
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader className="w-8 h-8 text-accent animate-spin" />
    </div>
  );
}

// Source Card
function SourceCard({ source, onView, onEdit, onDelete }) {
  return (
    <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden hover:border-accent/40 transition-all duration-300 group">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={source.thumbnail} alt={source.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-lg text-white truncate">{source.name}</h3>
          <p className="text-white/70 text-sm">{source.year} {source.platform && `• ${source.platform}`}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <div><div className="text-xl font-bold text-accent">{source.totalAlbums || 0}</div><div className="text-xs text-brand-text-tertiary">Albums</div></div>
          <div><div className="text-xl font-bold text-accent">{source.totalTracks || 0}</div><div className="text-xs text-brand-text-tertiary">Tracks</div></div>
          <div><div className="text-xl font-bold text-accent">{source.totalDownloads || 0}</div><div className="text-xs text-brand-text-tertiary">Downloads</div></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onView(source)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium text-sm transition-colors">
            <Eye size={15} /> View
          </button>
          <button onClick={() => onEdit(source)} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <Edit2 size={15} />
          </button>
          <button onClick={() => onDelete(source)} className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Date Card Item
function DateCardItem({ dateCard, onView, onEdit, onDelete }) {
  const dateStr = new Date(dateCard.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden hover:border-accent/40 transition-all duration-300 group cursor-pointer" onClick={() => onView(dateCard)}>
      <div className="relative aspect-square overflow-hidden">
        <img src={dateCard.thumbnail} alt={dateCard.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium text-white/90">
          <Calendar size={12} className="inline mr-1" />{dateStr}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white truncate">{dateCard.name}</h3>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-brand-text-tertiary"><Disc size={13} className="inline mr-1" />{dateCard.totalAlbums || 0} albums</span>
          <span className="text-brand-text-tertiary"><Music size={13} className="inline mr-1" />{dateCard.totalTracks || 0} tracks</span>
        </div>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(dateCard)} className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={() => onDelete(dateCard)} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Album Card
function AlbumCard({ album, onView, onDelete, onToggleFeatured }) {
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeMsg, setReanalyzeMsg] = useState(null);
  const [featured, setFeatured] = useState(album.isFeatured || false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  const handleToggleFeatured = async (e) => {
    e.stopPropagation();
    if (togglingFeatured) return;
    setTogglingFeatured(true);
    try {
      const res = await fetch(`${API}/albums/${album._id}/featured`, {
        method: 'PUT',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setFeatured(data.data.isFeatured);
        onToggleFeatured?.(album._id, data.data.isFeatured);
      }
    } catch (err) {
      console.error('Error toggling featured:', err);
    } finally {
      setTogglingFeatured(false);
    }
  };

  const handleReanalyze = async (e) => {
    e.stopPropagation();
    if (reanalyzing) return;
    setReanalyzing(true);
    setReanalyzeMsg(null);
    try {
      const res = await fetch(`${API}/tracks/reanalyze/${album._id}`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      setReanalyzeMsg(data.success ? '✓ Running in background' : data.message);
    } catch (err) {
      setReanalyzeMsg('Error: ' + err.message);
    } finally {
      setTimeout(() => setReanalyzing(false), 3000);
    }
  };

  return (
    <div className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden hover:border-accent/40 transition-all duration-300 group">
      {/* Featured toggle above the card image */}
      <div className="relative aspect-square overflow-hidden">
        <div className="cursor-pointer w-full h-full" onClick={onView}>
          {album.coverArt ? (
            <img src={album.coverArt} alt={album.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-dark-surface flex items-center justify-center"><Disc size={48} className="text-white/10" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {/* Featured toggle — top left */}
        <button
          onClick={handleToggleFeatured}
          disabled={togglingFeatured}
          className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-lg backdrop-blur-sm ${
            featured
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white scale-110'
              : 'bg-black/50 text-white/60 hover:bg-black/70 hover:text-yellow-400 hover:scale-110'
          }`}
          title={featured ? 'Remove from featured' : 'Mark as featured'}
        >
          {togglingFeatured ? <Loader size={14} className="animate-spin" /> : <Star size={14} className={featured ? 'fill-white' : ''} />}
        </button>
        {/* Featured badge — top right */}
        {featured && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Star size={10} className="fill-white" /> Featured
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-bold truncate mb-1 text-sm sm:text-base">{album.name}</h3>
        <div className="flex items-center justify-between text-xs sm:text-sm mb-3">
          <span className="text-accent font-semibold"><Music size={13} className="inline mr-1" />{album.trackCount || 0} tracks</span>
          <span className="text-brand-text-tertiary">{album.totalDownloads || 0} downloads</span>
        </div>
        {reanalyzeMsg && <p className="text-xs text-green-400 mb-2">{reanalyzeMsg}</p>}
        <div className="flex gap-1.5 sm:gap-2">
          <button onClick={onView} className="flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium text-xs sm:text-sm transition-colors">
            <Eye size={14} /> Manage
          </button>
          <button onClick={handleReanalyze} disabled={reanalyzing} className="px-2 sm:px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg transition-colors disabled:opacity-50" title="Re-analyze key & BPM with Essentia.js">
            {reanalyzing ? <Loader size={14} className="animate-spin" /> : <Music size={14} />}
          </button>
          <button onClick={() => onDelete(album)} className="px-2 sm:px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Thumbnail Upload Field (reusable)
function ThumbnailField({ file, setFile, url, setUrl, error, setError }) {
  const [mode, setMode] = useState('file');
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please select a valid image file'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setFile(f);
    setError('');
  };
  const previewSrc = mode === 'file' && file ? URL.createObjectURL(file) : mode === 'url' && url ? url : null;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Thumbnail *</label>
      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => setMode('file')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'file' ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white'}`}>Upload File</button>
        <button type="button" onClick={() => setMode('url')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'url' ? 'bg-accent text-white' : 'bg-white/5 text-brand-text-tertiary hover:text-white'}`}>URL</button>
      </div>
      {mode === 'file' ? (
        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-accent transition-colors">
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" id="thumb-upload" />
          <label htmlFor="thumb-upload" className="cursor-pointer">
            <ImageIcon size={28} className="mx-auto mb-2 text-brand-text-tertiary" />
            {file ? <p className="font-medium text-white truncate">{file.name} <span className="text-brand-text-tertiary text-sm">({(file.size / 1024).toFixed(0)} KB)</span></p> : <p className="text-brand-text-tertiary text-sm">Click to upload image</p>}
          </label>
        </div>
      ) : (
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" placeholder="https://example.com/image.jpg" />
      )}
      {previewSrc && <img src={previewSrc} alt="Preview" className="mt-3 w-full h-32 object-cover rounded-lg border border-white/10" onError={() => mode === 'url' && setError('Invalid image URL')} />}
    </div>
  );
}

// Source Modal (Create / Edit)
function SourceModal({ source, onClose, onSuccess }) {
  const [name, setName] = useState(source?.name || '');
  const [year, setYear] = useState(source?.year || new Date().getFullYear());
  const [platform, setPlatform] = useState(source?.platform || '');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbUrl, setThumbUrl] = useState(source?.thumbnail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!source;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('year', year);
      fd.append('platform', platform);
      if (thumbFile) {
        fd.append('thumbnailFile', thumbFile);
      } else if (thumbUrl) {
        fd.append('thumbnail', thumbUrl);
      }

      const url = isEdit ? `${API}/sources/${source._id}` : `${API}/sources`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: fd
      });
      const data = await res.json();
      if (data.success) { onSuccess(); }
      else { setError(data.message || 'Failed'); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-elevated rounded-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Source' : 'Create Source'}</h2>
          <button onClick={onClose} className="text-brand-text-tertiary hover:text-white"><X size={22} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" placeholder="e.g., PlaylistPro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Year *</label>
              <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} required min="2000" max="2100" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>
              <input type="text" value={platform} onChange={e => setPlatform(e.target.value)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" placeholder="e.g., Beatport" />
            </div>
          </div>
          <ThumbnailField file={thumbFile} setFile={setThumbFile} url={thumbUrl} setUrl={setThumbUrl} error={error} setError={setError} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader size={16} className="animate-spin" />}{isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Date Card Modal (Create / Edit)
function DateCardModal({ sourceId, dateCard, onClose, onSuccess }) {
  const [name, setName] = useState(dateCard?.name || '');
  const [date, setDate] = useState(dateCard?.date ? new Date(dateCard.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbUrl, setThumbUrl] = useState(dateCard?.thumbnail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!dateCard;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('date', date);
      if (!isEdit) fd.append('sourceId', sourceId);
      if (thumbFile) {
        fd.append('thumbnailFile', thumbFile);
      } else if (thumbUrl) {
        fd.append('thumbnail', thumbUrl);
      }

      const url = isEdit ? `${API}/date-packs/${dateCard._id}` : `${API}/date-packs`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: fd
      });
      const data = await res.json();
      if (data.success) { onSuccess(); }
      else { setError(data.message || 'Failed'); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-elevated rounded-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit Date Card' : 'Create Date Card'}</h2>
          <button onClick={onClose} className="text-brand-text-tertiary hover:text-white"><X size={22} /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" placeholder="e.g., January 2026" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent" />
          </div>
          <ThumbnailField file={thumbFile} setFile={setThumbFile} url={thumbUrl} setUrl={setThumbUrl} error={error} setError={setError} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader size={16} className="animate-spin" />}{isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Album Upload Modal — supports batch uploading multiple ZIPs with minimize
function AlbumUploadModal({ sourceId, datePackId, sourceName, dateCardName, onClose, onSuccess }) {
  const [queue, setQueue] = useState([]);
  const [globalGenre, setGlobalGenre] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const fileInputRef = useRef(null);
  const pollRefs = useRef({});

  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  const addFiles = (files) => {
    const zips = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip'));
    if (zips.length === 0) return;
    const newItems = zips.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      name: f.name.replace(/\.zip$/i, ''),
      genre: globalGenre,
      coverFile: null,
      coverPreview: null,
      stage: 'idle',
      uploadProgress: 0,
      processingProgress: 0,
      processedTracks: 0,
      totalTracks: 0,
      error: '',
      albumId: null,
    }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const updateItem = (id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id) => {
    if (pollRefs.current[id]) { clearInterval(pollRefs.current[id]); delete pollRefs.current[id]; }
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const startPolling = (itemId, albumId) => {
    let count = 0;
    if (pollRefs.current[itemId]) clearInterval(pollRefs.current[itemId]);

    pollRefs.current[itemId] = setInterval(async () => {
      count++;
      if (count > 1800) {
        clearInterval(pollRefs.current[itemId]);
        delete pollRefs.current[itemId];
        updateItem(itemId, { stage: 'failed', error: 'Processing timed out' });
        return;
      }
      try {
        const res = await fetch(`${API}/albums/${albumId}/status`);
        const data = await res.json();
        if (data.success) {
          updateItem(itemId, {
            processingProgress: data.data.progress || 0,
            processedTracks: data.data.processedTracks || 0,
            totalTracks: data.data.totalTracks || 0,
          });
          if (data.data.status === 'completed') {
            clearInterval(pollRefs.current[itemId]);
            delete pollRefs.current[itemId];
            updateItem(itemId, { stage: 'completed', processingProgress: 100 });
          } else if (data.data.status === 'failed') {
            clearInterval(pollRefs.current[itemId]);
            delete pollRefs.current[itemId];
            updateItem(itemId, { stage: 'failed', error: data.data.error || 'Processing failed' });
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);
  };

  const uploadSingle = (item) => {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append('albumZip', item.file);
      fd.append('sourceId', sourceId);
      fd.append('datePackId', datePackId);
      fd.append('albumName', item.name);
      if (item.genre) fd.append('genre', item.genre);
      if (item.coverFile) fd.append('coverArt', item.coverFile);

      updateItem(item.id, { stage: 'uploading', uploadProgress: 0 });

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) updateItem(item.id, { uploadProgress: Math.round((e.loaded / e.total) * 100) });
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 201 && data.success) {
            const aId = data.data.album._id;
            updateItem(item.id, { stage: 'processing', uploadProgress: 100, albumId: aId, totalTracks: data.data.album.trackCount });
            startPolling(item.id, aId);
          } else {
            updateItem(item.id, { stage: 'failed', error: data.message || 'Upload failed' });
          }
        } catch {
          updateItem(item.id, { stage: 'failed', error: 'Upload failed' });
        }
        resolve();
      };
      xhr.onerror = () => { updateItem(item.id, { stage: 'failed', error: 'Network error' }); resolve(); };
      xhr.open('POST', `${API}/albums/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.timeout = 0;
      xhr.send(fd);
    });
  };

  const uploadAll = async () => {
    const pending = queue.filter(q => q.stage === 'idle' || q.stage === 'failed');
    if (pending.length === 0) return;
    setIsUploading(true);
    for (const item of pending) {
      await uploadSingle(item);
    }
    setIsUploading(false);
  };

  const handleClose = () => {
    onSuccess();
    onClose();
  };

  const allDone = queue.length > 0 && queue.every(q => q.stage === 'completed' || q.stage === 'failed');
  const completedCount = queue.filter(q => q.stage === 'completed').length;
  const failedCount = queue.filter(q => q.stage === 'failed').length;
  const activeCount = queue.filter(q => q.stage === 'uploading' || q.stage === 'processing').length;
  const hasIdle = queue.some(q => q.stage === 'idle' || q.stage === 'failed');
  const activeItem = queue.find(q => q.stage === 'uploading' || q.stage === 'processing');

  // Overall progress for minimized view
  const overallProgress = queue.length > 0
    ? Math.round(((completedCount + failedCount) / queue.length) * 100)
    : 0;

  // ─── Minimized floating widget ───
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 bg-dark-elevated border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-surface border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {activeCount > 0 ? (
              <Loader size={16} className="text-accent animate-spin flex-shrink-0" />
            ) : allDone ? (
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            ) : (
              <Upload size={16} className="text-accent flex-shrink-0" />
            )}
            <span className="text-sm font-semibold text-white truncate">
              {activeCount > 0 ? `Uploading ${completedCount + 1}/${queue.length}` : allDone ? 'Uploads complete' : 'Upload Albums'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setMinimized(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white transition-colors" title="Expand">
              <Maximize2 size={14} />
            </button>
            {!isUploading && (
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white transition-colors" title="Close">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        {queue.length > 0 && (
          <div className="px-4 pt-3">
            <div className="flex justify-between text-[10px] text-brand-text-tertiary mb-1">
              <span>{completedCount} of {queue.length} done</span>
              {failedCount > 0 && <span className="text-red-400">{failedCount} failed</span>}
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all duration-500 ${allDone && failedCount === 0 ? 'bg-green-500' : 'bg-accent'}`} style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        )}

        {/* Current active item */}
        {activeItem && (
          <div className="px-4 py-2">
            <p className="text-xs text-white font-medium truncate">{activeItem.name}</p>
            <div className="flex items-center gap-2 mt-1">
              {activeItem.stage === 'uploading' && (
                <>
                  <div className="flex-1 bg-white/10 rounded-full h-1">
                    <div className="bg-accent h-1 rounded-full transition-all duration-300" style={{ width: `${activeItem.uploadProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-accent font-medium">{activeItem.uploadProgress}%</span>
                </>
              )}
              {activeItem.stage === 'processing' && (
                <>
                  <div className="flex-1 bg-white/10 rounded-full h-1">
                    <div className="bg-yellow-400 h-1 rounded-full transition-all duration-300" style={{ width: `${activeItem.processingProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-yellow-400 font-medium">{activeItem.processedTracks}/{activeItem.totalTracks}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Done summary */}
        {allDone && (
          <div className="px-4 py-2">
            <p className="text-xs text-green-400">{completedCount} album(s) uploaded{failedCount > 0 ? `, ${failedCount} failed` : ''}</p>
          </div>
        )}

        <div className="px-4 pb-3 pt-1">
          <button onClick={() => setMinimized(false)} className="w-full text-center text-xs text-accent hover:text-accent-hover font-medium py-1 transition-colors">
            {allDone ? 'View details' : 'Show full view'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Full modal ───
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-elevated rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">Upload Albums</h2>
            <p className="text-sm text-brand-text-tertiary mt-0.5">{sourceName} / {dateCardName}</p>
          </div>
          <div className="flex items-center gap-1">
            {(isUploading || activeCount > 0) && (
              <button onClick={() => setMinimized(true)} className="p-2 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white transition-colors" title="Minimize — uploads continue in background">
                <Minimize2 size={18} />
              </button>
            )}
            <button onClick={() => { if (!isUploading && activeCount === 0) handleClose(); }} disabled={isUploading || activeCount > 0} className="p-2 rounded-lg hover:bg-white/10 text-brand-text-tertiary hover:text-white disabled:opacity-30 transition-colors" title={isUploading ? 'Minimize to continue in background' : 'Close'}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Global genre */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Default Genre (applies to new items)</label>
          <input type="text" value={globalGenre} onChange={e => setGlobalGenre(e.target.value)} disabled={isUploading} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50 text-sm" placeholder="e.g., House, Tech House" />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 mb-4 ${isDragging ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-accent/50 hover:bg-white/5'}`}
        >
          <Upload size={28} className={`mx-auto mb-2 ${isDragging ? 'text-accent' : 'text-brand-text-tertiary'}`} />
          <p className="text-sm font-medium text-white mb-1">{isDragging ? 'Drop ZIP files here' : 'Click or drop ZIP files'}</p>
          <p className="text-xs text-brand-text-tertiary">Select multiple ZIPs — each becomes a separate album. No limit.</p>
          <input ref={fileInputRef} type="file" accept=".zip" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} className="hidden" />
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
            {queue.map((item) => (
              <div key={item.id} className="bg-dark-surface rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-shrink-0">
                    {item.stage === 'idle' && <Disc size={18} className="text-brand-text-tertiary" />}
                    {item.stage === 'uploading' && <Loader size={18} className="text-accent animate-spin" />}
                    {item.stage === 'processing' && <Loader size={18} className="text-yellow-400 animate-spin" />}
                    {item.stage === 'completed' && <CheckCircle size={18} className="text-green-400" />}
                    {item.stage === 'failed' && <AlertCircle size={18} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.stage === 'idle' ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="w-full bg-transparent text-white text-sm font-medium focus:outline-none border-b border-transparent focus:border-accent/50 pb-0.5"
                        placeholder="Album name"
                      />
                    ) : (
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    )}
                    <p className="text-[10px] text-brand-text-tertiary">{(item.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  {(item.stage === 'idle' || item.stage === 'failed') && (
                    <button onClick={() => removeItem(item.id)} className="text-brand-text-tertiary hover:text-red-400 flex-shrink-0 p-1">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Upload progress */}
                {item.stage === 'uploading' && (
                  <div>
                    <div className="flex justify-between text-[10px] text-brand-text-tertiary mb-1">
                      <span>Uploading...</span><span>{item.uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${item.uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Processing progress */}
                {item.stage === 'processing' && (
                  <div>
                    <div className="flex justify-between text-[10px] text-brand-text-tertiary mb-1">
                      <span>Processing tracks ({item.processedTracks}/{item.totalTracks})</span><span>{item.processingProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${item.processingProgress}%` }} />
                    </div>
                  </div>
                )}

                {item.stage === 'completed' && (
                  <p className="text-[10px] text-green-400">Completed — {item.processedTracks} tracks processed</p>
                )}

                {item.stage === 'failed' && item.error && (
                  <p className="text-[10px] text-red-400">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary when all done */}
        {allDone && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <p className="text-green-400 font-medium text-sm">{completedCount} of {queue.length} album(s) uploaded successfully</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isUploading || activeCount > 0 ? (
            <button onClick={() => setMinimized(true)} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2">
              <Minimize2 size={16} /> Minimize
            </button>
          ) : (
            <button onClick={handleClose} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors text-sm">
              {allDone ? 'Done' : 'Cancel'}
            </button>
          )}
          {hasIdle && (
            <button onClick={uploadAll} disabled={isUploading || queue.length === 0} className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              {isUploading ? <><Loader size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload All ({queue.filter(q => q.stage === 'idle' || q.stage === 'failed').length})</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
