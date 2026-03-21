import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderTree, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Tag,
  Edit3,
  CheckCircle,
  Archive,
  Music,
  Loader
} from 'lucide-react';

export default function ScanPreviewModal({ 
  isOpen, 
  onClose, 
  scanResult, 
  file,
  onConfirm,
  isProcessing 
}) {
  const [expandedDatePacks, setExpandedDatePacks] = useState(new Set());
  const [collectionName, setCollectionName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  useEffect(() => {
    if (scanResult?.suggestedCollectionName) {
      setCollectionName(scanResult.suggestedCollectionName);
    }
    // Auto-expand first date pack
    if (scanResult?.datePacks?.length > 0) {
      setExpandedDatePacks(new Set([scanResult.datePacks[0].name]));
    }
  }, [scanResult]);

  const toggleDatePack = (name) => {
    const newExpanded = new Set(expandedDatePacks);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedDatePacks(newExpanded);
  };

  const handleConfirm = () => {
    onConfirm({
      ...scanResult,
      collectionName,
      platform: 'PlayList Pro',
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      uploadDate: new Date().toISOString()
    });
  };

  if (!isOpen || !scanResult) return null;

  const totalAlbums = scanResult.datePacks?.reduce((sum, dp) => sum + (dp.albums?.length || 0), 0) || 0;
  const totalTracks = scanResult.totalTracks || 0;
  const fileSizeMB = (file?.size / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-elevated rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10 flex flex-col">
        {/* Header */}
        <div className="bg-dark-surface px-6 py-4 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-accent/20 p-2 rounded-lg">
              <FolderTree className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Review Upload Structure</h2>
              <p className="text-sm text-brand-text-tertiary">
                {scanResult.totalDatePacks} Date Packs • {totalAlbums} Albums • {totalTracks} Tracks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-brand-text-tertiary hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Info Card */}
          <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className="bg-accent/20 p-3 rounded-lg">
                <Archive className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{file?.name}</h3>
                  <span className="text-xs text-brand-text-tertiary bg-white/5 px-2 py-0.5 rounded">
                    {fileSizeMB} MB
                  </span>
                </div>
                <p className="text-sm text-brand-text-tertiary">
                  Platform: <span className="text-accent font-medium">PlayList Pro</span>
                </p>
              </div>
            </div>
          </div>

          {/* Editable Collection Name */}
          <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-white">Collection Name</span>
              <span className="text-xs text-brand-text-tertiary">(Editable)</span>
            </div>
            
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  className="flex-1 bg-dark-bg border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
                  autoFocus
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                />
              ) : (
                <div className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-white">
                  {collectionName}
                </div>
              )}
              <button
                onClick={() => setIsEditingName(!isEditingName)}
                className="px-3 py-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                {isEditingName ? 'Done' : 'Edit'}
              </button>
            </div>
            
            {scanResult.motherFolderName && (
              <p className="text-xs text-brand-text-tertiary mt-2">
                Extracted from folder: <span className="text-white/60">{scanResult.motherFolderName}</span>
              </p>
            )}
          </div>

          {/* Detected Genres */}
          {scanResult.detectedGenres?.length > 0 && (
            <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-white">Detected Genres</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {scanResult.detectedGenres.map((genre, idx) => (
                  <span 
                    key={idx}
                    className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Dates */}
          {(scanResult.extractedDate || scanResult.datePacks?.some(dp => dp.name.match(/\d{2}[-/]\d{2}[-/]\d{2,4}/))) && (
            <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-white">Extracted Dates</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {scanResult.extractedDate && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                    From folder: {new Date(scanResult.extractedDate).toLocaleDateString()}
                  </span>
                )}
                {scanResult.datePacks?.map((dp, idx) => {
                  const dateMatch = dp.name.match(/(\d{2})[-/](\d{2})[-/](\d{2,4})/);
                  if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
                    return (
                      <span 
                        key={idx}
                        className="text-xs bg-white/10 text-brand-text-secondary px-3 py-1 rounded-full"
                      >
                        {dp.name}: {new Date(fullYear, parseInt(month) - 1, parseInt(day)).toLocaleDateString()}
                      </span>
                    );
                  }
                  return null;
                }).filter(Boolean)}
              </div>
            </div>
          )}

          {/* Date Packs Structure */}
          <div className="bg-dark-surface border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-white">Date Pack Structure</span>
              </div>
              <button
                onClick={() => setShowAllAlbums(!showAllAlbums)}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                {showAllAlbums ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            <div className="space-y-3">
              {scanResult.datePacks?.map((dp, dpIdx) => (
                <div 
                  key={dp.name}
                  className="bg-dark-bg rounded-lg border border-white/5 overflow-hidden"
                >
                  {/* Date Pack Header */}
                  <button
                    onClick={() => toggleDatePack(dp.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    {expandedDatePacks.has(dp.name) || showAllAlbums ? (
                      <ChevronDown className="w-4 h-4 text-brand-text-tertiary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-brand-text-tertiary" />
                    )}
                    <div className="bg-blue-500/20 p-1.5 rounded">
                      <FolderTree className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-white font-medium">{dp.name}</span>
                    </div>
                    <span className="text-xs text-brand-text-tertiary bg-white/5 px-2 py-1 rounded">
                      {dp.albums?.length || 0} albums
                    </span>
                  </button>

                  {/* Albums List */}
                  {(expandedDatePacks.has(dp.name) || showAllAlbums) && dp.albums && (
                    <div className="border-t border-white/5">
                      {dp.albums.map((album, albumIdx) => (
                        <div 
                          key={album.name}
                          className="flex items-center gap-3 px-4 py-2 pl-12 hover:bg-white/5 transition-colors"
                        >
                          <div className="bg-purple-500/20 p-1 rounded">
                            <Music className="w-3 h-3 text-purple-400" />
                          </div>
                          <span className="text-sm text-brand-text-secondary flex-1">{album.name}</span>
                          <span className="text-xs text-brand-text-tertiary">
                            {album.trackCount} tracks
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-dark-surface px-6 py-4 flex justify-between items-center border-t border-white/10">
          <div className="text-sm text-brand-text-tertiary">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Creating cards...
              </span>
            ) : (
              <span>
                Ready to create <strong className="text-white">{scanResult.totalDatePacks}</strong> date packs
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-brand-text-tertiary hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Create Cards
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
