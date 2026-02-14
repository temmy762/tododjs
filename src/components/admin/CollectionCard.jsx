import { FolderOpen, Calendar, Music, HardDrive, Download, Edit2, Trash2, Loader } from 'lucide-react';

export default function CollectionCard({ collection, onView, onEdit, onDelete }) {
  const formatSize = (bytes) => {
    if (!bytes) return '0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-brand-text-tertiary';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'processing') {
      return <Loader size={16} className="animate-spin" />;
    }
    return null;
  };

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:border-accent/50 transition-all group">
      <div 
        onClick={() => collection.status === 'completed' && onView(collection)}
        className={`relative aspect-video bg-gradient-to-br from-accent/20 to-purple-500/20 ${collection.status === 'completed' ? 'cursor-pointer' : ''}`}
      >
        {collection.thumbnail ? (
          <img
            src={collection.thumbnail}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen size={64} className="text-white/20" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {collection.status === 'completed' && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(collection);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors text-sm"
              >
                <FolderOpen size={16} />
                View Date Packs
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(collection);
                }}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(collection);
                }}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {collection.status === 'processing' && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center gap-2">
            <Loader size={14} className="animate-spin" />
            <span className="text-xs font-medium">{collection.processingProgress || 0}%</span>
          </div>
        )}

        {collection.status === 'failed' && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-500/20 border border-red-500">
            <span className="text-xs font-medium">Failed</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1 truncate">{collection.name}</h3>
            <div className="flex items-center gap-2 text-sm text-brand-text-tertiary">
              <Calendar size={14} />
              <span>{collection.month} {collection.year}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen size={14} className="text-accent" />
            <span className="font-semibold text-accent">{collection.totalDatePacks || 0}</span>
            <span className="text-brand-text-tertiary">packs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Music size={14} className="text-accent" />
            <span className="font-semibold text-accent">{collection.totalAlbums || 0}</span>
            <span className="text-brand-text-tertiary">albums</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Music size={14} className="text-accent" />
            <span className="font-semibold text-accent">{collection.totalTracks || 0}</span>
            <span className="text-brand-text-tertiary">tracks</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive size={14} className="text-brand-text-tertiary" />
            <span className="text-brand-text-tertiary">{formatSize(collection.totalSize)}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-brand-text-tertiary">
            <Download size={12} />
            <span>{collection.totalDownloads || 0} downloads</span>
          </div>
          <div className={`flex items-center gap-1 ${getStatusColor(collection.status)}`}>
            {getStatusIcon(collection.status)}
            <span className="capitalize">{collection.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
