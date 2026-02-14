import { useState, useEffect, useRef } from 'react';
import { X, Music, Download, Edit2, Trash2, Save, Play, Pause, Volume2 } from 'lucide-react';
import SearchBar from './SearchBar';
import AdvancedFilterPanel from './AdvancedFilterPanel';

export default function ManageAlbumModal({ album, onClose, onUpdate }) {
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTrack, setEditingTrack] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [playingTrack, setPlayingTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const audioRef = useRef(null);

  useEffect(() => {
    fetchTracks();
  }, [album._id]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/albums/${album._id}/tracks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTracks(data.data);
        setFilteredTracks(data.data);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(query, activeFilters);
  };

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    applyFilters(searchQuery, filters);
  };

  const applyFilters = (query, filters) => {
    let filtered = [...tracks];

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(track =>
        track.title.toLowerCase().includes(lowerQuery) ||
        track.artist.toLowerCase().includes(lowerQuery) ||
        (track.featuredArtist && track.featuredArtist.toLowerCase().includes(lowerQuery))
      );
    }

    // Genre filter
    if (filters.genre) {
      filtered = filtered.filter(track => 
        track.genre && track.genre.toLowerCase().includes(filters.genre.toLowerCase())
      );
    }

    // Tonality key filter
    if (filters.tonalityKey) {
      filtered = filtered.filter(track =>
        track.tonality?.key && track.tonality.key.toLowerCase().includes(filters.tonalityKey.toLowerCase())
      );
    }

    // Camelot filter
    if (filters.camelot) {
      filtered = filtered.filter(track =>
        track.tonality?.camelot === filters.camelot
      );
    }

    // BPM range filter
    if (filters.bpmMin) {
      filtered = filtered.filter(track => track.bpm >= parseInt(filters.bpmMin));
    }
    if (filters.bpmMax) {
      filtered = filtered.filter(track => track.bpm <= parseInt(filters.bpmMax));
    }

    setFilteredTracks(filtered);
  };

  const handleEditTrack = (track) => {
    setEditingTrack(track._id);
    setEditForm({
      title: track.title,
      artist: track.artist,
      featuredArtist: track.featuredArtist || '',
      bpm: track.bpm || '',
      genre: track.genre || ''
    });
  };

  const handleSaveTrack = async (trackId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tracks/${trackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        setEditingTrack(null);
        fetchTracks();
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const handleDeleteTrack = async (trackId) => {
    if (!confirm('Are you sure you want to delete this track?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tracks/${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchTracks();
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const handlePlayTrack = async (track) => {
    try {
      if (playingTrack === track._id && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setPlayingTrack(null);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tracks/${track._id}/playback`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (audioRef.current) {
          audioRef.current.src = data.data.url;
          audioRef.current.play();
          setPlayingTrack(track._id);
        }
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percent * duration;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg border border-white/10 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={album.coverArt}
              alt={album.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{album.name}</h2>
              <p className="text-brand-text-tertiary">
                {album.sourceId?.name} • {album.year} • {filteredTracks.length} of {tracks.length} tracks
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Search Bar */}
          <SearchBar
            placeholder="Search tracks by title, artist..."
            onSearch={handleSearch}
            onFilterClick={() => setShowFilters(true)}
            showFilters={true}
          />
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-brand-text-tertiary">
              Loading tracks...
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTracks.map((track, index) => (
                <div
                  key={track._id}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10"
                >
                  {editingTrack === track._id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-brand-text-tertiary mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-text-tertiary mb-1">Artist</label>
                          <input
                            type="text"
                            value={editForm.artist}
                            onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-text-tertiary mb-1">Featured Artist</label>
                          <input
                            type="text"
                            value={editForm.featuredArtist}
                            onChange={(e) => setEditForm({ ...editForm, featuredArtist: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brand-text-tertiary mb-1">BPM</label>
                          <input
                            type="number"
                            value={editForm.bpm}
                            onChange={(e) => setEditForm({ ...editForm, bpm: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveTrack(track._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
                        >
                          <Save size={16} />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTrack(null)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="p-2 hover:bg-accent/20 rounded-lg transition-colors text-accent"
                      >
                        {playingTrack === track._id ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <div className="text-brand-text-tertiary font-mono text-sm w-8">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{track.title}</div>
                        <div className="text-sm text-brand-text-tertiary">
                          {track.artist}
                          {track.featuredArtist && ` feat. ${track.featuredArtist}`}
                        </div>
                      </div>
                      <div className="text-sm text-brand-text-tertiary">
                        {track.genre}
                      </div>
                      {track.tonality?.camelot && (
                        <div className="px-2 py-1 bg-accent/20 text-accent text-xs font-bold rounded">
                          {track.tonality.camelot}
                        </div>
                      )}
                      <div className="text-sm text-brand-text-tertiary">
                        {track.bpm && `${track.bpm} BPM`}
                      </div>
                      <div className="text-sm text-brand-text-tertiary">
                        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                      </div>
                      <div className="text-sm text-accent flex items-center gap-1">
                        <Download size={14} />
                        {track.downloads || 0}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTrack(track)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track._id)}
                          className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audio Player */}
        {playingTrack && (
          <div className="p-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    if (audioRef.current.paused) {
                      audioRef.current.play();
                    } else {
                      audioRef.current.pause();
                    }
                  }
                }}
                className="p-2 hover:bg-accent/20 rounded-lg transition-colors text-accent"
              >
                {audioRef.current && !audioRef.current.paused ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">
                  {tracks.find(t => t._id === playingTrack)?.title}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-text-tertiary">{formatTime(currentTime)}</span>
                  <div
                    onClick={handleSeek}
                    className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer"
                  >
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-brand-text-tertiary">{formatTime(duration)}</span>
                </div>
              </div>
              <Volume2 size={20} className="text-brand-text-tertiary" />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <div className="text-sm text-brand-text-tertiary">
            Total: {tracks.length} tracks • {(album.totalSize / (1024 * 1024)).toFixed(2)} MB
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlayingTrack(null)}
          onLoadedMetadata={handleTimeUpdate}
        />

        {/* Advanced Filter Panel */}
        <AdvancedFilterPanel
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={handleFilterApply}
          albumId={album._id}
        />
      </div>
    </div>
  );
}
