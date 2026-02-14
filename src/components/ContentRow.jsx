import TrackCard from './TrackCard';
import { useEffect, useRef, useState } from 'react';

export default function ContentRow({ title, tracks, isFirst = false, index = 0, onTrackInteraction }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
  };

  return (
    <div 
      className={`${isFirst ? 'mb-10' : 'mb-8'} transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <h2 className={`${isFirst ? 'text-xl' : 'text-lg'} font-bold text-white mb-3 px-10`}>
        {title}
      </h2>
      
      <div className="relative">
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-dark-bg via-dark-bg/80 to-transparent z-10 pointer-events-none" />
        )}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-dark-bg via-dark-bg/80 to-transparent z-10 pointer-events-none" />
        )}
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-x-auto overflow-y-hidden px-10 scroll-smooth scrollbar-hidden"
        >
          <div className="flex gap-3 pb-2">
            {tracks.map((track) => (
              <TrackCard 
                key={track.id} 
                track={track}
                onInteraction={onTrackInteraction}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
