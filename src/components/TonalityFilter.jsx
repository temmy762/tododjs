export default function TonalityFilter({ activeTonality, onTonalityChange }) {
  const tonalitiesA = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A'];
  const tonalitiesB = ['1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B'];

  const tonalityColorMap = {
    '1A': '#63E6E2',
    '2A': '#86F0B0',
    '3A': '#B7F36A',
    '4A': '#FFE066',
    '5A': '#FFB86B',
    '6A': '#FF8B7A',
    '7A': '#FF7CB7',
    '8A': '#E8A7FF',
    '9A': '#C9B6FF',
    '10A': '#A7C8FF',
    '11A': '#8EE1FF',
    '12A': '#6DF3D0',
    '1B': '#27D8D3',
    '2B': '#34D27A',
    '3B': '#8CD317',
    '4B': '#FFC107',
    '5B': '#FF9B4A',
    '6B': '#FF6B6B',
    '7B': '#FF4DA6',
    '8B': '#C86BFA',
    '9B': '#9B7CFF',
    '10B': '#6B8CFF',
    '11B': '#4DD8FF',
    '12B': '#13D6B2',
  };

  const handleTonalityClick = (tonality) => {
    onTonalityChange(activeTonality === tonality ? 'all' : tonality);
  };

  return (
    <div className="px-4 md:px-10 pt-2 pb-2 animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '200ms' }}>
      <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 p-4 sm:p-5">
        <div className="text-sm font-semibold text-white/80 mb-3">Elige la tonalidad:</div>

        <div className="overflow-x-auto scrollbar-hidden">
          <div className="flex gap-2 min-w-max">
            {[...tonalitiesA, ...tonalitiesB].map((tonality) => {
              const isActive = activeTonality === tonality;
              return (
                <button
                  key={tonality}
                  type="button"
                  onClick={() => handleTonalityClick(tonality)}
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-xs font-extrabold text-black border transition-all duration-150 flex-shrink-0 ${
                    isActive
                      ? 'border-white/80 ring-2 ring-white/60 scale-[1.02]'
                      : 'border-black/10 hover:brightness-105 hover:scale-[1.02]'
                  }`}
                  style={{ backgroundColor: tonalityColorMap[tonality] }}
                >
                  {tonality}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
