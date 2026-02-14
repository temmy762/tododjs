import { Calendar, Music, HardDrive, Download, Edit2, Trash2 } from 'lucide-react';

export default function DatePackCard({ datePack, onView, onEdit, onDelete }) {
  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-accent/50 transition-all group">
      <div 
        onClick={() => onView(datePack)}
        className="relative aspect-[16/9] bg-gradient-to-br from-purple-500/20 to-blue-500/20 cursor-pointer"
      >
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Calendar size={48} className="text-white/40 mb-2" />
          <p className="text-2xl font-bold">{formatDate(datePack.date)}</p>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(datePack);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors text-sm"
            >
              <Music size={16} />
              View Albums
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(datePack);
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(datePack);
              }}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-3 truncate">{datePack.name}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Music size={14} className="text-accent" />
            <span className="font-semibold text-accent">{datePack.totalAlbums || 0}</span>
            <span className="text-brand-text-tertiary">albums</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Music size={14} className="text-accent" />
            <span className="font-semibold text-accent">{datePack.totalTracks || 0}</span>
            <span className="text-brand-text-tertiary">tracks</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive size={14} className="text-brand-text-tertiary" />
            <span className="text-brand-text-tertiary">{formatSize(datePack.totalSize)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Download size={14} className="text-brand-text-tertiary" />
            <span className="text-brand-text-tertiary">{datePack.totalDownloads || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
