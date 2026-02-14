import { useState } from 'react';
import { Music, Building2 } from 'lucide-react';

export default function StoriesBar({ profiles, onProfileClick }) {
  const [imageLoadedStates, setImageLoadedStates] = useState({});

  const handleImageLoad = (id) => {
    setImageLoadedStates(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="mb-8 px-10 animate-in fade-in slide-in-from-bottom duration-700">
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth">
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onProfileClick?.(profile)}
              className="flex-shrink-0 snap-start group cursor-pointer"
            >
              <div className="flex flex-col items-center gap-2 w-24">
                <div className="relative">
                  <div className={`w-20 h-20 rounded-full p-[2.5px] transition-all duration-300 ${
                    profile.hasNewContent 
                      ? 'bg-gradient-to-tr from-accent via-purple-500 to-pink-500 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-accent/50' 
                      : 'bg-gradient-to-br from-dark-border to-dark-border/50 group-hover:scale-105'
                  }`}>
                    <div className="w-full h-full rounded-full bg-dark-bg p-[2px]">
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-dark-elevated">
                        {!imageLoadedStates[profile.id] && (
                          <div className="absolute inset-0 bg-gradient-to-br from-dark-elevated to-dark-surface animate-pulse" />
                        )}
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          onLoad={() => handleImageLoad(profile.id)}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            imageLoadedStates[profile.id] ? 'opacity-100' : 'opacity-0'
                          } group-hover:scale-110`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    profile.type === 'label' 
                      ? 'bg-accent group-hover:scale-110' 
                      : 'bg-purple-500 group-hover:scale-110'
                  } shadow-lg`}>
                    {profile.type === 'label' ? (
                      <Building2 className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    ) : (
                      <Music className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                
                <div className="text-center w-full">
                  <p className="text-xs text-brand-text-secondary font-medium truncate group-hover:text-white transition-colors duration-200">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-brand-text-tertiary/60 mt-0.5">
                    {profile.trackCount} tracks
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
