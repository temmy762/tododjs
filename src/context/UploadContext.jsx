import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import API_URL from '../config/api';

const UploadContext = createContext(null);

const LS_KEY = 'tododjs:activeUploads';

// Persisted entries are meant to survive a page reload during an upload, not
// to live forever. Without an expiry, an upload that never finished is
// restored and re-polled on every visit — reappearing as a fresh "failure"
// long after the fact, and making a genuinely new problem indistinguishable
// from an old ghost. Nothing legitimately takes this long.
const MAX_PERSISTED_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function saveToStorage(uploads) {
  try {
    // Stamp on write so age can be judged on read.
    const stamped = uploads.map(u => ({ ...u, savedAt: u.savedAt || Date.now() }));
    localStorage.setItem(LS_KEY, JSON.stringify(stamped));
  } catch {}
}

function readFromStorage() {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    if (!Array.isArray(all)) return [];
    const fresh = all.filter(u => !u.savedAt || Date.now() - u.savedAt < MAX_PERSISTED_AGE_MS);
    if (fresh.length !== all.length) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(fresh)); } catch {}
    }
    return fresh;
  } catch {
    return [];
  }
}

export function UploadProvider({ children }) {
  // ── Bulk upload (BulkUploadModal) ───────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkSuccessRef = useRef(null);

  // ── Album upload (AlbumUploadModal) ─────────────────────────────────────────
  const [albumMeta, setAlbumMeta] = useState(null); // { sourceId, datePackId, sourceName, dateCardName }
  const albumSuccessRef = useRef(null);

  // ── Reload-resumed uploads ───────────────────────────────────────────────────
  // Each entry: { id, type:'bulk'|'album', resourceId, name, status, progress }
  const [resumed, setResumed] = useState([]);
  const resumeIntervalsRef = useRef({});

  const updateResumed = useCallback((id, patch) => {
    setResumed(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const dismissResumed = useCallback((id) => {
    clearInterval(resumeIntervalsRef.current[id]);
    delete resumeIntervalsRef.current[id];
    setResumed(prev => prev.filter(r => r.id !== id));
    const saved = readFromStorage().filter(u => u.id !== id);
    saveToStorage(saved);
  }, []);

  // On mount — restore any in-progress uploads from localStorage and poll them
  useEffect(() => {
    const saved = readFromStorage();
    const inProgress = saved.filter(u => u.status === 'processing' && u.resourceId);
    if (!inProgress.length) return;

    setResumed(inProgress.map(u => ({ ...u, progress: u.progress || 0 })));

    inProgress.forEach(upload => {
      const endpoint = upload.type === 'album'
        ? `${API_URL}/albums/${upload.resourceId}/status`
        : `${API_URL}/collections/${upload.resourceId}/status`;

      const token = localStorage.getItem('token');
      let count = 0;

      resumeIntervalsRef.current[upload.id] = setInterval(async () => {
        count++;
        if (count > 600) {
          updateResumed(upload.id, { status: 'failed' });
          clearInterval(resumeIntervalsRef.current[upload.id]);
          return;
        }
        try {
          const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (!data.success) return;
          const d = data.data;
          const status = d.status === 'completed' ? 'completed' : d.status === 'failed' ? 'failed' : 'processing';
          const progress = d.processingProgress ?? d.progress ?? 0;
          updateResumed(upload.id, { status, progress });
          if (status === 'completed' || status === 'failed') {
            clearInterval(resumeIntervalsRef.current[upload.id]);
            delete resumeIntervalsRef.current[upload.id];
            if (status === 'completed') {
              const updated = readFromStorage().map(u => u.id === upload.id ? { ...u, status: 'completed' } : u);
              saveToStorage(updated);
            }
          }
        } catch {}
      }, 3000);
    });

    return () => {
      Object.values(resumeIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  // ── API ──────────────────────────────────────────────────────────────────────
  const openBulkUpload = useCallback((onSuccess) => {
    bulkSuccessRef.current = onSuccess;
    setBulkOpen(true);
  }, []);

  const closeBulkUpload = useCallback(() => {
    setBulkOpen(false);
  }, []);

  const openAlbumUpload = useCallback((meta, onSuccess) => {
    albumSuccessRef.current = onSuccess;
    setAlbumMeta(meta);
  }, []);

  const closeAlbumUpload = useCallback(() => {
    setAlbumMeta(null);
  }, []);

  // Called by upload components when processing starts, so we can restore on reload
  const trackProcessing = useCallback(({ type, resourceId, name }) => {
    const id = `${type}-${resourceId}`;
    const entry = { id, type, resourceId, name, status: 'processing', progress: 0, ts: Date.now() };
    setResumed(prev => prev.some(r => r.id === id) ? prev : [...prev, entry]);
    const existing = readFromStorage().filter(u => u.id !== id);
    saveToStorage([...existing, entry]);
  }, []);

  const clearTracking = useCallback((resourceId) => {
    const id_bulk = `bulk-${resourceId}`;
    const id_album = `album-${resourceId}`;
    const saved = readFromStorage().filter(u => u.id !== id_bulk && u.id !== id_album);
    saveToStorage(saved);
  }, []);

  return (
    <UploadContext.Provider value={{
      bulkOpen, openBulkUpload, closeBulkUpload, bulkSuccessRef,
      albumMeta, openAlbumUpload, closeAlbumUpload, albumSuccessRef,
      resumed, dismissResumed, trackProcessing, clearTracking,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export const useUpload = () => useContext(UploadContext);
