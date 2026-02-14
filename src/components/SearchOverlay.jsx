import { X, Search } from 'lucide-react';
import TrackListView from './TrackListView';

export default function SearchOverlay({ isOpen, onClose, results, onTrackInteraction, searchQuery, onSearchChange }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg animate-in fade-in duration-200">
      {/* Header with Search Bar */}
      <div className="sticky top-0 z-30 bg-dark-bg/95 backdrop-blur-md border-b border-white/5">
        <div className="px-4 md:px-10 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-2xl font-bold text-white">Search</h2>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-dark-elevated hover:bg-dark-elevated/80 hover:scale-110 flex items-center justify-center transition-all duration-200 text-white"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              placeholder="Search tracks, artists, labels..."
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
              className="w-full h-11 pl-11 pr-4 bg-dark-elevated border border-white/10 rounded-full text-sm text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-accent/60 focus:bg-dark-elevated/80 focus:shadow-lg focus:shadow-accent/20"
            />
          </div>
          
          <p className="text-xs text-brand-text-tertiary mt-3">
            {results.length} {results.length === 1 ? 'track' : 'tracks'} found
          </p>
        </div>
      </div>

      {/* Search Results */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        {results.length > 0 ? (
          <TrackListView 
            tracks={results}
            onTrackInteraction={onTrackInteraction}
          />
        ) : (
          <div className="text-center py-20 animate-in fade-in duration-500">
            <p className="text-brand-text-tertiary/70 text-lg">No results found</p>
            <p className="text-brand-text-tertiary/60 text-sm mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
