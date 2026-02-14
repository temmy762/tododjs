import { Music } from 'lucide-react';

// Generate a consistent gradient based on the track title/artist
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const gradients = [
  'from-violet-600 via-purple-500 to-fuchsia-500',
  'from-blue-600 via-cyan-500 to-teal-400',
  'from-rose-600 via-pink-500 to-orange-400',
  'from-emerald-600 via-green-500 to-lime-400',
  'from-amber-600 via-orange-500 to-red-400',
  'from-indigo-600 via-blue-500 to-sky-400',
  'from-fuchsia-600 via-pink-500 to-rose-400',
  'from-teal-600 via-cyan-500 to-blue-400',
  'from-orange-600 via-amber-500 to-yellow-400',
  'from-sky-600 via-indigo-500 to-purple-400',
];

export default function GenericCoverArt({ title = '', artist = '', className = '', size = 'md' }) {
  const seed = hashString(`${title}${artist}`);
  const gradient = gradients[seed % gradients.length];
  const rotation = (seed % 360);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-48 h-48',
    full: 'w-full h-full',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    full: 'w-10 h-10',
  };

  const initial = (title || artist || 'M').charAt(0).toUpperCase();

  return (
    <div className={`${sizeClasses[size] || sizeClasses.md} ${className} relative overflow-hidden rounded-lg`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `conic-gradient(from ${rotation}deg, transparent 0%, rgba(255,255,255,0.1) 25%, transparent 50%, rgba(255,255,255,0.05) 75%, transparent 100%)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Music className={`${iconSizes[size] || iconSizes.md} text-white/40 mb-0.5`} />
        <span className="text-white/50 text-[8px] font-bold tracking-wider uppercase truncate max-w-[80%] px-1">
          {initial}
        </span>
      </div>
    </div>
  );
}
