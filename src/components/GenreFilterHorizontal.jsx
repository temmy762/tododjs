import { Music, Home, Zap, Mic, Music2, Cloud, Volume2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const genres = [
  { id: 'all', name: 'All Genres', Icon: Music },
  { id: 'house', name: 'House', Icon: Home },
  { id: 'techno', name: 'Techno', Icon: Zap },
  { id: 'hip-hop', name: 'Hip-Hop', Icon: Mic },
  { id: 'jazz', name: 'Jazz', Icon: Music2 },
  { id: 'ambient', name: 'Ambient', Icon: Cloud },
  { id: 'dubstep', name: 'Dubstep', Icon: Volume2 },
  { id: 'trance', name: 'Trance', Icon: Sparkles },
];

export default function GenreFilterHorizontal({ activeGenre, onGenreChange }) {
  const { t } = useTranslation();
  
  return (
    <div className="relative px-4 md:px-10 pt-4 md:pt-5 pb-4 md:pb-5 bg-gradient-to-b from-dark-bg via-dark-bg/98 to-dark-bg/95">
      <div className="mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{t('common.browse')} {t('common.by') || 'by'} {t('tracks.genre')}</h2>
        <p className="text-[10px] md:text-xs text-brand-text-tertiary/80 mt-1">{t('common.discover')} {t('common.your')} {t('common.perfect') || 'perfect'} {t('common.sound')}</p>
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
