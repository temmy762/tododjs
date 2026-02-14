import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function CollectionUploadModal({ sources, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    sourceId: '',
    name: '',
    year: new Date().getFullYear(),
    month: '',
    thumbnail: '',
    platform: ''
  });
  const [file, setFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailMode, setThumbnailMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Please select a ZIP file');
        return;
      }
      setFile(selectedFile);
      setError('');
      
      if (!formData.name) {
        const fileName = selectedFile.name.replace('.zip', '');
        setFormData(prev => ({ ...prev, name: fileName }));
      }
    }
  };

  const handleThumbnailFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid image file (JPG, PNG, or WebP)');
        return;
      }
      
      setThumbnailFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    if (!formData.platform) {
      setError('Please provide a platform name');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setProgress(0);
      setProcessingStatus('Uploading main ZIP file...');

      const uploadFormData = new FormData();
      uploadFormData.append('zipFile', file);
      uploadFormData.append('platform', formData.platform);
      uploadFormData.append('name', formData.name);
      uploadFormData.append('year', formData.year);
      uploadFormData.append('month', formData.month);
      
      if (thumbnailMode === 'upload' && thumbnailFile) {
        uploadFormData.append('thumbnailFile', thumbnailFile);
      } else if (thumbnailMode === 'url' && formData.thumbnail) {
        uploadFormData.append('thumbnail', formData.thumbnail);
      }

      const token = localStorage.getItem('token');
      
      console.log('Upload attempt:', {
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        fileSize: file.size,
        platform: formData.platform
      });

      // Use XMLHttpRequest for upload progress tracking (keeps connection alive for large files)
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/collections');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 0; // No timeout for large uploads

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 90);
            setProgress(pct);
            const loadedMB = (event.loaded / 1024 / 1024).toFixed(0);
            const totalMB = (event.total / 1024 / 1024).toFixed(0);
            setProcessingStatus(`Uploading to server: ${loadedMB} MB / ${totalMB} MB (${pct}%)`);
          }
        };

        xhr.onload = () => {
          console.log('XHR response status:', xhr.status);
          try {
            const responseData = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && responseData.success) {
              resolve(responseData);
            } else {
              reject(new Error(responseData.message || `Upload failed: ${xhr.status}`));
            }
          } catch (e) {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          console.error('XHR onerror fired:', {
            readyState: xhr.readyState,
            status: xhr.status,
            statusText: xhr.statusText,
            responseURL: xhr.responseURL
          });
          reject(new Error('Failed to fetch'));
        };

        xhr.onabort = () => {
          console.error('XHR onabort fired');
          reject(new Error('Upload was aborted'));
        };

        xhr.ontimeout = () => {
          console.error('XHR ontimeout fired');
          reject(new Error('Upload timed out'));
        };

        console.log('XHR sending FormData...');
        xhr.send(uploadFormData);
      });

      console.log('Response data:', data);
      setProgress(100);
      setSuccess('Collection upload started! Processing in background...');
      setProcessingStatus('Extracting date packs and albums. This may take several minutes.');
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Upload error caught:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error: error
      });
      
      let errorMessage = 'Upload failed. ';
      
      if (error.message === 'Failed to fetch') {
        errorMessage += 'Cannot connect to backend server. Please ensure:\n' +
                       '1. Backend is running on port 5000\n' +
                       '2. You are logged in\n' +
                       '3. Try accessing http://localhost:5173 directly instead of browser preview';
      } else {
        errorMessage += error.message || 'Please check your connection and try again.';
      }
      
      setError(errorMessage);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-bg border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Upload Collection</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-2 text-green-500">
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Platform *</label>
            <input
              type="text"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              disabled={uploading}
              placeholder="e.g., PlaylistPro, Beatport, Spotify"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Collection Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={uploading}
              placeholder="e.g., PLAYLISTPRO ENERO 2025"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                disabled={uploading}
                min="2000"
                max="2100"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <input
                type="text"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                disabled={uploading}
                placeholder="e.g., January"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Thumbnail (Optional)</label>
            
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setThumbnailMode('url')}
                disabled={uploading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  thumbnailMode === 'url'
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-brand-text-tertiary hover:bg-white/10'
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setThumbnailMode('upload')}
                disabled={uploading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  thumbnailMode === 'upload'
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-brand-text-tertiary hover:bg-white/10'
                }`}
              >
                Upload File
              </button>
            </div>

            {thumbnailMode === 'url' ? (
              <input
                type="url"
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                disabled={uploading}
                placeholder="https://example.com/thumbnail.jpg"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50"
              />
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:cursor-pointer"
                />
                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="mt-3 w-32 h-32 object-cover rounded-lg border border-white/10"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Collection ZIP File *</label>
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              disabled={uploading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:cursor-pointer"
            />
            {file && (
              <p className="mt-2 text-sm text-brand-text-tertiary">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-text-tertiary">{processingStatus}</span>
                <span className="text-accent font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-text-tertiary">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing... This may take several minutes for large collections.</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !formData.platform}
            className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload Collection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
