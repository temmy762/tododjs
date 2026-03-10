import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Upload, Download, Edit, Trash2, Filter, Grid3x3, List, MoreVertical, X, File, Music, CheckCircle, AlertCircle, Loader, FolderArchive, ChevronLeft, ChevronRight, Check, AlertTriangle, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import API_URL from '../../config/api';

const API = API_URL;
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
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef(null);

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
  const [editingTrack, setEditingTrack] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [uploadState, setUploadState] = useState({
    status: 'idle', // idle, uploading, success, error
    progress: 0,
    step: '',
    error: null
  });

  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    completed: [],
    failed: []
  });

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
      const res = await fetch(`${API}/tracks/${trackId}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setEditingTrack(null);
        fetchTracks(pagination.page);
      } else {
        setSaveError(data.message || 'Failed to save track');
      }
    } catch (err) {
      setSaveError(err.message || 'Network error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`${API}/tracks?limit=10000`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.data) return;

      const allTracks = data.data;
      const csvHeaders = ['Title', 'Artist', 'Album', 'Genre', 'BPM', 'Tonality', 'Pool', 'Status', 'Created'];
      const csvRows = allTracks.map(track => [
        track.title || '',
        track.artist || '',
        track.albumId?.name || '',
        track.genre || '',
        track.bpm || '',
        getTonality(track),
        track.pool || '',
        track.status || 'published',
        new Date(track.createdAt).toLocaleDateString()
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tracks-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const resetUpload = () => {
    setUploadState({ status: 'idle', progress: 0, step: '', error: null });
    setAudioFiles([]);
    setBatchProgress({ current: 0, total: 0, completed: [], failed: [] });
    if (audioRef.current) audioRef.current.value = '';
  };

  const handleAudioSelect = (e) => {
    const files = Array.from(e.target.files);
    setAudioFiles(prev => [...prev, ...files]);
  };

  const removeAudioFile = (index) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (audioFiles.length === 0) {
      setUploadState({ ...uploadState, status: 'error', error: 'Please select at least one audio file' });
      return;
    }

    const totalFiles = audioFiles.length;
    setBatchProgress({ current: 0, total: totalFiles, completed: [], failed: [] });
    setUploadState({ status: 'uploading', progress: 0, step: `Uploading 1 of ${totalFiles}...`, error: null });

    const token = getToken();
    const completed = [];
    const failed = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const currentNum = i + 1;
      
      setUploadState(prev => ({
        ...prev,
        step: `Uploading ${currentNum} of ${totalFiles}: ${file.name}`,
        progress: Math.round((i / totalFiles) * 100)
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API}/tracks/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        const data = await res.json();

        if (data.success) {
          completed.push({ name: file.name, data: data.data });
        } else {
          failed.push({ name: file.name, error: data.message });
        }
      } catch (err) {
        failed.push({ name: file.name, error: err.message });
      }

      setBatchProgress({ current: currentNum, total: totalFiles, completed, failed });
    }

    // All done
    if (failed.length === 0) {
      setUploadState({
        status: 'success',
        progress: 100,
        step: `All ${totalFiles} tracks uploaded!`,
        error: null
      });
    } else if (completed.length === 0) {
      setUploadState({
        status: 'error',
        progress: 0,
        step: '',
        error: `All ${failed.length} uploads failed`
      });
    } else {
      setUploadState({
        status: 'success',
        progress: 100,
        step: `${completed.length} of ${totalFiles} uploaded`,
        error: null
      });
    }

    setBatchProgress({ current: totalFiles, total: totalFiles, completed, failed });
    fetchTracks(pagination.page);

    if (failed.length === 0) {
      setTimeout(() => {
        setShowUploadPanel(false);
        resetUpload();
      }, 2000);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|flac|m4a)$/i)
    );
    setAudioFiles(prev => [...prev, ...files]);
  }, []);

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
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-dark-elevated hover:bg-dark-surface border border-white/10 text-white transition-all duration-200 text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium hidden xs:inline">Export</span>
          </button>
          <button 
            onClick={() => { setShowUploadPanel(true); setIsMinimized(false); }}
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

      {/* Upload Panel */}
      {showUploadPanel && !isMinimized && (
        <div className="mb-6 p-4 md:p-5 rounded-xl bg-dark-elevated border border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Smart Track Upload</h3>
                <p className="text-xs text-brand-text-tertiary">Auto-extract metadata from audio files</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {uploadState.status === 'uploading' && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-lg text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-colors"
                  title="Minimize (upload continues in background)"
                >
                  <ChevronDown size={20} />
                </button>
              )}
              {uploadState.status === 'idle' && (
                <button
                  onClick={() => { setShowUploadPanel(false); resetUpload(); }}
                  className="text-brand-text-tertiary hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Error State */}
          {uploadState.status === 'error' && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">Upload Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{uploadState.error}</p>
                  <button
                    onClick={() => setUploadState({ ...uploadState, status: 'idle', error: null })}
                    className="mt-3 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-medium text-red-400 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadState.status === 'success' && (
            <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-400">{uploadState.step}</p>
                  {batchProgress.failed.length > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      {batchProgress.failed.length} track(s) failed to upload
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Uploading State */}
          {uploadState.status === 'uploading' && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">{uploadState.step}</span>
                <span className="text-xs text-brand-text-tertiary">{uploadState.progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-brand-text-tertiary">
                {batchProgress.current} of {batchProgress.total} tracks processed
              </div>
            </div>
          )}

          {/* Upload Form */}
          {uploadState.status === 'idle' && (
            <form onSubmit={handleUpload}>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => audioRef.current?.click()}
                className={`mb-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-accent/50 hover:bg-white/5'
                }`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-accent' : 'text-brand-text-tertiary'}`} />
                <p className="text-sm font-medium text-white mb-1">
                  {isDragging ? 'Drop files here' : 'Click to browse or drag & drop'}
                </p>
                <p className="text-xs text-brand-text-tertiary">
                  MP3, WAV, FLAC, M4A supported
                </p>
                <input
                  ref={audioRef}
                  type="file"
                  multiple
                  accept="audio/*"
                  onChange={handleAudioSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {audioFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{audioFiles.length} file(s) selected</p>
                    <button
                      type="button"
                      onClick={() => setAudioFiles([])}
                      className="text-xs text-brand-text-tertiary hover:text-red-400 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {audioFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                        <Music className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-xs text-white flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAudioFile(idx)}
                          className="text-brand-text-tertiary hover:text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                type="submit"
                disabled={audioFiles.length === 0}
                className="w-full px-4 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload {audioFiles.length > 0 && `${audioFiles.length} Track${audioFiles.length > 1 ? 's' : ''}`}
              </button>
            </form>
          )}

          {/* Batch Results */}
          {(uploadState.status === 'success' || uploadState.status === 'error') && batchProgress.total > 0 && (
            <div className="mt-4 space-y-2">
              {batchProgress.completed.length > 0 && (
                <details className="bg-green-500/10 border border-green-500/20 rounded-lg">
                  <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-green-400 flex items-center justify-between">
                    <span>✓ {batchProgress.completed.length} Successful</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="px-3 pb-2 space-y-1">
                    {batchProgress.completed.map((item, idx) => (
                      <div key={idx} className="text-xs text-green-300/80">{item.name}</div>
                    ))}
                  </div>
                </details>
              )}
              {batchProgress.failed.length > 0 && (
                <details className="bg-red-500/10 border border-red-500/20 rounded-lg">
                  <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-red-400 flex items-center justify-between">
                    <span>✗ {batchProgress.failed.length} Failed</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="px-3 pb-2 space-y-1">
                    {batchProgress.failed.map((item, idx) => (
                      <div key={idx} className="text-xs text-red-300/80">
                        {item.name}: {item.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Minimized Upload Widget */}
      {isMinimized && uploadState.status === 'uploading' && (
        <div 
          className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-dark-elevated border border-accent/30 shadow-lg shadow-black/50 cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Loader size={20} className="text-accent animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Uploading Tracks...</p>
              <p className="text-xs text-brand-text-tertiary">
                {batchProgress.current} of {batchProgress.total} • {uploadState.progress}%
              </p>
            </div>
            <ChevronUp className="w-5 h-5 text-brand-text-tertiary ml-2" />
          </div>
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-200"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 text-accent animate-spin" />
        </div>
      )}

      {/* Tracks List/Grid - keeping existing implementation */}
      {!loading && tracks.length > 0 && (
        <>
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
                              <>
                                <img 
                                  src={getTrackCover(track)} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => { 
                                    e.target.style.display = 'none'; 
                                    const fallback = e.target.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                  }} 
                                />
                                <div className="w-full h-full hidden items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>
                              </>
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
                        <span className="px-2 py-1 rounded-md text-xs font-bold text-white bg-accent/80 border border-accent/40 whitespace-nowrap">
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

          {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {tracks.map((track) => (
              <div key={track._id} className="bg-dark-elevated rounded-xl border border-white/10 overflow-hidden group hover:border-white/20 transition-all duration-200">
                <div className="aspect-square bg-dark-surface relative">
                  {getTrackCover(track) ? (
                    <>
                      <img 
                        src={getTrackCover(track)} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }} 
                      />
                      <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5">
                        <Music className="w-8 h-8 text-white/20" />
                      </div>
                    </>
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
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-accent/80 whitespace-nowrap">{track.genre || '—'}</span>
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

          {viewMode === 'list' && (
          <div className="md:hidden space-y-3">
            {tracks.map((track) => (
              <div key={track._id} className="bg-dark-elevated rounded-xl border border-white/10 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-dark-surface">
                    {getTrackCover(track) ? (
                      <>
                        <img 
                          src={getTrackCover(track)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { 
                            e.target.style.display = 'none'; 
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }} 
                        />
                        <div className="w-full h-full hidden items-center justify-center"><Music className="w-5 h-5 text-white/20" /></div>
                      </>
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
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-accent/80 border border-accent/40 whitespace-nowrap truncate">
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
