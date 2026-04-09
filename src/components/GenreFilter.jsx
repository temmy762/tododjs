import { useTranslation } from 'react-i18next';

const genreList = [
  { id: 'all', icon: '🎵' },
  { id: 'house', name: 'House', icon: '🏠' },
  { id: 'techno', name: 'Techno', icon: '⚡' },
  { id: 'hip-hop', name: 'Hip-Hop', icon: '🎤' },
  { id: 'jazz', name: 'Jazz', icon: '🎷' },
  { id: 'ambient', name: 'Ambient', icon: '🌌' },
  { id: 'dubstep', name: 'Dubstep', icon: '🔊' },
  { id: 'trance', name: 'Trance', icon: '✨' },
];

export default function GenreFilter({ activeGenre, onGenreChange }) {
  const { t } = useTranslation();
  const genres = genreList.map(g => ({
    ...g,
    name: g.id === 'all' ? t('genreFilter.allGenres') : g.name,
  }));
  return (
    <div className="mb-10 px-10 animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-center gap-2.5 overflow-x-auto scrollbar-hidden pb-2">
        {genres.map((genre, index) => (
          <button
            key={genre.id}
            onClick={() => onGenreChange(genre.id)}
            className={`group/pill flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
              activeGenre === genre.id
                ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/30 scale-105 border border-accent/50'
                : 'bg-white backdrop-blur-sm text-black hover:bg-brand-text-secondary hover:border-brand-black/20 border border-brand-black/10 hover:scale-[1.02] shadow-sm shadow-black/10'
            }`}
            style={{ 
              animationDelay: `${300 + index * 50}ms`,
              animation: 'fadeIn 0.5s ease-out both'
            }}
          >
            <span className={`text-lg transition-transform duration-300 ${
              activeGenre === genre.id ? 'scale-110' : 'group-hover/pill:scale-110'
            }`}>
              {genre.icon}
            </span>
            <span className="tracking-wide">{genre.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
