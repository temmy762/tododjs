import { X, Plus, Image as ImageIcon, Lock } from 'lucide-react';
import { useState } from 'react';

export default function PlaylistModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    onCreate?.({ name, description, isPrivate });
    setName('');
    setDescription('');
    setIsPrivate(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Plus className="w-7 h-7 text-accent" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Create Playlist
            </h2>
            <p className="text-sm text-brand-text-tertiary">
              Organize your favorite tracks
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-text-tertiary mb-2 uppercase tracking-wider">
                Playlist Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                required
                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-text-tertiary mb-2 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-brand-text-tertiary outline-none focus:border-accent/50 focus:bg-white/10 transition-all duration-150 resize-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:text-accent transition-colors duration-150">
                    <Lock className="w-4 h-4" strokeWidth={2} />
                    Make Private
                  </div>
                  <p className="text-xs text-brand-text-tertiary mt-0.5">
                    Only you can see and edit this playlist
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40"
              >
                Create Playlist
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
