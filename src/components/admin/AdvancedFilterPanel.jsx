import { useState, useEffect } from 'react';
import { X, Sliders, Loader } from 'lucide-react';
import API_URL from '../../config/api';

export default function AdvancedFilterPanel({ 
  isOpen, 
  onClose, 
  onApply,
  collectionId,
  datePackId,
  albumId 
}) {
  const [filters, setFilters] = useState({
    genre: '',
    tonalityKey: '',
    camelot: '',
    bpmMin: '',
    bpmMax: '',
    pool: ''
  });
  
  const [filterOptions, setFilterOptions] = useState({
    genres: [],
    tonalityKeys: [],
    camelotKeys: [],
    pools: [],
    bpmRange: { min: 80, max: 180 }
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen, collectionId, datePackId, albumId]);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (collectionId) params.append('collectionId', collectionId);
      if (datePackId) params.append('datePackId', datePackId);
      if (albumId) params.append('albumId', albumId);

      const response = await fetch(`${API_URL}/search/filters?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setFilterOptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      genre: '',
      tonalityKey: '',
      camelot: '',
      bpmMin: '',
      bpmMax: '',
      pool: ''
    });
  };

  const handleApply = () => {
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value) acc[key] = value;
      return acc;
    }, {});
    
    onApply?.(activeFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-dark-surface/95 backdrop-blur-xl border-l border-white/10 shadow-2xl shadow-black/40 animate-in slide-in-from-right duration-300 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-xl border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white">Advanced Filters</h2>
            </div>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-150 text-white"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-sm text-brand-text-tertiary">Filter tracks by genre, tonality, and BPM</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Genre Filter */}
            <div>
              <label className="block text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">
                Genre
              </label>
              <select
                value={filters.genre}
                onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Genres</option>
                {filterOptions.genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {/* Tonality Key Filter */}
            <div>
              <label className="block text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">
                Musical Key
              </label>
              <select
                value={filters.tonalityKey}
                onChange={(e) => setFilters({ ...filters, tonalityKey: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Keys</option>
                {filterOptions.tonalityKeys.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            {/* Camelot Filter */}
            <div>
              <label className="block text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">
                Camelot Notation
              </label>
              <select
                value={filters.camelot}
                onChange={(e) => setFilters({ ...filters, camelot: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Camelot Keys</option>
                {filterOptions.camelotKeys.map(camelot => (
                  <option key={camelot} value={camelot}>{camelot}</option>
                ))}
              </select>
            </div>

            {/* BPM Range */}
            <div>
              <label className="block text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">
                BPM Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-text-tertiary mb-2">Min</label>
                  <input
                    type="number"
                    value={filters.bpmMin}
                    onChange={(e) => setFilters({ ...filters, bpmMin: e.target.value })}
                    placeholder={filterOptions.bpmRange.min}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-text-tertiary mb-2">Max</label>
                  <input
                    type="number"
                    value={filters.bpmMax}
                    onChange={(e) => setFilters({ ...filters, bpmMax: e.target.value })}
                    placeholder={filterOptions.bpmRange.max}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Pool Filter */}
            {filterOptions.pools.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">
                  Pool
                </label>
                <select
                  value={filters.pool}
                  onChange={(e) => setFilters({ ...filters, pool: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">All Pools</option>
                  {filterOptions.pools.map(pool => (
                    <option key={pool} value={pool}>{pool}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="sticky bottom-0 bg-dark-surface/95 backdrop-blur-xl border-t border-white/10 p-6">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all duration-150"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-accent/30"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
