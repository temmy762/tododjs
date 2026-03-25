import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Upload, Archive, AlertCircle, CheckCircle, Loader, FolderTree, Music, ChevronDown, ChevronUp, ChevronRight, RotateCcw, Ban, FolderOpen } from 'lucide-react';
import { API_URL } from '../../config/api';

export default function BulkUploadModal({ onClose, onSuccess }) {
  const [uploadItems, setUploadItems] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [expandedDatePacks, setExpandedDatePacks] = useState(new Set());
  const [failedTracks, setFailedTracks] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [collectionId, setCollectionId] = useState(null);
  const [showStructureGuide, setShowStructureGuide] = useState(false);
  const pollIntervalRef = useRef(null);
  const xhrByItemIdRef = useRef(new Map());
  const uploadRateByItemIdRef = useRef(new Map());
  
  // New state for 3-phase workflow
  const [uploadPhase, setUploadPhase] = useState('upload'); // 'upload' | 'cards'

  const activeItem = uploadItems[activeItemIndex] || null;
  const activeFile = activeItem?.file || null;
  const extractedStructure = activeItem?.scanResult || null;

  const groupAlbumsByDatePackId = (albums = []) => {
    const grouped = new Map();
    for (const a of albums) {
      const key = a?.datePackId ? String(a.datePackId) : '__unknown__';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(a);
    }
    return grouped;
  };

  const openInRecordPool = (collectionId) => {
    if (!collectionId) return;
    try {
      window.dispatchEvent(
        new CustomEvent('admin:navigate', {
          detail: {
            section: 'recordpool',
            collectionId
          }
        })
      );
    } catch {
      // ignore
    }
    onClose?.();
  };

  const updateItem = (index, patch) => {
    setUploadItems(prev => prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it)));
  };

  const formatBytes = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    let i = 0;
    let v = bytes;
    while (v >= k && i < units.length - 1) {
      v /= k;
      i++;
    }
    const fixed = i === 0 ? 0 : (i >= 2 ? 1 : 0);
    return `${v.toFixed(fixed)} ${units[i]}`;
  };

  const formatEta = (seconds) => {
    if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '--';
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m <= 0) return `${r}s`;
    return `${m}m ${String(r).padStart(2, '0')}s`;
  };

  const computeStageLabel = (it) => {
    if (!it) return '';
    if (it.uploadStatus === 'idle') return 'Queued';
    if (it.uploadStatus === 'uploading') return 'Uploading to server';
    if (it.uploadStatus === 'processing') {
      const p = it.processingProgress ?? 0;
      if (p <= 5) return 'Uploading ZIP to Wasabi';
      if (p <= 20) return 'Extracting ZIPs';
      if (p <= 95) return 'Uploading tracks';
      return 'Finalizing';
    }
    if (it.uploadStatus === 'completed') return 'Completed';
    if (it.uploadStatus === 'failed') return 'Failed';
    return it.uploadStatus;
  };

  const stageBadgeClass = (it) => {
    if (!it) return 'bg-white/10 text-brand-text-tertiary border-white/10';
    if (it.uploadStatus === 'failed') return 'bg-red-500/10 text-red-300 border-red-500/20';
    if (it.uploadStatus === 'completed') return 'bg-green-500/10 text-green-300 border-green-500/20';
    if (it.uploadStatus === 'uploading') return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    if (it.uploadStatus === 'processing') return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
    return 'bg-white/10 text-brand-text-tertiary border-white/10';
  };

  const getItemProgressPercent = (it) => {
    if (!it) return 0;
    if (it.uploadStatus === 'uploading') return it.uploadProgress ?? 0;
    if (it.uploadStatus === 'processing') return it.processingProgress ?? 0;
    if (it.uploadStatus === 'completed') return 100;
    return 0;
  };

  const cancelItem = async (idx) => {
    const it = uploadItems[idx];
    if (!it) return;

    if (it.uploadStatus === 'uploading') {
      const xhr = xhrByItemIdRef.current.get(it.id);
      try { xhr?.abort(); } catch { /* ignore */ }
      updateItem(idx, {
        uploadStatus: 'failed',
        uploadError: 'Upload cancelled by user.'
      });
      return;
    }

    if (it.uploadStatus === 'processing' && it.collectionId) {
      updateItem(idx, {
        uploadError: ''
      });
      try {
        const token = localStorage.getItem('token');
        await fetch(api(`/collections/${it.collectionId}/cancel`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          }
        });
      } catch {
        // ignore
      }
      updateItem(idx, {
        uploadStatus: 'failed',
        uploadError: 'Processing cancelled by user.'
      });
    }
  };

  const retryItem = async (idx) => {
    const it = uploadItems[idx];
    if (!it) return;
    if (uploading) return;
    if (it.scanStatus !== 'scanned') return;

    setUploading(true);
    setActiveItemIndex(idx);
    setUploadProgress(0);
    updateItem(idx, {
      uploadStatus: 'uploading',
      uploadError: '',
      collectionId: null,
      processingProgress: 0,
      uploadProgress: 0,
      uploadLoaded: 0,
      uploadTotal: 0,
      uploadSpeedBps: 0,
      uploadEtaSec: null
    });

    try {
      const response = await uploadSingleItem(it, idx);
      const newCollectionId = response.data?.collection?._id;
      if (newCollectionId) startPolling(newCollectionId);

      updateItem(idx, {
        uploadStatus: 'processing',
        uploadError: '',
        collectionId: newCollectionId,
        created: response.data,
        processingProgress: 0
      });

      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          try {
            const token = localStorage.getItem('token');
            const statusResp = await fetch(api(`/collections/${newCollectionId}/status`), {
              headers: {
                Authorization: token ? `Bearer ${token}` : ''
              }
            });

            if (statusResp.status === 401 || statusResp.status === 403) {
              clearInterval(interval);
              updateItem(idx, {
                uploadStatus: 'failed',
                uploadError: 'Unauthorized. Please log in as admin to track upload progress.'
              });
              resolve();
              return;
            }

            const statusJson = await statusResp.json();
            if (statusJson?.success) {
              const { status, processingProgress } = statusJson.data;
              updateItem(idx, {
                processingProgress: processingProgress ?? 0,
                uploadStatus: status === 'completed'
                  ? 'completed'
                  : status === 'failed'
                    ? 'failed'
                    : 'processing'
              });
              if (status === 'completed' || status === 'failed') {
                clearInterval(interval);
                resolve();
              }
            }
          } catch {
            // ignore transient
          }
        }, 3000);
      });
    } catch (e) {
      updateItem(idx, {
        uploadStatus: 'failed',
        uploadError: e?.message || 'Upload failed. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const api = (path) => {
    const base = API_URL?.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  };

  const safeJson = async (response) => {
    const text = await response.text();
    try {
      return { ok: true, json: JSON.parse(text) };
    } catch (e) {
      return {
        ok: false,
        error: `Expected JSON but got: ${text.slice(0, 120)}`,
        status: response.status,
        raw: text
      };
    }
  };

  const toggleDatePack = (name) => {
    setExpandedDatePacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const handleCancelProcessing = async () => {
    if (!collectionId) return;
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/collections/${collectionId}/cancel`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setProcessingStatus('cancelled');
        setSuccess('Processing cancelled');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      } else {
        setError(data.message || 'Failed to cancel processing');
      }
    } catch (err) {
      setError('Failed to cancel: ' + err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!collectionId || failedTracks.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/collections/${collectionId}/retry-failed`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ trackIds: failedTracks.map(t => t._id) })
      });
      const data = await response.json();
      if (data.success) {
        setFailedTracks([]);
        setProcessingStatus('processing');
        startPolling(collectionId);
        setSuccess('Retrying failed tracks...');
      } else {
        setError(data.message || 'Failed to retry tracks');
      }
    } catch (err) {
      setError('Failed to retry: ' + err.message);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (id) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api(`/collections/${id}/status`), {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        });
        if (response.status === 401 || response.status === 403) {
          clearInterval(pollIntervalRef.current);
          setProcessingStatus('failed');
          setError('Unauthorized. Please log in as admin to track upload progress.');
          return;
        }
        const data = await response.json();

        if (data.success) {
          const { status, processingProgress, totalDatePacks, totalAlbums, totalTracks } = data.data;

          // Update UI with current progress
          setUploadProgress(processingProgress);

          // Check for failed tracks in the response
          if (data.data.failedTracks && data.data.failedTracks.length > 0) {
            setFailedTracks(data.data.failedTracks);
          }

          // If completed or failed, stop polling
          if (status === 'completed') {
            setProcessingStatus('completed');
            setSuccess(`Complete! ${totalDatePacks} DatePacks, ${totalAlbums} Albums, ${totalTracks} Tracks created.`);
            clearInterval(pollIntervalRef.current);
          } else if (status === 'failed') {
            setProcessingStatus('failed');
            setError('Processing failed. Please check server logs.');
            clearInterval(pollIntervalRef.current);
          } else {
            setProcessingStatus('processing');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []).filter(Boolean);
    if (droppedFiles.length > 0) {
      validateAndAddFiles(droppedFiles);
    }
  }, []);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter(Boolean);
    if (selected.length > 0) {
      validateAndAddFiles(selected);
    }
  };

  const [validating, setValidating] = useState(false);

  const validateAndAddFiles = async (selectedFiles) => {
    const next = [];
    for (const f of selectedFiles) {
      if (!f?.name) continue;
      if (!f.name.toLowerCase().endsWith('.zip')) {
        setError(`Please upload ZIP files only (got: ${f.name})`);
        continue;
      }
      if (f.size > 150 * 1024 * 1024 * 1024) {
        setError('File size exceeds 150GB limit');
        continue;
      }
      next.push(f);
    }

    if (next.length === 0) return;

    setError('');
    setSuccess('');
    setProcessingStatus('');
    setCollectionId(null);
    setUploadProgress(0);
    setUploadPhase('upload');
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setUploadItems(prev => {
      const wasEmpty = prev.length === 0;
      const created = next.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        scanStatus: 'scanned',
        scanResult: null,
        scanError: '',
        overrides: {
          collectionName: ''
        },
        uploadStatus: 'idle',
        uploadError: '',
        collectionId: null,
        processingProgress: 0,
        created: null
      }));
      const merged = [...prev, ...created];
      if (wasEmpty) setActiveItemIndex(0);
      return merged;
    });
  };

  const uploadSingleItem = (item, idx) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('zipFile', item.file);
      formData.append('platform', 'PlayList Pro');
      formData.append(
        'name',
        item.overrides?.collectionName?.trim() || item.scanResult?.suggestedCollectionName || item.file.name.replace('.zip', '')
      );
      formData.append('year', new Date().getFullYear().toString());
      formData.append('month', (new Date().getMonth() + 1).toString().padStart(2, '0'));

      if (item.scanResult) {
        formData.append(
          'scanResult',
          JSON.stringify({
            ...item.scanResult,
            suggestedCollectionName: item.overrides?.collectionName?.trim() || item.scanResult.suggestedCollectionName
          })
        );
      }

      const xhr = new XMLHttpRequest();

      xhrByItemIdRef.current.set(item.id, xhr);
      uploadRateByItemIdRef.current.set(item.id, {
        lastTs: Date.now(),
        lastLoaded: 0
      });

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);

          if (typeof idx === 'number') {
            const key = item.id;
            const snap = uploadRateByItemIdRef.current.get(key) || { lastTs: Date.now(), lastLoaded: 0 };
            const now = Date.now();
            const dtMs = Math.max(1, now - snap.lastTs);
            const dLoaded = Math.max(0, event.loaded - snap.lastLoaded);
            const speedBps = (dLoaded / dtMs) * 1000;
            const etaSec = speedBps > 0 ? (event.total - event.loaded) / speedBps : null;

            uploadRateByItemIdRef.current.set(key, {
              lastTs: now,
              lastLoaded: event.loaded
            });

            updateItem(idx, {
              uploadProgress: percentComplete,
              uploadLoaded: event.loaded,
              uploadTotal: event.total,
              uploadSpeedBps: speedBps,
              uploadEtaSec: etaSec
            });
          }
        }
      });

      xhr.addEventListener('load', () => {
        xhrByItemIdRef.current.delete(item.id);
        uploadRateByItemIdRef.current.delete(item.id);
        if (xhr.status === 200 || xhr.status === 201) {
          let response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            return reject(new Error(`Server returned non-JSON response: ${xhr.responseText?.slice(0, 120)}`));
          }
          return resolve(response);
        }
        try {
          const resp = JSON.parse(xhr.responseText);
          return reject(new Error(resp.message || 'Upload failed. Please try again.'));
        } catch (e) {
          return reject(new Error('Upload failed. Please try again.'));
        }
      });

      xhr.addEventListener('error', () => {
        xhrByItemIdRef.current.delete(item.id);
        uploadRateByItemIdRef.current.delete(item.id);
        reject(new Error('Network error. Please check your connection.'));
      });

      xhr.addEventListener('abort', () => {
        xhrByItemIdRef.current.delete(item.id);
        uploadRateByItemIdRef.current.delete(item.id);
        reject(new Error('Upload cancelled.'));
      });

      const token = localStorage.getItem('token');
      xhr.open('POST', api('/collections'), true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  };

  const handleNextBatch = async () => {
    const ready = uploadItems.filter(i => i.scanStatus === 'scanned');
    if (ready.length === 0) {
      setError('No successfully scanned ZIP files to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    setUploadPhase('cards');

    for (let idx = 0; idx < uploadItems.length; idx++) {
      const item = uploadItems[idx];
      if (item.scanStatus !== 'scanned') continue;

      setActiveItemIndex(idx);
      setUploadProgress(0);

      setUploadItems(prev => prev.map((p, pIdx) => (pIdx === idx ? { ...p, uploadStatus: 'uploading' } : p)));

      try {
        const response = await uploadSingleItem(item, idx);
        const newCollectionId = response.data?.collection?._id;
        setCollectionId(newCollectionId);
        if (newCollectionId) startPolling(newCollectionId);

        setUploadItems(prev => prev.map((p, pIdx) => (
          pIdx === idx
            ? {
              ...p,
              uploadStatus: 'processing',
              uploadError: '',
              collectionId: newCollectionId,
              created: response.data,
              processingProgress: 0
            }
            : p
        )));
        onSuccess?.(response.data);

        // Wait for this collection to complete before moving to the next (sequential processing is safest)
        await new Promise((resolve) => {
          const interval = setInterval(async () => {
            try {
              const token = localStorage.getItem('token');
              const statusResp = await fetch(api(`/collections/${newCollectionId}/status`), {
                headers: {
                  Authorization: token ? `Bearer ${token}` : ''
                }
              });
              if (statusResp.status === 401 || statusResp.status === 403) {
                clearInterval(interval);
                setUploadItems(prev => prev.map((p, pIdx) => (
                  pIdx === idx
                    ? {
                      ...p,
                      uploadStatus: 'failed',
                      uploadError: 'Unauthorized. Please log in as admin to track upload progress.'
                    }
                    : p
                )));
                resolve();
                return;
              }
              const statusJson = await statusResp.json();
              if (statusJson?.success) {
                const { status, processingProgress, uploadStats } = statusJson.data;
                setUploadProgress(processingProgress);

                setUploadItems(prev => prev.map((p, pIdx) => (
                  pIdx === idx
                    ? {
                      ...p,
                      uploadStats: uploadStats,
                      processingProgress: processingProgress ?? p.processingProgress ?? 0,
                      uploadStatus: status === 'completed'
                        ? 'completed'
                        : status === 'failed'
                          ? 'failed'
                          : 'processing'
                    }
                    : p
                )));
                if (status === 'completed') {
                  clearInterval(interval);
                  resolve();
                }
                if (status === 'failed') {
                  clearInterval(interval);
                  resolve();
                }
              }
            } catch (e) {
              // ignore transient
            }
          }, 3000);
        });
      } catch (e) {
        setUploadItems(prev => prev.map((p, pIdx) => (
          pIdx === idx
            ? {
              ...p,
              uploadStatus: 'failed',
              uploadError: e?.message || 'Upload failed. Please try again.'
            }
            : p
        )));
      }
    }

    setUploading(false);
    setSuccess('Batch upload complete.');
  };

  const hasPendingScans = uploadItems.some(i => i.scanStatus === 'pending');

  const clearFile = () => {
    setUploadItems([]);
    setActiveItemIndex(0);
    setUploadProgress(0);
    setError('');
    setCollectionId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  const removeFileAtIndex = (index) => {
    setUploadItems(prev => prev.filter((_, i) => i !== index));
    setActiveItemIndex(prevIdx => {
      if (index < prevIdx) return Math.max(0, prevIdx - 1);
      if (index === prevIdx) return 0;
      return prevIdx;
    });
    setUploadProgress(0);
    setError('');
    setSuccess('');
    setProcessingStatus('');
    setCollectionId(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-elevated rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-dark-surface px-6 py-4 flex justify-between items-center border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-accent" />
            Bulk Collection Upload
          </h2>
          <button
            onClick={onClose}
            className="text-brand-text-tertiary hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-dark-bg">
          {uploadPhase === 'cards' ? (
            <div className="space-y-4">
              <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
                <div className="text-white font-semibold">Created Directories</div>
                <div className="text-sm text-brand-text-tertiary mt-1">
                  Each ZIP is converted into a Collection card with DatePacks and Albums.
                </div>
              </div>

              <div className="space-y-3">
                {uploadItems.map((it, idx) => {
                  const preview = it.scanResult;
                  const createdCollection = it.created?.collection;
                  const createdDatePacks = it.created?.datePacks || [];
                  const createdAlbums = it.created?.albums || [];
                  const albumsByDatePackId = groupAlbumsByDatePackId(createdAlbums);

                  const name = createdCollection?.name
                    || it.overrides?.collectionName?.trim()
                    || it.file.name.replace('.zip', '');

                  const dateLabel = createdCollection?.extractedDate
                    ? new Date(createdCollection.extractedDate).toLocaleDateString()
                    : null;

                  const genres = [];
                  const stageLabel = computeStageLabel(it);
                  const pct = getItemProgressPercent(it);
                  const showUploadStats = it.uploadStatus === 'uploading' && it.uploadTotal;

                  return (
                    <div
                      key={it.id}
                      className={`rounded-lg border p-4 ${idx === activeItemIndex ? 'border-accent bg-accent/5' : 'border-white/10 bg-dark-surface'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveItemIndex(idx)}
                              className="text-left font-semibold text-white truncate hover:underline"
                              title={name}
                            >
                              {name}
                            </button>
                            <span className="text-xs bg-white/10 text-brand-text-tertiary px-2 py-0.5 rounded">
                              PlayList Pro
                            </span>
                            {dateLabel ? (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                {dateLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-brand-text-tertiary mt-1">
                            {it.file.name}
                          </div>
                          {it.uploadStatus === 'failed' && it.uploadError ? (
                            <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                              {it.uploadError}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className={`text-[11px] px-2 py-1 rounded-full border ${stageBadgeClass(it)}`}>
                            <div className="flex items-center gap-2">
                              {(it.uploadStatus === 'uploading' || it.uploadStatus === 'processing') ? (
                                <Loader className="w-3 h-3 animate-spin" />
                              ) : null}
                              <span className="whitespace-nowrap">{stageLabel}{(it.uploadStatus === 'processing' || it.uploadStatus === 'uploading') ? ` · ${pct}%` : ''}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {(it.uploadStatus === 'uploading' || it.uploadStatus === 'processing') ? (
                              <button
                                type="button"
                                disabled={uploading && idx !== activeItemIndex}
                                onClick={() => cancelItem(idx)}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Cancel"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            ) : null}

                            {it.uploadStatus === 'failed' ? (
                              <button
                                type="button"
                                disabled={uploading}
                                onClick={() => retryItem(idx)}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Retry"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Retry
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {(it.uploadStatus === 'uploading' || it.uploadStatus === 'processing') ? (
                        <div className="mt-3">
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                            <div
                              className={`h-full ${it.uploadStatus === 'uploading' ? 'bg-blue-500/70' : 'bg-yellow-500/70'}`}
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                            />
                          </div>

                          {showUploadStats ? (
                            <div className="mt-2 flex items-center justify-between text-[11px] text-brand-text-tertiary">
                              <div className="whitespace-nowrap">
                                {formatBytes(it.uploadLoaded || 0)} / {formatBytes(it.uploadTotal || 0)}
                              </div>
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                <span>{formatBytes(it.uploadSpeedBps || 0)}/s</span>
                                <span>ETA {formatEta(it.uploadEtaSec)}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {it.collectionId && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => openInRecordPool(it.collectionId)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-colors"
                          >
                            <FolderOpen className="w-4 h-4" />
                            Open in Record Pool
                          </button>
                        </div>
                      )}

                      {genres.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {genres.slice(0, 8).map(g => (
                            <span key={g} className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      {createdDatePacks.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          {createdDatePacks.slice(0, 3).map((dp) => {
                            const dpAlbums = albumsByDatePackId.get(String(dp._id)) || [];
                            return (
                              <div key={dp._id} className="bg-dark-bg border border-white/10 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-white font-medium truncate">{dp.name}</div>
                                  <div className="text-xs text-brand-text-tertiary">{dpAlbums.length} albums</div>
                                </div>
                                {dpAlbums.length > 0 && (
                                  <div className="mt-2 grid grid-cols-1 gap-1">
                                    {dpAlbums.slice(0, 4).map((a) => (
                                      <div key={a._id} className="flex items-center justify-between text-xs text-brand-text-secondary">
                                        <div className="truncate">{a.name}</div>
                                        <div className="text-brand-text-tertiary whitespace-nowrap">{a.trackCount || 0} tracks</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {createdDatePacks.length > 3 && (
                            <div className="text-xs text-brand-text-tertiary">+{createdDatePacks.length - 3} more date packs</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
          {/* Info Box - Visual Structure Guide (Collapsible) */}
          <div className="bg-dark-surface border border-white/10 rounded-lg p-4 mb-4">
            <button
              onClick={() => setShowStructureGuide(!showStructureGuide)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-accent" />
                How to Organize Your ZIP File
              </h3>
              {showStructureGuide ? (
                <ChevronUp className="w-5 h-5 text-brand-text-tertiary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-brand-text-tertiary" />
              )}
            </button>
            
            {showStructureGuide && (
              <>
                {/* Visual Hierarchy Diagram */}
                <div className="space-y-3 mt-4">
                  {/* Level 1: ZIP File */}
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/20 border border-accent/40 rounded-lg px-4 py-3 flex items-center gap-2 min-w-[140px]">
                      <Archive className="w-5 h-5 text-accent" />
                      <span className="text-white font-medium text-sm">YourFile.zip</span>
                    </div>
                    <span className="text-brand-text-tertiary text-sm">← Upload this file</span>
                  </div>

                  {/* Connector */}
                  <div className="flex items-center ml-6">
                    <div className="w-px h-6 bg-accent/40"></div>
                  </div>

                  {/* Level 2: DatePacks */}
                  <div className="flex items-center gap-3 ml-6">
                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg px-4 py-2 flex items-center gap-2 min-w-[140px]">
                      <FolderTree className="w-4 h-4 text-blue-400" />
                      <span className="text-white text-sm">2024-01/</span>
                    </div>
                    <span className="text-brand-text-tertiary text-sm">Date Pack (release period)</span>
                  </div>

                  {/* Connector */}
                  <div className="flex items-center ml-12">
                    <div className="w-px h-6 bg-blue-500/40"></div>
                  </div>

                  {/* Level 3: Albums */}
                  <div className="flex items-center gap-3 ml-12">
                    <div className="bg-purple-500/20 border border-purple-500/40 rounded-lg px-4 py-2 flex items-center gap-2 min-w-[140px]">
                      <FolderTree className="w-4 h-4 text-purple-400" />
                      <span className="text-white text-sm">Album Name/</span>
                    </div>
                    <span className="text-brand-text-tertiary text-sm">Album or compilation</span>
                  </div>

                  {/* Connector */}
                  <div className="flex items-center ml-16">
                    <div className="w-px h-6 bg-purple-500/40"></div>
                  </div>

                  {/* Level 4: Tracks */}
                  <div className="flex items-center gap-3 ml-16">
                    <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-4 py-2 flex items-center gap-2 min-w-[140px]">
                      <Music className="w-4 h-4 text-green-400" />
                      <span className="text-white text-sm">Song.mp3</span>
                    </div>
                    <span className="text-brand-text-tertiary text-sm">Individual music tracks</span>
                  </div>
                </div>

                {/* Simple Explanation */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-brand-text-tertiary">
                    <strong className="text-white">Tip:</strong> Put your MP3 files inside folders for albums, 
                    then put those album folders inside date folders like "2024-01". 
                    The system will automatically organize everything.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-400">{success}</span>
            </div>
          )}

          {/* Upload Area */}
          {uploadItems.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-accent bg-accent/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-brand-text-tertiary mx-auto mb-4" />
              <p className="text-white mb-2">
                Drag and drop your ZIP file here, or{' '}
                <label className="text-accent hover:text-accent-hover cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    accept=".zip"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-brand-text-tertiary">
                Maximum file size: 100GB
              </p>
            </div>
          ) : (
            <div className="bg-dark-surface rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-accent/20 p-2 rounded">
                    <Archive className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {activeFile?.name}
                      {uploadItems.length > 1 ? (
                        <span className="text-brand-text-tertiary font-normal"> ({activeItemIndex + 1}/{uploadItems.length})</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-brand-text-tertiary">
                      {activeFile ? `${(activeFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={clearFile}
                    className="text-brand-text-tertiary hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {uploadItems.length > 1 && !uploading && (
                <div className="mb-3 space-y-2">
                  {uploadItems.map((it, idx) => (
                    <div key={it.id} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveItemIndex(idx);
                          setUploadProgress(0);
                          setError('');
                          setSuccess('');
                          setProcessingStatus('');
                          setCollectionId(null);
                          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        }}
                        className={`text-left flex-1 px-3 py-2 rounded border transition-colors ${
                          idx === activeItemIndex
                            ? 'border-accent bg-accent/10 text-white'
                            : 'border-white/10 bg-dark-elevated text-brand-text-tertiary hover:text-white hover:border-white/20'
                        }`}
                      >
                        <div className="text-sm font-medium">{it.file.name}</div>
                        <div className="text-xs">
                          {(it.file.size / 1024 / 1024).toFixed(1)} MB
                          <span className="ml-2">
                            {it.scanStatus === 'pending' ? '• scanning' : null}
                            {it.scanStatus === 'scanned' ? '• scanned' : null}
                            {it.scanStatus === 'failed' ? '• scan failed' : null}
                            {it.uploadStatus && it.uploadStatus !== 'idle' ? ` • ${it.uploadStatus}` : ''}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFileAtIndex(idx)}
                        className="text-brand-text-tertiary hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Batch Preview Card (per active ZIP) */}
              {activeItem && (
                <div className="mb-4 bg-dark-elevated rounded-lg border border-white/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-brand-text-tertiary">Preview</div>
                      <div className="text-white font-medium">{activeItem.file.name}</div>
                      {activeItem.scanStatus === 'failed' && (
                        <div className="text-xs text-red-400 mt-1">{activeItem.scanError || 'Failed to analyze ZIP'}</div>
                      )}
                    </div>
                    <div className="text-xs text-brand-text-tertiary">
                      {(activeItem.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>

                  {activeItem.scanStatus === 'scanned' && extractedStructure && (
                    <>
                      <div className="mt-4">
                        <div className="text-xs text-brand-text-tertiary mb-1">Collection name</div>
                        <input
                          type="text"
                          value={activeItem.overrides?.collectionName || extractedStructure.suggestedCollectionName || ''}
                          onChange={(e) => updateItem(activeItemIndex, { overrides: { ...activeItem.overrides, collectionName: e.target.value } })}
                          className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                        />
                        <div className="text-xs text-brand-text-tertiary mt-2">
                          {extractedStructure.totalDatePacks} DatePacks
                          {' • '}
                          {extractedStructure.totalAlbums} Albums
                          {' • '}
                          {extractedStructure.totalTracks} Tracks
                        </div>
                      </div>

                      {(extractedStructure.detectedGenres?.length > 0 || extractedStructure.extractedDate) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {extractedStructure.extractedDate ? (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                              {new Date(extractedStructure.extractedDate).toLocaleDateString()}
                            </span>
                          ) : null}
                          {(extractedStructure.detectedGenres || []).slice(0, 6).map((g) => (
                            <span key={g} className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeItem.scanStatus === 'pending' && (
                    <div className="mt-3 flex items-center gap-2 text-accent">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analyzing ZIP structure...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Validating State */}
              {validating && (
                <div className="mb-4 flex items-center gap-2 text-accent">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing ZIP structure...</span>
                </div>
              )}

              {/* Progress Bar - Shows during upload AND processing */}
              {(uploading || processingStatus === 'processing') && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-text-tertiary">
                      {uploading && uploadProgress < 100
                        ? 'Uploading...'
                        : processingStatus === 'processing'
                        ? 'Processing tracks...'
                        : 'Complete'}
                    </span>
                    <span className="text-white font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        processingStatus === 'completed'
                          ? 'bg-green-500'
                          : processingStatus === 'failed'
                          ? 'bg-red-500'
                          : 'bg-accent'
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Structure Preview - Expandable Tree */}
              {extractedStructure && !uploading && processingStatus !== 'processing' && (
                <div className="bg-dark-elevated rounded border border-white/10 p-3 mb-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-accent" />
                    Detected Structure
                    <span className="text-xs text-brand-text-tertiary font-normal">
                      ({extractedStructure.totalDatePacks} DatePacks, {extractedStructure.totalAlbums} Albums, {extractedStructure.totalTracks} Tracks)
                    </span>
                  </h4>
                  <div className="space-y-1">
                    <div className="text-sm text-white font-medium">
                      📁 {extractedStructure.collectionName}
                    </div>
                    {extractedStructure.datePacks?.map((dp) => (
                      <div key={dp.name} className="ml-4">
                        <button
                          onClick={() => toggleDatePack(dp.name)}
                          className="flex items-center gap-1 text-sm text-brand-text-tertiary hover:text-white transition-colors"
                        >
                          {expandedDatePacks.has(dp.name) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          📂 {dp.name}
                          <span className="text-xs">({dp.albums?.length || 0} albums)</span>
                        </button>
                        {expandedDatePacks.has(dp.name) && dp.albums?.map((album) => (
                          <div key={album.name} className="ml-6 text-sm text-brand-text-tertiary">
                            💿 {album.name}
                            <span className="text-xs ml-1">({album.trackCount} tracks)</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {processingStatus === 'processing' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      AI analyzing tracks (tonality, BPM, genre)... This may take a few minutes.
                    </span>
                  </div>
                  <button
                    onClick={handleCancelProcessing}
                    disabled={isCancelling}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3 h-3" />
                    {isCancelling ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
              )}
              {processingStatus === 'completed' && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Processing complete!</span>
                </div>
              )}
              {processingStatus === 'failed' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Processing failed. Check server logs.</span>
                  </div>
                  {failedTracks.length > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-accent/20 hover:bg-accent/30 text-accent rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry {failedTracks.length} Failed
                    </button>
                  )}
                </div>
              )}
              {processingStatus === 'cancelled' && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <Ban className="w-4 h-4" />
                  <span className="text-sm">Processing cancelled by user.</span>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-dark-surface px-6 py-4 flex justify-end gap-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brand-text-tertiary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
          {activeFile && !uploading && !success && uploadPhase !== 'cards' && (
            <button
              onClick={() => {
                handleNextBatch();
              }}
              disabled={validating || hasPendingScans}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : hasPendingScans ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Next
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
