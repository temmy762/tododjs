import { Music, Home, Zap, Mic, Music2, Cloud, Volume2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const genres = [
  { id: 'all', name: 'Todos', Icon: Music },
  { id: 'intensa-music', name: 'Intensa Music', Icon: Home },
  { id: 'latin-box', name: 'Latin Box', Icon: Zap },
  { id: 'dj-city', name: 'DJ City', Icon: Mic },
  { id: 'bpm-supreme', name: 'BPM Supreme', Icon: Music2 },
  { id: 'heavy-hits', name: 'Heavy Hits', Icon: Cloud },
  { id: 'club-killers', name: 'Club Killers', Icon: Volume2 },
  { id: 'franchise', name: 'Franchise', Icon: Sparkles },
];

export default function GenreFilterHorizontal({ activeGenre, onGenreChange }) {
  const { t } = useTranslation();
  
  return (
    <div className="relative px-4 md:px-10 pt-4 md:pt-5 pb-4 md:pb-5 bg-gradient-to-b from-dark-bg via-dark-bg/98 to-dark-bg/95">
      <div className="mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Explora por Record Pools</h2>
        <p className="text-[10px] md:text-xs text-brand-text-tertiary/80 mt-1">Accede a tus record pools y packs Premium favoritos</p>
      </div>
      
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hidden pb-3">
          <div className="flex gap-3 min-w-max pr-10">
            {genres.map((genre) => {
              const Icon = genre.Icon;
              return (
                <button
                  key={genre.id}
                  onClick={() => onGenreChange(genre.id)}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeGenre === genre.id
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-brand-text-secondary hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="whitespace-nowrap">{genre.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="absolute right-0 top-0 bottom-3 w-32 bg-gradient-to-l from-dark-bg via-dark-bg/80 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
