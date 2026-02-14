import { User, Bell, Download, CreditCard, Shield, Volume2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage({ onBack }) {
  const [notifications, setNotifications] = useState({
    newReleases: true,
    downloads: true,
    playlists: false,
    marketing: false,
  });

  const [audioQuality, setAudioQuality] = useState('high');
  const [autoDownload, setAutoDownload] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-sm text-brand-text-tertiary">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Account</h2>
                  <p className="text-xs text-brand-text-tertiary">Manage your account information</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Email Address</div>
                  <div className="text-xs text-brand-text-tertiary">john@producer.com</div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-xs font-semibold transition-all duration-150">
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Password</div>
                  <div className="text-xs text-brand-text-tertiary">••••••••</div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-xs font-semibold transition-all duration-150">
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Delete Account</div>
                  <div className="text-xs text-brand-text-tertiary">Permanently delete your account and data</div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover border border-accent/50 hover:border-accent/60 text-white text-xs font-semibold transition-all duration-150">
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Subscription</h2>
                  <p className="text-xs text-brand-text-tertiary">Manage your subscription plan</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">Pro Plan</span>
                    <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-xs font-bold text-accent">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-brand-text-tertiary">$19/month • Renews on Feb 15, 2024</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">$19</div>
                  <div className="text-xs text-brand-text-tertiary">/month</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150">
                  Change Plan
                </button>
                <button className="flex-1 px-4 py-2 rounded-lg bg-white hover:bg-brand-text-secondary border border-brand-black/10 hover:border-brand-black/20 text-black text-sm font-semibold transition-all duration-150">
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Audio Preferences</h2>
                  <p className="text-xs text-brand-text-tertiary">Configure playback and download settings</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Streaming Quality</div>
                  <div className="text-xs text-brand-text-tertiary">Higher quality uses more data</div>
                </div>
                <select 
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold outline-none focus:border-accent/50 transition-all duration-150"
                >
                  <option value="low">Low (128 kbps)</option>
                  <option value="medium">Medium (192 kbps)</option>
                  <option value="high">High (320 kbps)</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Auto-Download Favorites</div>
                  <div className="text-xs text-brand-text-tertiary">Automatically download liked tracks</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoDownload}
                    onChange={(e) => setAutoDownload(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-white/10 shadow-lg shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Notifications</h2>
                  <p className="text-xs text-brand-text-tertiary">Choose what updates you receive</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-white capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={value}
                      onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
