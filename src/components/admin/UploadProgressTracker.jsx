import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  Music, 
  Disc, 
  FolderOpen,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import API_URL from '../../config/api';

const API_BASE = API_URL;

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProgressBar({ value, color = 'accent' }) {
  const colorMap = {
    accent: 'bg-accent',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div
        className={`${colorMap[color]} h-2 rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    processing: { label: 'Processing', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Loader, spin: true },
    uploading: { label: 'Uploading', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Upload, spin: false },
    completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, spin: false },
    failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, spin: false }
  };

  const { label, color, icon: Icon, spin } = config[status] || config.processing;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

function CollectionCard({ collection, isExpanded, onToggle, onDismiss, canDismiss }) {
  const progressColor = collection.status === 'completed' ? 'green' 
    : collection.status === 'failed' ? 'red' 
    : 'accent';

  return (
    <div className="bg-dark-elevated border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20">
      <div className="flex items-center">
      <button
        onClick={onToggle}
        className="flex-1 p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            {collection.status === 'processing' || collection.status === 'uploading' ? (
              <Loader className="w-5 h-5 text-accent animate-spin" />
            ) : collection.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{collection.name}</h3>
            <p className="text-brand-text-tertiary text-xs mt-0.5">
              {formatDate(collection.createdAt)} at {formatTime(collection.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={collection.status} />
            <span className="text-accent font-bold text-sm">{collection.processingProgress ?? 0}%</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-brand-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-brand-text-tertiary" />
            )}
          </div>
        </div>
      </button>
      {canDismiss && (
        <button
          onClick={e => { e.stopPropagation(); onDismiss?.(collection._id); }}
          className="p-3 mr-2 text-brand-text-tertiary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
          title="Dismiss stale upload"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      </div>

      <div className="px-4 pb-1">
        <ProgressBar value={collection.processingProgress ?? 0} color={progressColor} />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-white/5 mt-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-bg rounded-lg p-3 text-center">
              <FolderOpen className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{collection.totalDatePacks ?? '-'}</p>
              <p className="text-brand-text-tertiary text-xs">Date Packs</p>
            </div>
            <div className="bg-dark-bg rounded-lg p-3 text-center">
              <Disc className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{collection.totalAlbums ?? '-'}</p>
              <p className="text-brand-text-tertiary text-xs">Albums</p>
            </div>
            <div className="bg-dark-bg rounded-lg p-3 text-center">
              <Music className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{collection.totalTracks ?? '-'}</p>
              <p className="text-brand-text-tertiary text-xs">Tracks</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-brand-text-tertiary">
            <Clock className="w-3 h-3" />
            <span>Last updated: {formatDate(collection.updatedAt)} at {formatTime(collection.updatedAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UploadProgressTracker() {
  const [processing, setProcessing] = useState([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState([]);
  const [recentMashups, setRecentMashups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [mashupExpandedId, setMashupExpandedId] = useState(null);
  const [pollInterval, setPollInterval] = useState(5000);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/upload-status`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setProcessing(data.data.processing || []);
        setRecentlyCompleted(data.data.recentlyCompleted || []);
        setRecentMashups(data.data.recentMashups || []);
        setError('');
        setLastFetched(new Date());

        // Poll faster when there are active uploads
        setPollInterval(data.data.hasActiveUploads ? 3000 : 10000);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch upload status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  const handleRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  const dismissUpload = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/upload-status/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setProcessing(prev => prev.filter(c => c._id !== id));
      }
    } catch (err) {
      console.error('Dismiss upload error:', err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const toggleMashupExpand = (id) => {
    setMashupExpandedId(prev => prev === id ? null : id);
  };

  const hasActiveUploads = processing.length > 0;
  const hasRecentMashups = recentMashups.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Upload className="w-6 h-6 text-accent" />
            Upload Tracker
          </h2>
          <p className="text-brand-text-tertiary text-sm mt-1">
            Monitor collection uploads and background processing in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-brand-text-tertiary">
              Updated {formatTime(lastFetched)}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium text-sm">Failed to fetch upload status</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Active Uploads */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${hasActiveUploads ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'}`} />
          <h3 className="text-lg font-semibold text-white">
            Active Uploads
          </h3>
          {hasActiveUploads && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
              {processing.length}
            </span>
          )}
        </div>

        {loading && processing.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-brand-text-tertiary">
            <Loader className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : processing.length === 0 ? (
          <div className="bg-dark-elevated border border-white/10 rounded-xl p-8 text-center">
            <HardDrive className="w-10 h-10 text-brand-text-tertiary mx-auto mb-3 opacity-50" />
            <p className="text-brand-text-secondary font-medium">No active uploads</p>
            <p className="text-brand-text-tertiary text-sm mt-1">
              Upload a collection from the Record Pool section to see progress here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {processing.map(collection => (
              <CollectionCard
                key={collection._id}
                collection={collection}
                isExpanded={expandedId === collection._id}
                onToggle={() => toggleExpand(collection._id)}
                onDismiss={dismissUpload}
                canDismiss={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <h3 className="text-lg font-semibold text-white">
            Recently Completed
          </h3>
          <span className="text-xs text-brand-text-tertiary">(last hour)</span>
        </div>

        {recentlyCompleted.length === 0 ? (
          <div className="bg-dark-elevated border border-white/10 rounded-xl p-6 text-center">
            <p className="text-brand-text-tertiary text-sm">No recently completed uploads</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentlyCompleted.map(collection => (
              <CollectionCard
                key={collection._id}
                collection={{ ...collection, processingProgress: 100 }}
                isExpanded={expandedId === collection._id}
                onToggle={() => toggleExpand(collection._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Mashup Uploads */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-4 h-4 text-accent" />
          <h3 className="text-lg font-semibold text-white">
            Recent Mashup Uploads
          </h3>
          <span className="text-xs text-brand-text-tertiary">(last hour)</span>
          {hasRecentMashups && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
              {recentMashups.length}
            </span>
          )}
        </div>

        {recentMashups.length === 0 ? (
          <div className="bg-dark-elevated border border-white/10 rounded-xl p-6 text-center">
            <p className="text-brand-text-tertiary text-sm">No recent mashup uploads</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMashups.map((mashup, idx) => (
              <div 
                key={mashup._id || idx} 
                className="bg-dark-elevated border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20"
              >
                <button
                  onClick={() => toggleMashupExpand(mashup._id || idx)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {mashup.coverArt ? (
                        <img src={mashup.coverArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-accent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{mashup.title}</h3>
                      <p className="text-brand-text-tertiary text-xs mt-0.5">
                        {mashup.artist} • {formatDate(mashup.createdAt)} at {formatTime(mashup.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3" />
                        Uploaded
                      </span>
                      {mashupExpandedId === (mashup._id || idx) ? (
                        <ChevronUp className="w-4 h-4 text-brand-text-tertiary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-brand-text-tertiary" />
                      )}
                    </div>
                  </div>
                </button>

                {mashupExpandedId === (mashup._id || idx) && (
                  <div className="px-4 pb-4 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-dark-bg rounded-lg p-3 text-center">
                        <p className="text-brand-text-tertiary text-xs mb-1">Genre</p>
                        <p className="text-white font-bold text-sm">{mashup.genre || '-'}</p>
                      </div>
                      <div className="bg-dark-bg rounded-lg p-3 text-center">
                        <p className="text-brand-text-tertiary text-xs mb-1">BPM</p>
                        <p className="text-white font-bold text-sm">{mashup.bpm || '-'}</p>
                      </div>
                      <div className="bg-dark-bg rounded-lg p-3 text-center">
                        <p className="text-brand-text-tertiary text-xs mb-1">Tonality</p>
                        <p className="text-white font-bold text-sm">{mashup.tonality || '-'}</p>
                      </div>
                      <div className="bg-dark-bg rounded-lg p-3 text-center">
                        <p className="text-brand-text-tertiary text-xs mb-1">Cover Art</p>
                        <p className="text-white font-bold text-sm">{mashup.coverArt ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    {mashup.uploadedBy && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-brand-text-tertiary">
                        <Clock className="w-3 h-3" />
                        <span>Uploaded by: {mashup.uploadedBy.name || mashup.uploadedBy.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Polling indicator */}
      {hasActiveUploads && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-brand-text-tertiary">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Auto-refreshing every {pollInterval / 1000}s
        </div>
      )}
    </div>
  );
}
