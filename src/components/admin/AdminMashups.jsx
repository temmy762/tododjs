import { useState, useEffect, useRef } from 'react';
import {
  Music, Upload, Trash2, Edit3, Save, X, Link, Eye, EyeOff,
  Loader, CheckCircle, AlertCircle, Youtube, FileAudio,
  Image, Sparkles, FileUp, RotateCcw, Check, AlertTriangle
} from 'lucide-react';
import GenericCoverArt from '../GenericCoverArt';
import API_URL from '../../config/api';

const API = API_URL;

export default function AdminMashups() {
  const [mashups, setMashups] = useState([]);
  const [settings, setSettings] = useState({ videoUrl: '', pageTitle: 'Mash Ups', pageDescription: '' });
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState({
    status: 'idle', // idle, uploading, processing, success, error
    progress: 0,
    step: '',
    extractedData: null,
    error: null
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const audioRef = useRef(null);
  const coverRef = useRef(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    genre: 'Mashup',
    bpm: '',
    tonality: '',
  });
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    completed: [],
    failed: []
  });

  useEffect(() => {
    fetchMashups();
    fetchSettings();
  }, []);

  const fetchMashups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mashups/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMashups(data.data || []);
    } catch (err) {
      console.error('Error fetching mashups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/mashups/settings`);
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (err) {
      console.error('Error fetching mashup settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mashups/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved!' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const resetUpload = () => {
    setUploadState({ status: 'idle', progress: 0, step: '', extractedData: null, error: null });
    setUploadForm({ title: '', artist: '', genre: 'Mashup', bpm: '', tonality: '' });
    setAudioFiles([]);
    setCoverFile(null);
    setBatchProgress({ current: 0, total: 0, completed: [], failed: [] });
    if (audioRef.current) audioRef.current.value = '';
    if (coverRef.current) coverRef.current.value = '';
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

    const token = localStorage.getItem('token');
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
        formData.append('audio', file);
        if (coverFile) formData.append('coverArt', coverFile);
        formData.append('title', uploadForm.title || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('artist', uploadForm.artist || 'Unknown Artist');
        formData.append('genre', uploadForm.genre);
        if (uploadForm.bpm) formData.append('bpm', uploadForm.bpm);
        if (uploadForm.tonality) formData.append('tonality', uploadForm.tonality);

        const res = await fetch(`${API}/mashups`, {
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
        extractedData: { count: completed.length },
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
        extractedData: { count: completed.length, failed: failed.length },
        error: null
      });
    }

    setBatchProgress({ current: totalFiles, total: totalFiles, completed, failed });
    fetchMashups();

    if (failed.length === 0) {
      setTimeout(() => {
        setShowUploadPanel(false);
        resetUpload();
      }, 2000);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mashup? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mashups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMashups(prev => prev.filter(m => m._id !== id));
        setMessage({ type: 'success', text: 'Mashup deleted' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleTogglePublish = async (mashup) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mashups/${mashup._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPublished: !mashup.isPublished })
      });
      const data = await res.json();
      if (data.success) {
        setMashups(prev => prev.map(m => m._id === mashup._id ? { ...m, isPublished: !m.isPublished } : m));
      }
    } catch {}
  };

  const startEdit = (mashup) => {
    setEditingId(mashup._id);
    setEditForm({
      title: mashup.title,
      artist: mashup.artist,
      genre: mashup.genre,
      bpm: mashup.bpm || '',
      tonality: mashup.tonality || ''
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mashups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setMashups(prev => prev.map(m => m._id === id ? { ...m, ...editForm } : m));
        setEditingId(null);
        setMessage({ type: 'success', text: 'Mashup updated' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Update failed' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Music className="w-6 h-6 text-accent" />
            Mashup Manager
          </h2>
          <p className="text-sm text-brand-text-tertiary mt-1">Upload and manage mashup tracks</p>
        </div>
        <span className="text-sm text-brand-text-tertiary">{mashups.length} mashups</span>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* ── Video Link Settings ── */}
      <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-400" />
          Video & Page Settings
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">YouTube Video URL</label>
            <div className="relative">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-tertiary" />
              <input
                type="text"
                value={settings.videoUrl}
                onChange={(e) => setSettings({ ...settings, videoUrl: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            {extractYouTubeId(settings.videoUrl) && (
              <div className="mt-3 rounded-lg overflow-hidden border border-white/10 aspect-video max-w-sm">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(settings.videoUrl)}`}
                  title="Preview"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Page Title</label>
              <input
                type="text"
                value={settings.pageTitle}
                onChange={(e) => setSettings({ ...settings, pageTitle: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Page Description</label>
              <input
                type="text"
                value={settings.pageDescription}
                onChange={(e) => setSettings({ ...settings, pageDescription: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={14} />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ── Upload New Mashup ── */}
      {!showUploadPanel ? (
        <div className="flex items-center justify-between p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Upload New Mashup</h3>
              <p className="text-xs text-brand-text-tertiary">Audio file with auto-extraction</p>
            </div>
          </div>
          <button
            onClick={() => setShowUploadPanel(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white text-sm transition-colors"
          >
            Start Upload
          </button>
        </div>
      ) : (
        <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Auto-Extract Upload</h3>
                <p className="text-xs text-brand-text-tertiary">We'll detect metadata automatically</p>
              </div>
            </div>
            {uploadState.status === 'idle' && (
              <button
                onClick={() => { setShowUploadPanel(false); resetUpload(); }}
                className="text-brand-text-tertiary hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}
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
                <div>
                  <p className="text-sm font-semibold text-green-400">Upload Complete!</p>
                  <p className="text-xs text-green-300/80 mt-0.5">
                    {uploadState.extractedData?.title} by {uploadState.extractedData?.artist}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {uploadState.extractedData?.genre && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
                        {uploadState.extractedData.genre}
                      </span>
                    )}
                    {uploadState.extractedData?.bpm > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
                        {uploadState.extractedData.bpm} BPM
                      </span>
                    )}
                    {uploadState.extractedData?.tonality && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">
                        {uploadState.extractedData.tonality}
                      </span>
                    )}
                    {uploadState.extractedData?.coverArt && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
                        <Image size={10} /> Cover
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Uploading / Processing State */}
          {(uploadState.status === 'uploading') && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">{uploadState.step}</span>
                <span className="text-xs text-brand-text-tertiary">{uploadState.progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-200"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-brand-text-tertiary">
                  <Loader size={12} className="animate-spin" />
                  Uploading...
                </div>
                <div className="flex items-center gap-1.5 text-xs text-brand-text-tertiary/50">
                  <Sparkles size={12} />
                  AI Detection
                </div>
                <div className="flex items-center gap-1.5 text-xs text-brand-text-tertiary/50">
                  <Image size={12} />
                  Cover Art
                </div>
              </div>
            </div>
          )}

          {/* Upload Form */}
          {uploadState.status === 'idle' && (
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Drop Zone - Multiple Files */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-brand-text-secondary">
                  Audio Files <span className="text-red-400">*</span>
                  <span className="ml-2 text-brand-text-tertiary font-normal">
                    ({audioFiles.length} selected)
                  </span>
                </label>
                
                {/* File List */}
                {audioFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {audioFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/10">
                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <FileAudio className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-brand-text-tertiary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newFiles = audioFiles.filter((_, i) => i !== idx);
                            setAudioFiles(newFiles);
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-brand-text-tertiary hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Drop Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                    audioFiles.length > 0 ? 'border-white/20 hover:border-accent/50 bg-white/[0.02]' : 'border-accent/50 bg-accent/5'
                  }`}
                >
                  <input
                    ref={audioRef}
                    type="file"
                    accept=".mp3,.wav,.flac,.m4a,.aac"
                    multiple
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files);
                      setAudioFiles(prev => [...prev, ...newFiles]);
                      if (audioRef.current) audioRef.current.value = '';
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        {audioFiles.length > 0 ? 'Add more files' : 'Drop audio files or click to browse'}
                      </p>
                      <p className="text-xs text-brand-text-tertiary">MP3, WAV, FLAC up to 50MB each</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-detected Info */}
              {audioFiles.length > 0 && (
                <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-accent" />
                    <span className="text-xs font-medium text-white">Auto-Detected Metadata</span>
                    <span className="text-[10px] text-brand-text-tertiary px-1.5 py-0.5 rounded-full bg-white/10">
                      AI Powered
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-brand-text-tertiary mb-1">Title</label>
                      <input
                        type="text"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                        placeholder={audioFile.name.replace(/\.[^/.]+$/, '')}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-brand-text-tertiary mb-1">Artist</label>
                      <input
                        type="text"
                        value={uploadForm.artist}
                        onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                        placeholder="Will auto-detect"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Cover Art Override */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-brand-text-secondary">Cover Art (Optional)</label>
                  <span className="text-[10px] text-brand-text-tertiary">Auto-extracted from audio</span>
                </div>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                  className="w-full text-sm text-brand-text-tertiary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                />
                {coverFile && (
                  <p className="text-[10px] text-accent flex items-center gap-1">
                    <Check size={10} /> Override selected: {coverFile.name}
                  </p>
                )}
              </div>

              {/* Advanced Options Toggle */}
              <details className="group">
                <summary className="flex items-center gap-2 text-xs text-brand-text-tertiary cursor-pointer hover:text-white transition-colors">
                  <span>Advanced Options</span>
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-brand-text-tertiary mb-1">Genre</label>
                    <input
                      type="text"
                      value={uploadForm.genre}
                      onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                      placeholder="Auto"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-brand-text-tertiary mb-1">BPM</label>
                    <input
                      type="number"
                      value={uploadForm.bpm}
                      onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })}
                      placeholder="Auto"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-brand-text-tertiary mb-1">Tonality</label>
                    <input
                      type="text"
                      value={uploadForm.tonality}
                      onChange={(e) => setUploadForm({ ...uploadForm, tonality: e.target.value })}
                      placeholder="Auto"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-xs"
                    />
                  </div>
                </div>
              </details>

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={audioFiles.length === 0}
                  className="flex-1 px-5 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {audioFiles.length > 1 
                    ? `Upload ${audioFiles.length} Tracks with Auto-Extraction`
                    : 'Upload with Auto-Extraction'}
                </button>
                <button
                  type="button"
                  onClick={resetUpload}
                  disabled={audioFiles.length === 0}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-brand-text-tertiary hover:text-white transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Mashup List ── */}
      <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Music className="w-4 h-4 text-accent" />
          All Mashups ({mashups.length})
        </h3>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                <div className="w-12 h-12 rounded-lg bg-white/[0.06]" />
                <div className="flex-1">
                  <div className="h-3 bg-white/[0.06] rounded w-1/2 mb-1.5" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : mashups.length === 0 ? (
          <div className="text-center py-10">
            <Music className="w-10 h-10 text-brand-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-brand-text-tertiary">No mashups uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {mashups.map((mashup) => (
              <div
                key={mashup._id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-dark-elevated">
                  {mashup.coverArt ? (
                    <>
                      <img
                        src={mashup.coverArt}
                        alt={mashup.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full" style={{ display: 'none' }}>
                        <GenericCoverArt title={mashup.title} artist={mashup.artist} size="md" />
                      </div>
                    </>
                  ) : (
                    <GenericCoverArt title={mashup.title} artist={mashup.artist} size="md" />
                  )}
                </div>

                {editingId === mashup._id ? (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                      placeholder="Title"
                    />
                    <input
                      value={editForm.artist}
                      onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                      placeholder="Artist"
                    />
                    <input
                      value={editForm.bpm}
                      onChange={(e) => setEditForm({ ...editForm, bpm: e.target.value })}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                      placeholder="BPM"
                    />
                    <input
                      value={editForm.tonality}
                      onChange={(e) => setEditForm({ ...editForm, tonality: e.target.value })}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                      placeholder="Tonality"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{mashup.title}</p>
                    <p className="text-xs text-brand-text-tertiary truncate">{mashup.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {mashup.genre && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-accent bg-accent/10">{mashup.genre}</span>
                      )}
                      {mashup.bpm > 0 && (
                        <span className="text-[9px] text-brand-text-tertiary">{mashup.bpm} BPM</span>
                      )}
                      {mashup.tonality && (
                        <span className="text-[9px] text-brand-text-tertiary">{mashup.tonality}</span>
                      )}
                      <span className="text-[9px] text-brand-text-tertiary">
                        {new Date(mashup.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {editingId === mashup._id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(mashup._id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-text-tertiary hover:bg-white/10 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTogglePublish(mashup)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          mashup.isPublished ? 'text-green-400 hover:bg-green-500/10' : 'text-brand-text-tertiary hover:bg-white/10'
                        }`}
                        title={mashup.isPublished ? 'Published (click to hide)' : 'Hidden (click to publish)'}
                      >
                        {mashup.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => startEdit(mashup)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(mashup._id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
