import GenericCoverArt from './GenericCoverArt';
import { useTranslation } from 'react-i18next';

export default function AlbumsSection({ albums, onAlbumClick, activeGenre = 'all' }) {
  const { t } = useTranslation();
  const filteredAlbums = activeGenre === 'all'
    ? albums
    : albums.filter(album =>
        (album.artist || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (album.title || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (album.genre || '').toLowerCase().includes(activeGenre.toLowerCase())
      );

  if (filteredAlbums.length === 0) return null;

  return (
    <div className="my-8 md:my-12 px-4 md:px-10">
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold text-white">{t('tracks.newReleases')} {t('nav.albums')}</h2>
        <p className="text-xs md:text-sm text-brand-text-tertiary mt-1">{t('common.fresh')} {t('common.releases')} {t('common.from')} {t('common.your')} {t('common.favorite')} {t('common.artists')}</p>
      </div>
      
      <div className="relative">
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
          {filteredAlbums.map((album) => (
            <div
              key={album.id}
              onClick={() => onAlbumClick(album)}
              className="flex-shrink-0 w-36 md:w-48 group cursor-pointer"
            >
              <div className="relative mb-3 overflow-hidden rounded-lg bg-dark-elevated shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-accent/20 group-hover:scale-105">
                <div className="aspect-square relative">
                  {album.coverArt ? (
                    <img
                      src={album.coverArt}
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
                    />
                  ) : null}
                  <div style={{ display: album.coverArt ? 'none' : 'block' }}>
                    <GenericCoverArt title={album.title} artist={album.artist} size="full" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {album.isNew && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wider">
                      {t('common.new') || 'New'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-1">
                <h3 className="font-semibold text-white text-sm truncate mb-1 group-hover:text-accent transition-colors duration-200">
                  {album.title}
                </h3>
                <p className="text-xs text-brand-text-tertiary truncate">
                  {album.artist}
                </p>
                <p className="text-[10px] text-brand-text-tertiary/60 mt-0.5">
                  {album.trackCount} tracks • {album.year}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
