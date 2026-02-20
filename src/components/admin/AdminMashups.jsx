import { useState, useEffect, useRef } from 'react';
import {
  Music, Upload, Trash2, Edit3, Save, X, Link, Eye, EyeOff,
  Loader, CheckCircle, AlertCircle, Youtube, FileAudio
} from 'lucide-react';
import GenericCoverArt from '../GenericCoverArt';
import API_URL from '../../config/api';

const API = API_URL;

export default function AdminMashups() {
  const [mashups, setMashups] = useState([]);
  const [settings, setSettings] = useState({ videoUrl: '', pageTitle: 'Mash Ups', pageDescription: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
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
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setMessage({ type: 'error', text: 'Please select an audio file' });
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (coverFile) formData.append('coverArt', coverFile);
      formData.append('title', uploadForm.title || audioFile.name.replace(/\.[^/.]+$/, ''));
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
        setMessage({ type: 'success', text: 'Mashup uploaded successfully!' });
        setUploadForm({ title: '', artist: '', genre: 'Mashup', bpm: '', tonality: '' });
        setAudioFile(null);
        setCoverFile(null);
        if (audioRef.current) audioRef.current.value = '';
        if (coverRef.current) coverRef.current.value = '';
        fetchMashups();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message });
    } finally {
      setUploading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
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
      <div className="p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-accent" />
          Upload New Mashup
        </h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Title</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                placeholder="Track title (auto-fills from filename)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Artist</label>
              <input
                type="text"
                value={uploadForm.artist}
                onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                placeholder="Artist name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Genre</label>
              <input
                type="text"
                value={uploadForm.genre}
                onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">BPM</label>
              <input
                type="number"
                value={uploadForm.bpm}
                onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Tonality</label>
              <input
                type="text"
                value={uploadForm.tonality}
                onChange={(e) => setUploadForm({ ...uploadForm, tonality: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent text-white text-sm"
                placeholder="e.g. 8A"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Audio File *</label>
              <div className="relative">
                <input
                  ref={audioRef}
                  type="file"
                  accept=".mp3,.wav,.flac"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className="w-full text-sm text-brand-text-tertiary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/20 file:text-accent hover:file:bg-accent/30 cursor-pointer"
                />
              </div>
              {audioFile && (
                <p className="text-[10px] text-brand-text-tertiary mt-1 flex items-center gap-1">
                  <FileAudio size={10} />
                  {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)}MB)
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-secondary mb-1.5">Cover Art (optional)</label>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files[0])}
                className="w-full text-sm text-brand-text-tertiary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={uploading || !audioFile}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg font-medium text-white text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload Mashup'}
          </button>
        </form>
      </div>

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
                    <img src={mashup.coverArt} alt={mashup.title} className="w-full h-full object-cover" />
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
