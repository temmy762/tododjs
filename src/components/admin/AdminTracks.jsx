import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Upload, Download, Edit, Trash2, Filter, Grid3x3, List, MoreVertical, X, File, Music, CheckCircle, AlertCircle, Loader, FolderArchive, ChevronLeft, ChevronRight } from 'lucide-react';

const API = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');
const authHeaders = (json = false) => {
  const h = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

export default function AdminTracks() {
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
  const [editingTrack, setEditingTrack] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTracks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`${API}/tracks?${params}`, { headers: authHeaders() });
      if (!res.ok) {
        const text = await res.text();
        console.error('Tracks API HTTP error:', res.status, text);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setTracks(data.data);
        setPagination(data.pagination);
      } else {
        console.error('Tracks API error:', data.message);
      }
    } catch (err) {
      console.error('Failed to fetch tracks:', err.message || err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchTracks(1); }, [fetchTracks]);

  const handleDelete = async (trackId) => {
    try {
      const res = await fetch(`${API}/tracks/${trackId}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchTracks(pagination.page);
      }
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleEditSave = async (trackId, updates) => {
    try {
      setSaveError(null);
      console.log('Saving track:', trackId, updates);
      const res = await fetch(`${API}/tracks/${trackId}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      console.log('Save response:', data);
      if (data.success) {
        setEditingTrack(null);
        fetchTracks(pagination.page);
      } else {
        setSaveError(data.message || 'Failed to save track');
        console.error('Save failed:', data.message);
      }
    } catch (err) {
      setSaveError(err.message || 'Network error');
      console.error('Update failed:', err);
    }
  };

  const getTonality = (t) => {
    if (!t?.tonality) return '—';
    if (t.tonality.camelot) return t.tonality.camelot;
    if (t.tonality.key) return `${t.tonality.key}${t.tonality.scale ? ` ${t.tonality.scale}` : ''}`;
    return '—';
  };

  const getTonalitySource = (t) => t?.tonality?.source || '';

  const getTrackCover = (t) => t.coverArt || t.albumId?.coverArt || '';

  const startIdx = (pagination.page - 1) * pagination.limit + 1;
  const endIdx = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Track Management</h2>
          <p className="text-sm md:text-base text-brand-text-tertiary">Manage all tracks — <span className="text-white font-semibold">{pagination.total}</span> total</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white transition-all duration-200 text-sm">
            <Download className="w-4 h-4" />
            <span className="font-medium hidden xs:inline">Export</span>
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-all duration-200 shadow-lg shadow-accent/30 text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-dark-elevated rounded-xl p-3 md:p-4 border border-white/10 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-brand-text-tertiary" />
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 bg-dark-surface border border-white/10 rounded-lg text-sm md:text-base text-white placeholder-brand-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-dark-surface rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 md:p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 md:p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-brand-text-tertiary hover:text-white'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {/* Tracks */}
      {!loading && tracks.length > 0 && (
        <>
          {/* Desktop Table (list mode) */}
          {viewMode === 'list' && (
          <div className="hidden md:block bg-dark-elevated rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-dark-surface">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Track</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Album</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Genre</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">BPM</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Tonality</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Pool</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-brand-text-tertiary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tracks.map((track) => (
                    <tr key={track._id} className="hover:bg-dark-surface transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-dark-surface">
                            {getTrackCover(track) ? (
                              <img src={getTrackCover(track)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[220px]">{track.title}</div>
                            <div className="text-sm text-brand-text-tertiary truncate max-w-[220px]">{track.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary truncate max-w-[160px]">
                        {track.albumId?.name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md text-xs font-bold text-white bg-accent/80 border border-accent/40">
                          {track.genre || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{track.bpm || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold text-white ${
                          getTonalitySource(track) === 'audio-analysis' ? 'bg-green-600' :
                          getTonalitySource(track) === 'id3-tag' ? 'bg-blue-600' :
                          getTonalitySource(track) === 'openai' ? 'bg-yellow-600' : 'bg-gray-600'
                        }`} title={`Source: ${getTonalitySource(track) || 'unknown'}`}>
                          {getTonality(track)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-brand-text-tertiary">{track.pool || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          track.status === 'published'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {track.status || 'published'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingTrack(track)} className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-white">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(track)} className="p-2 hover:bg-dark-elevated rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {tracks.map((track) => (
              <div key={track._id} className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden group hover:border-white/20 transition-all duration-200">
                <div className="aspect-square bg-dark-surface relative">
                  {getTrackCover(track) ? (
                    <img src={getTrackCover(track)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5">
                      <Music className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setEditingTrack(track)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                      <Edit className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => setDeleteConfirm(track)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-red-500/50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      track.status === 'published'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-yellow-500/90 text-white'
                    }`}>
                      {track.status === 'published' ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-[10px] sm:text-xs text-brand-text-tertiary truncate mb-2">{track.artist}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-accent/80">{track.genre || '—'}</span>
                    {track.bpm && <span className="text-[9px] text-brand-text-tertiary">{track.bpm}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                      getTonalitySource(track) === 'audio-analysis' ? 'bg-green-600' :
                      getTonalitySource(track) === 'id3-tag' ? 'bg-blue-600' :
                      getTonalitySource(track) === 'openai' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {getTonality(track)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Mobile Cards (list mode only on small screens) */}
          {viewMode === 'list' && (
          <div className="md:hidden space-y-3">
            {tracks.map((track) => (
              <div key={track._id} className="bg-dark-elevated rounded-xl border border-white/10 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-dark-surface">
                    {getTrackCover(track) ? (
                      <img src={getTrackCover(track)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-white/20" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{track.title}</p>
                        <p className="text-xs text-brand-text-tertiary truncate">{track.artist}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setEditingTrack(track)} className="p-1.5 hover:bg-dark-surface rounded-lg transition-colors text-brand-text-tertiary hover:text-white">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(track)} className="p-1.5 hover:bg-dark-surface rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40">
                        {track.genre || '—'}
                      </span>
                      {track.bpm && (
                        <span className="text-[10px] text-brand-text-tertiary font-medium">{track.bpm} BPM</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                        getTonalitySource(track) === 'audio-analysis' ? 'bg-green-600' :
                        getTonalitySource(track) === 'id3-tag' ? 'bg-blue-600' :
                        getTonalitySource(track) === 'openai' ? 'bg-yellow-600' : 'bg-gray-600'
                      }`}>
                        {getTonality(track)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        track.status === 'published'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {track.status || 'published'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Pagination */}
          <div className="mt-4 px-3 md:px-6 py-3 md:py-4 bg-dark-elevated rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs md:text-sm text-brand-text-tertiary">
              Showing <span className="font-semibold text-white">{startIdx}-{endIdx}</span> of <span className="font-semibold text-white">{pagination.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTracks(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 md:px-3 py-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white text-xs md:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Prev</span>
              </button>
              <span className="text-xs md:text-sm text-white font-medium px-2">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => fetchTracks(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-2.5 md:px-3 py-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-white/10 text-white text-xs md:text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && tracks.length === 0 && (
        <div className="text-center py-20">
          <Music className="w-16 h-16 mx-auto mb-4 text-brand-text-tertiary opacity-30" />
          <p className="text-brand-text-tertiary text-lg">{debouncedSearch ? 'No tracks match your search' : 'No tracks in the system yet'}</p>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-surface rounded-2xl border border-white/10 p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-2">Delete Track</h3>
            <p className="text-brand-text-tertiary mb-1">Are you sure you want to delete:</p>
            <p className="text-white font-semibold mb-6">{deleteConfirm.title} — {deleteConfirm.artist}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm._id)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTrack && (
        <EditTrackModal track={editingTrack} onClose={() => { setEditingTrack(null); setSaveError(null); }} onSave={handleEditSave} saveError={saveError} />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => {
            setShowUploadModal(false);
            setUploadFiles([]);
            setUploadProgress({});
            fetchTracks(pagination.page);
          }}
          uploadFiles={uploadFiles}
          setUploadFiles={setUploadFiles}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          uploadProgress={uploadProgress}
          setUploadProgress={setUploadProgress}
          fileInputRef={fileInputRef}
        />
      )}
    </div>
  );
}

function EditTrackModal({ track, onClose, onSave, saveError }) {
  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [bpm, setBpm] = useState(track.bpm || '');
  const [genre, setGenre] = useState(track.genre || '');
  const [coverPreview, setCoverPreview] = useState(track.coverArt || '');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailMsg, setThumbnailMsg] = useState('');
  const thumbInputRef = useRef(null);

  const handleThumbnailUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setThumbnailUploading(true);
    setThumbnailMsg('');
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const res = await fetch(`${API}/tracks/${track._id}/thumbnail`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setCoverPreview(data.data.coverArt);
        setThumbnailMsg('Thumbnail updated!');
      } else {
        setThumbnailMsg(data.message || 'Upload failed');
      }
    } catch (err) {
      setThumbnailMsg('Upload error');
    } finally {
      setThumbnailUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-dark-surface rounded-t-2xl sm:rounded-2xl border border-white/10 p-5 sm:p-8 max-w-lg w-full sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">Edit Track</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-white" /></button>
        </div>

        {/* Thumbnail Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-text-tertiary mb-2">Cover Art</label>
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-xl overflow-hidden bg-dark-elevated border-2 border-dashed border-white/10 flex-shrink-0 cursor-pointer hover:border-accent/50 transition-colors relative group"
              onClick={() => thumbInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleThumbnailUpload(f); }}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Music className="w-8 h-8 text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              {thumbnailUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader className="w-5 h-5 text-accent animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-brand-text-tertiary mb-2">Click or drag an image to upload a custom cover art for this track.</p>
              <button
                onClick={() => thumbInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white text-xs font-medium transition-colors"
              >
                Choose Image
              </button>
              {thumbnailMsg && (
                <p className={`text-xs mt-1.5 ${thumbnailMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{thumbnailMsg}</p>
              )}
            </div>
          </div>
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files[0]; if (f) handleThumbnailUpload(f); e.target.value = ''; }}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-tertiary mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-tertiary mb-1">Artist</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-tertiary mb-1">BPM</label>
              <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text-tertiary mb-1">Genre</label>
              <input value={genre} onChange={e => setGenre(e.target.value)} className="w-full px-4 py-2.5 bg-dark-elevated border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent" />
            </div>
          </div>
        </div>
        {saveError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{saveError}</p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white font-medium transition-colors">Cancel</button>
          <button onClick={() => onSave(track._id, { title, artist, bpm: parseInt(bpm) || undefined, genre })} className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, uploadFiles, setUploadFiles, isDragging, setIsDragging, uploadProgress, setUploadProgress, fileInputRef }) {
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [setIsDragging]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const isAudio = file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|flac|m4a)$/i);
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      return isAudio || isZip;
    });

    const filesWithMetadata = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      metadata: null
    }));

    setUploadFiles(prev => [...prev, ...filesWithMetadata]);
  };

  const removeFile = (fileId) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const uploadFile = async (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);

    try {
      setUploadProgress(prev => ({ ...prev, [fileData.id]: { status: 'uploading', progress: 0 } }));

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'uploading', progress: percentComplete }
          }));
        }
      });

      // When file transfer is done, show 'processing' state for ZIPs
      xhr.upload.addEventListener('load', () => {
        const isZip = fileData.name.toLowerCase().endsWith('.zip');
        if (isZip) {
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'processing', progress: 100 }
          }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            setUploadProgress(prev => ({
              ...prev,
              [fileData.id]: { status: 'complete', progress: 100, data: response }
            }));
          } catch {
            setUploadProgress(prev => ({
              ...prev,
              [fileData.id]: { status: 'complete', progress: 100 }
            }));
          }
        } else {
          let errorMsg = 'Upload failed';
          try {
            const errData = JSON.parse(xhr.responseText);
            errorMsg = errData.message || errorMsg;
          } catch {}
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'error', progress: 0, error: errorMsg }
          }));
        }
      });

      xhr.addEventListener('error', () => {
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { status: 'error', progress: 0, error: 'Network error — check server is running' }
        }));
      });

      xhr.addEventListener('timeout', () => {
        setUploadProgress(prev => ({
          ...prev,
          [fileData.id]: { status: 'error', progress: 0, error: 'Upload timed out' }
        }));
      });

      xhr.open('POST', 'http://localhost:5000/api/tracks/upload');
      xhr.timeout = 0; // No timeout for large uploads
      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [fileData.id]: { status: 'error', progress: 0, error: error.message }
      }));
    }
  };

  const uploadAll = () => {
    uploadFiles.forEach(fileData => {
      if (!uploadProgress[fileData.id] || uploadProgress[fileData.id].status === 'pending') {
        uploadFile(fileData);
      }
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith('.zip')) return FolderArchive;
    return Music;
  };

  const getStatusIcon = (fileId) => {
    const status = uploadProgress[fileId]?.status;
    if (status === 'complete') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (status === 'processing') return <Loader className="w-5 h-5 text-yellow-400 animate-spin" />;
    if (status === 'uploading') return <Loader className="w-5 h-5 text-accent animate-spin" />;
    return <File className="w-5 h-5 text-brand-text-tertiary" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-4xl sm:mx-4 max-h-[95vh] sm:max-h-[90vh] bg-dark-surface/95 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300 flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black z-10"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="p-4 sm:p-8 border-b border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Upload Tracks</h2>
          <p className="text-xs sm:text-sm text-brand-text-tertiary">Upload tracks or ZIP files</p>
        </div>

        <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-200 mb-4 sm:mb-6 ${
              isDragging
                ? 'border-accent bg-accent/10'
                : 'border-white/20 hover:border-accent/50 hover:bg-white/5'
            }`}
          >
            <Upload className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${
              isDragging ? 'text-accent' : 'text-brand-text-tertiary'
            }`} />
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">
              {isDragging ? 'Drop files here' : 'Tap to browse or drop files'}
            </h3>
            <p className="text-xs sm:text-sm text-brand-text-tertiary">
              MP3, WAV, FLAC, ZIP (max 500MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Files ({uploadFiles.length})
                </h3>
                <button
                  onClick={uploadAll}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-all duration-200 text-xs sm:text-sm"
                >
                  Upload All
                </button>
              </div>

              {uploadFiles.map((fileData) => {
                const FileIcon = getFileIcon(fileData.name);
                const progress = uploadProgress[fileData.id];
                
                return (
                  <div
                    key={fileData.id}
                    className="bg-dark-elevated rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(fileData.id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                          <FileIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0" />
                          <p className="text-xs sm:text-sm font-medium text-white truncate">
                            {fileData.name}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-brand-text-tertiary">
                          {formatFileSize(fileData.size)}
                        </p>
                        {progress && (progress.status === 'uploading' || progress.status === 'processing') && (
                          <div className="mt-2">
                            <div className="w-full bg-dark-surface rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  progress.status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-accent'
                                }`}
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-brand-text-tertiary mt-1">
                              {progress.status === 'processing'
                                ? 'Processing tracks on server...'
                                : `Uploading ${Math.round(progress.progress)}%`
                              }
                            </p>
                          </div>
                        )}
                        {progress && progress.status === 'error' && (
                          <p className="text-xs text-red-400 mt-1">
                            {progress.error || 'Upload failed'}
                          </p>
                        )}
                        {progress && progress.status === 'complete' && (
                          <div className="mt-1">
                            <p className="text-xs text-green-400">
                              {progress.data?.data?.trackCount
                                ? `✓ ${progress.data.data.trackCount} of ${progress.data.data.totalFiles} tracks processed`
                                : '✓ Upload complete'
                              }
                            </p>
                            {progress.data?.data?.errors?.length > 0 && (
                              <p className="text-xs text-yellow-400 mt-0.5">
                                ⚠ {progress.data.data.errors.length} track(s) had errors
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(fileData.id)}
                        className="flex-shrink-0 p-2 hover:bg-dark-surface rounded-lg transition-colors text-brand-text-tertiary hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
