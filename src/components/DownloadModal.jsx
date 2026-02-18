import { X, Download, FileAudio, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DownloadModal({ isOpen, onClose, track, onDownload }) {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState('mp3-320');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen || !track) return null;

  const formats = [
    { id: 'mp3-320', name: 'MP3', quality: '320 kbps', size: '8.2 MB', icon: '🎵' },
    { id: 'wav', name: 'WAV', quality: 'Lossless', size: '42.1 MB', icon: '🎼', premium: true },
    { id: 'flac', name: 'FLAC', quality: 'Lossless', size: '28.5 MB', icon: '💎', premium: true },
    { id: 'mp3-192', name: 'MP3', quality: '192 kbps', size: '5.1 MB', icon: '🎶' },
  ];

  const handleDownload = () => {
    if (!agreedToTerms) return;
    onDownload?.(selectedFormat, track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-4 bg-dark-surface/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/40 animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 flex items-center justify-center transition-all duration-150 hover:scale-110 text-black"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Download className="w-7 h-7 text-accent" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {t('actions.download')} {t('tracks.title')}
            </h2>
            <p className="text-sm text-brand-text-tertiary">
              {track.title} • {track.artist}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold text-brand-text-tertiary uppercase tracking-wider mb-3">{t('actions.selectFormat') || 'Select Format'}</h3>
            <div className="space-y-2">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  disabled={format.premium}
                  className={`w-full p-4 rounded-xl border transition-all duration-150 text-left ${
                    selectedFormat === format.id
                      ? 'bg-accent border-accent/50 shadow-lg shadow-accent/10 text-white'
                      : 'bg-white border-brand-black/10 hover:bg-white hover:border-brand-black/20 text-black'
                  } ${format.premium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{format.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{format.name}</span>
                          {format.premium && (
                            <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-xs font-bold text-accent">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-brand-text-tertiary mt-0.5">
                          <span>{format.quality}</span>
                          <span>•</span>
                          <span>{format.size}</span>
                        </div>
                      </div>
                    </div>
                    {selectedFormat === format.id && (
                      <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="text-xs text-brand-text-tertiary leading-relaxed group-hover:text-brand-text-secondary transition-colors duration-150">
                I agree to the <span className="text-accent font-semibold">license terms</span> and will use this track according to the permitted usage rights. This download is for personal/commercial use as per my subscription plan.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150"
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleDownload}
              disabled={!agreedToTerms}
              className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
                agreedToTerms
                  ? 'bg-accent hover:bg-accent-hover shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40'
                  : 'bg-white text-black cursor-not-allowed opacity-50'
              }`}
            >
              <Download className="w-4 h-4" strokeWidth={2} />
              {t('actions.download')}
            </button>
          </div>

          <p className="text-center text-xs text-brand-text-tertiary/70 mt-4">
            Downloads remaining this month: <span className="text-white font-semibold">47</span>
          </p>
        </div>
      </div>
    </div>
  );
}
