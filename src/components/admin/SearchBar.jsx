import { useState } from 'react';
import { Search, X, Filter, Loader } from 'lucide-react';

export default function SearchBar({ 
  placeholder = "Search...", 
  onSearch, 
  onFilterClick,
  showFilters = false,
  loading = false 
}) {
  const [query, setQuery] = useState('');

  const handleSearch = (value) => {
    setQuery(value);
    onSearch?.(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch?.('');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-tertiary" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-brand-text-tertiary focus:outline-none focus:border-accent transition-colors"
        />
        {loading && (
          <Loader className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-tertiary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      {showFilters && (
        <button
          onClick={onFilterClick}
          className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
        >
          <Filter size={18} />
          <span className="font-medium">Filters</span>
        </button>
      )}
    </div>
  );
}
