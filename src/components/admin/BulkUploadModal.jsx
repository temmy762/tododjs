import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Upload, Archive, AlertCircle, CheckCircle, Loader, FolderTree, Music, ChevronDown, ChevronUp, ChevronRight, RotateCcw, Ban } from 'lucide-react';
import ScanPreviewModal from './ScanPreviewModal';

export default function BulkUploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [extractedStructure, setExtractedStructure] = useState(null);
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
  
  // New state for 3-phase workflow
  const [uploadPhase, setUploadPhase] = useState('upload'); // 'upload' | 'preview' | 'processing'

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
      const response = await fetch(`/api/collections/${collectionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
      const response = await fetch(`/api/collections/${collectionId}/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`/api/collections/${id}/status`);
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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const [validating, setValidating] = useState(false);

  const validateAndSetFile = async (selectedFile) => {
    console.log('Validating file:', selectedFile?.name, 'Type:', selectedFile?.type);
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setError(`Please upload a ZIP file (got: ${selectedFile.name})`);
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024 * 1024) {
      setError('File size exceeds 100GB limit');
      return;
    }
    setFile(selectedFile);
    setError('');
    setValidating(true);

    // Call preview endpoint
    const formData = new FormData();
    formData.append('zip', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collections/preview-zip', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setExtractedStructure(data.data);
      } else {
        setError(data.message || 'Failed to preview ZIP structure');
        setExtractedStructure(null);
      }
    } catch (err) {
      setError('Failed to analyze ZIP file: ' + err.message);
      setExtractedStructure(null);
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async (previewData) => {
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('zipFile', file);
    
    // Add metadata from preview/edit step
    formData.append('platform', 'PlayList Pro');
    formData.append('name', previewData?.collectionName || extractedStructure?.suggestedCollectionName || file.name.replace('.zip', ''));
    formData.append('year', new Date().getFullYear().toString());
    formData.append('month', (new Date().getMonth() + 1).toString().padStart(2, '0'));
    
    // Send scan result for card creation
    if (previewData || extractedStructure) {
      formData.append('scanResult', JSON.stringify(previewData || extractedStructure));
    }

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      console.log('Upload response status:', xhr.status);
      console.log('Upload response text:', xhr.responseText);
      if (xhr.status === 200 || xhr.status === 201) {
        const response = JSON.parse(xhr.responseText);
        const newCollectionId = response.data?.collection?._id;
        setCollectionId(newCollectionId);
        setSuccess('Upload complete! Processing in background...');
        setProcessingStatus('processing');
        setUploadPhase('processing');

        // Start polling for status
        if (newCollectionId) {
          startPolling(newCollectionId);
        }

        onSuccess?.(response.data);
      } else {
        let errorMsg = 'Upload failed. Please try again.';
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.message) errorMsg = resp.message;
        } catch (e) {}
        setError(errorMsg);
        setUploading(false);
      }
    });

    xhr.addEventListener('error', () => {
      setError('Network error. Please check your connection.');
      setUploading(false);
    });

    const token = localStorage.getItem('token');
    xhr.open('POST', '/api/collections', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  };

  const clearFile = () => {
    setFile(null);
    setExtractedStructure(null);
    setUploadProgress(0);
    setError('');
    setCollectionId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
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
          {!file ? (
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
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-brand-text-tertiary">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
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
          {file && !uploading && !success && (
            <button
              onClick={() => {
                if (extractedStructure) {
                  setUploadPhase('preview');
                } else {
                  handleUpload();
                }
              }}
              disabled={validating}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : extractedStructure ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Preview Structure
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Process
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {/* Scan Preview Modal */}
      <ScanPreviewModal
        isOpen={uploadPhase === 'preview'}
        onClose={() => setUploadPhase('upload')}
        scanResult={extractedStructure}
        file={file}
        onConfirm={(previewData) => handleUpload(previewData)}
        isProcessing={uploading}
      />
    </div>
  );
}
