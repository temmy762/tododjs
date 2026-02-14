import { X, Sliders } from 'lucide-react';
import { useState } from 'react';

export default function FilterPanel({ isOpen, onClose, onApply }) {
  const [bpmRange, setBpmRange] = useState([80, 180]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const genres = ['House', 'Techno', 'Hip-Hop', 'Jazz', 'Ambient', 'Dubstep', 'Trance', 'Drum & Bass'];
  const moods = ['Energetic', 'Chill', 'Dark', 'Uplifting', 'Melancholic', 'Aggressive', 'Peaceful', 'Groovy'];
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleReset = () => {
    setBpmRange([80, 180]);
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedKeys([]);
  };

  const handleApply = () => {
    onApply?.({ bpmRange, genres: selectedGenres, moods: selectedMoods, keys: selectedKeys });
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
              <h2 className="text-xl font-bold text-white">Filters</h2>
            </div>
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 text-black"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-sm text-brand-text-tertiary">Refine your search results</p>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">BPM Range</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-text-tertiary">Min: <span className="text-white font-semibold">{bpmRange[0]}</span></span>
                <span className="text-brand-text-tertiary">Max: <span className="text-white font-semibold">{bpmRange[1]}</span></span>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full">
                <div 
                  className="absolute h-full bg-accent rounded-full"
                  style={{ 
                    left: `${((bpmRange[0] - 60) / 140) * 100}%`,
                    right: `${100 - ((bpmRange[1] - 60) / 140) * 100}%`
                  }}
                />
              </div>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={bpmRange[0]}
                  onChange={(e) => setBpmRange([Number(e.target.value), bpmRange[1]])}
                  min="60"
                  max="200"
                  className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-accent/50 transition-all duration-150"
                />
                <input
                  type="number"
                  value={bpmRange[1]}
                  onChange={(e) => setBpmRange([bpmRange[0], Number(e.target.value)])}
                  min="60"
                  max="200"
                  className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-accent/50 transition-all duration-150"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleSelection(genre, selectedGenres, setSelectedGenres)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    selectedGenres.includes(genre)
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-white text-black hover:bg-brand-text-secondary border border-brand-black/10'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Mood</h3>
            <div className="flex flex-wrap gap-2">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => toggleSelection(mood, selectedMoods, setSelectedMoods)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    selectedMoods.includes(mood)
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-white text-black hover:bg-brand-text-secondary border border-brand-black/10'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-brand-text-tertiary uppercase tracking-wider mb-4">Musical Key</h3>
            <div className="grid grid-cols-6 gap-2">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleSelection(key, selectedKeys, setSelectedKeys)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all duration-150 ${
                    selectedKeys.includes(key)
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-white text-black hover:bg-brand-text-secondary border border-brand-black/10'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-dark-surface/95 backdrop-blur-xl border-t border-white/10 p-6">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150"
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
