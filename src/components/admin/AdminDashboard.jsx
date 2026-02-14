import { useState } from 'react';
import { 
  LayoutDashboard, 
  Music, 
  Disc, 
  ListMusic, 
  Users, 
  TrendingUp, 
  Database, 
  Palette, 
  Settings, 
  Shield,
  CreditCard,
  FolderOpen,
  Upload,
  X,
  Menu
} from 'lucide-react';
import AdminOverview from './AdminOverview';
import AdminTracks from './AdminTracks';
import AdminAlbums from './AdminAlbums';
import AdminPlaylists from './AdminPlaylists';
import AdminUsers from './AdminUsers';
import AdminAnalytics from './AdminAnalytics';
import AdminPools from './AdminPools';
import AdminGenres from './AdminGenres';
import AdminSubscriptions from './AdminSubscriptions';
import AdminSettings from './AdminSettings';
import AdminSecurity from './AdminSecurity';
import AdminRecordPool from './AdminRecordPool';
import AdminDownloadStats from './AdminDownloadStats';
import UploadProgressTracker from './UploadProgressTracker';
import AdminMashups from './AdminMashups';

export default function AdminDashboard({ onClose, user, onUserUpdate }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'recordpool', label: 'Record Pool', icon: FolderOpen },
    { id: 'mashups', label: 'Mashups', icon: ListMusic },
    { id: 'uploads', label: 'Upload Tracker', icon: Upload },
    { id: 'downloads', label: 'Downloads', icon: TrendingUp },
    { id: 'tracks', label: 'Tracks', icon: Music },
    { id: 'users', label: 'Members', icon: Users },
    { id: 'subscriptions', label: 'Memberships', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: Database },
    { id: 'genres', label: 'DJ Genres', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminOverview onNavigate={setActiveSection} />;
      case 'recordpool':
        return <AdminRecordPool />;
      case 'mashups':
        return <AdminMashups />;
      case 'uploads':
        return <UploadProgressTracker />;
      case 'downloads':
        return <AdminDownloadStats />;
      case 'tracks':
        return <AdminTracks />;
      case 'albums':
        return <AdminAlbums />;
      case 'playlists':
        return <AdminPlaylists />;
      case 'users':
        return <AdminUsers />;
      case 'subscriptions':
        return <AdminSubscriptions />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'pools':
        return <AdminPools />;
      case 'genres':
        return <AdminGenres />;
      case 'settings':
        return <AdminSettings user={user} onUserUpdate={onUserUpdate} />;
      case 'security':
        return <AdminSecurity />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg">
      {/* Top Bar */}
      <div className="h-14 md:h-16 bg-dark-elevated border-b border-white/10 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-9 h-9 rounded-lg bg-dark-surface flex items-center justify-center text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          <h1 className="text-base md:text-xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-dark-surface hover:bg-dark-elevated flex items-center justify-center transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:relative z-50 md:z-auto
          top-14 md:top-0 bottom-0 left-0
          w-64 bg-dark-elevated border-r border-white/10 overflow-y-auto
          transition-transform duration-300 md:transition-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent text-white shadow-lg shadow-accent/30'
                      : 'text-brand-text-secondary hover:bg-dark-surface hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-dark-bg">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
