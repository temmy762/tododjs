import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import SearchOverlay from './components/SearchOverlay';
import AuthModal from './components/auth/AuthModal';
import { authService } from './services/authService';
import ErrorBoundary from './components/ErrorBoundary';
import { useUpload } from './context/UploadContext';
import BulkUploadModal from './components/admin/BulkUploadModal';
import { AlbumUploadModal } from './components/admin/AdminRecordPool';
import { startTokenRefreshScheduler, stopTokenRefreshScheduler, apiFetch, getDeviceId } from './services/apiFetch';
import ArtistAlbumView from './components/ArtistAlbumView';
import TonalityFilter from './components/TonalityFilter';
import GenreFilterHorizontal from './components/GenreFilterHorizontal';
import AlbumsSection from './components/AlbumsSection';
import PlaylistsSection from './components/PlaylistsSection';
import TrackListView from './components/TrackListView';
import AlbumDetailView from './components/AlbumDetailView';

// Lazy-loaded pages for code splitting
const LibraryPage = lazy(() => import('./components/LibraryPage'));
const AlbumPage = lazy(() => import('./components/AlbumPage'));
const RecordPoolPage = lazy(() => import('./components/RecordPoolPage'));
const LiveMashUpPage = lazy(() => import('./components/LiveMashUpPage'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
import BackgroundGradients from './components/BackgroundGradients';
import { PlayerContext } from './context/PlayerContext';
import MusicControlPanel from './components/MusicControlPanel';
import TrendingSection from './components/TrendingSection';
import CheckoutModal from './components/CheckoutModal';
const PricingPage = lazy(() => import('./components/PricingPage'));
const SubscriptionDashboard = lazy(() => import('./components/SubscriptionDashboard'));
const CategoryTrackSection = lazy(() => import('./components/CategoryTrackSection'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
import API_URL from './config/api';

const API = API_URL;

// Map URL paths to internal page IDs
const PATH_TO_PAGE = {
  '/': 'library',
  '/home': 'home',
  '/library': 'library',
  '/biblioteca': 'library',
  '/record-pool': 'album',
  '/mashup': 'mashup',
  '/profile': 'profile',
  '/pricing': 'pricing',
  '/subscription': 'subscription',
  '/settings': 'settings',
};
// Prefer the first path registered for each page (so "library" → "/library", not "/biblioteca")
const PAGE_TO_PATH = Object.entries(PATH_TO_PAGE).reduce((acc, [path, page]) => {
  if (!acc[page]) acc[page] = path;
  return acc;
}, {});

function ResumedUploadItem({ r, dismissResumed }) {
  useEffect(() => {
    if (r.status === 'completed' || r.status === 'failed') {
      const timer = setTimeout(() => dismissResumed(r.id), 5000);
      return () => clearTimeout(timer);
    }
  }, [r.status, r.id, dismissResumed]);

  return (
    <div className="fixed bottom-4 left-4 z-50 w-72 bg-dark-elevated border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-white truncate flex-1 min-w-0">{r.name || 'Upload'}</span>
        <button
          onClick={() => dismissResumed(r.id)}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-brand-text-tertiary hover:text-white hover:bg-white/10 transition-colors"
        >✕</button>
      </div>
      {r.status === 'processing' && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-brand-text-tertiary">
            <span>Processing…</span><span>{r.progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${r.progress}%` }} />
          </div>
        </div>
      )}
      {r.status === 'completed' && <p className="text-[10px] text-green-400">✓ Upload completed! Closing in 5s…</p>}
      {r.status === 'failed' && <p className="text-[10px] text-red-400">✗ Processing failed. Closing in 5s…</p>}
    </div>
  );
}

function ResumedUploadWidget({ upload }) {
  const { resumed, dismissResumed } = upload;
  if (!resumed.length) return null;
  return (
    <>
      {resumed.map(r => (
        <ResumedUploadItem key={r.id} r={r} dismissResumed={dismissResumed} />
      ))}
    </>
  );
}

function App() {
  const upload = useUpload();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activePage from the current URL
  const activePage = useMemo(() => {
    return PATH_TO_PAGE[location.pathname] || 'home';
  }, [location.pathname]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [panelTrack, setPanelTrack] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelHidden, setPanelHidden] = useState(false);
  const [panelIsPlaying, setPanelIsPlaying] = useState(false);
  const [panelProgress, setPanelProgress] = useState(0);
  const [panelQueue, setPanelQueue] = useState([]);
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeCategory, setActiveCategory] = useState(null); // category NAME, e.g. "Latin Box"
  const [activeTonality, setActiveTonality] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState(null);
  const [albumDetailTracks, setAlbumDetailTracks] = useState([]);
  const [albumDetailLoading, setAlbumDetailLoading] = useState(false);
  const [albumAutoPlay, setAlbumAutoPlay] = useState(false);

  // Clear album detail when navigating away from the record-pool page
  useEffect(() => {
    if (activePage !== 'album') {
      setSelectedAlbumDetail(null);
      setAlbumDetailTracks([]);
      setAlbumAutoPlay(false);
    }
  }, [activePage]);

  const [showTonalityButton, setShowTonalityButton] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [showPricing, setShowPricing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showSubscriptionDashboard, setShowSubscriptionDashboard] = useState(false);
  const tonalityRef = useRef(null);
  const [liveTracks, setLiveTracks] = useState([]);
  const [liveAlbums, setLiveAlbums] = useState([]);
  const [userFavorites, setUserFavorites] = useState(new Set());

  // Fetch live tracks from API
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch(`${API}/tracks/browse?limit=100`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const mapped = data.data.map((t, i) => ({
            id: t._id || i,
            title: t.title,
            artist: t.artist,
            bpm: t.bpm || 0,
            genre: t.genre || '',
            tonality: t.tonality?.camelot || '',
            collection: t.collection || t.genre || 'New Releases',
            coverArt: t.coverArt || t.albumId?.coverArt || '',
            dateAdded: t.dateAdded || t.createdAt,
            pool: t.pool || '',
            locked: t.isLocked || false,
            requiredPlan: t.requiredPlan || 'free',
            audioFile: t.audioFile,
          }));
          setLiveTracks(mapped);
        }
      } catch (err) {
        console.error('Error fetching live tracks:', err);
      }
    };
    fetchTracks();
  }, []);

  // Fetch live albums from API
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await fetch(`${API}/albums`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const mapped = data.data.map(a => ({
            _id: a._id,
            id: a._id,
            title: a.name || a.title,
            artist: a.artist || 'Various Artists',
            coverArt: a.coverArt || '',
            trackCount: a.trackCount || 0,
            year: a.year || new Date(a.createdAt).getFullYear(),
            releaseDate: a.releaseDate || a.createdAt,
            isNew: a.isNew || false,
          }));
          setLiveAlbums(mapped);
        }
      } catch (err) {
        console.error('Error fetching live albums:', err);
      }
    };
    fetchAlbums();
  }, []);

  // Live data from API (no mock fallback)
  const tracks = liveTracks;
  const albums = liveAlbums;

  // Check for authenticated user on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Start/stop token refresh scheduler based on auth state
  useEffect(() => {
    if (user) {
      startTokenRefreshScheduler();
      // Force Spanish for admin users if no explicit language choice was made
      if (user.role === 'admin' && !localStorage.getItem('i18nextLng')) {
        i18n.changeLanguage('es');
      }
    } else {
      stopTokenRefreshScheduler();
    }
    return () => stopTokenRefreshScheduler();
  }, [user, i18n]);

  // Sync user data from server and apply if anything changed
  const syncUserFromServer = useCallback(async () => {
    try {
      const fresh = await authService.getCurrentUser();
      console.debug('[sync] fresh:', fresh?.role, fresh?.subscription?.status, fresh?.subscription?.planId);
      if (fresh) {
        setUser(prev => {
          const roleChanged = prev?.role !== fresh.role;
          const planIdChanged = prev?.subscription?.planId !== fresh.subscription?.planId;
          const planChanged = prev?.subscription?.plan !== fresh.subscription?.plan;
          const statusChanged = prev?.subscription?.status !== fresh.subscription?.status;
          const activeChanged = prev?.isActive !== fresh.isActive;
          console.debug('[sync] prev role:', prev?.role, '| changed:', { roleChanged, planIdChanged, planChanged, statusChanged, activeChanged });
          if (roleChanged || planIdChanged || planChanged || statusChanged || activeChanged) {
            return fresh;
          }
          return prev;
        });
      } else {
        console.debug('[sync] getCurrentUser returned null');
      }
    } catch (err) {
      console.debug('[sync] error:', err.message);
    }
  }, []);

  // Re-fetch user data every 10 s and immediately on page focus/tab-switch
  // so admin-applied role/plan changes take effect without re-login.
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(syncUserFromServer, 10 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncUserFromServer();
    };
    const handleFocus = () => syncUserFromServer();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, syncUserFromServer]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${API}/search/global?query=${encodeURIComponent(searchQuery.trim())}&limit=50&page=1`, {
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          if (data?.success) {
            setSearchResults(data.data || []);
          } else {
            setSearchResults([]);
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setSearchResults([]);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchOpen(true);
    }
  };

  const handleSearchFocus = (isFocused) => {
    if (isFocused) {
      setSearchOpen(true);
    }
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Fetch all user favorites when user logs in
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      fetch(`${API}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserFavorites(new Set(data.data.map(t => t._id || t)));
          }
        })
        .catch(() => {});
    } else {
      setUserFavorites(new Set());
    }
  }, [user]);

  const handleTrackInteraction = (action, track) => {
    if (action === 'play') {
      // Capture queue from current page context for next/prev navigation
      const contextQueue = (selectedAlbumDetail && !albumDetailLoading && albumDetailTracks.length)
        ? albumDetailTracks
        : liveTracks.length ? liveTracks : [track];
      setPanelQueue(contextQueue);
      setPanelOpen(true);
      setPanelHidden(false);
      setPanelTrack((prev) => {
        const prevId = prev?.id || prev?._id;
        const nextId = track?.id || track?._id;
        const isSame = prevId && nextId && prevId === nextId;
        if (!isSame) {
          setPanelProgress(0);
          setPanelIsPlaying(true);
        } else {
          setPanelIsPlaying((p) => !p);
        }
        return track;
      });
      return;
    }

    if (action === 'favorite') {
      if (!user) {
        setAuthModalOpen(true);
        return;
      }
      const trackId = track.id || track._id;
      const token = localStorage.getItem('token');
      // Optimistic update
      setUserFavorites(prev => {
        const next = new Set(prev);
        if (next.has(trackId)) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
      fetch(`${API}/favorites/toggle/${trackId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            // Revert on failure
            setUserFavorites(prev => {
              const next = new Set(prev);
              if (next.has(trackId)) next.delete(trackId);
              else next.add(trackId);
              return next;
            });
          }
        })
        .catch(() => {
          setUserFavorites(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) next.delete(trackId);
            else next.add(trackId);
            return next;
          });
        });
      return;
    }

    if (action === 'download') {
      if (!user) {
        setAuthModalOpen(true);
        return;
      }
      // Admin bypasses all subscription restrictions
      if (user.role !== 'admin') {
        const sub = user.subscription;
        const isPaid = sub && sub.plan && sub.plan !== 'free';
        const isActive = sub && sub.status === 'active';
        const notExpired = !sub?.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();

        if (!isPaid || !isActive || !notExpired) {
          navigate('/pricing');
          return;
        }
      }

      const trackId = track.id || track._id;
      apiFetch(`${API}/downloads/track/${trackId}/file`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.message || 'Download failed. Please try again.');
          }
          if (data?.downloadUrl) {
            const a = document.createElement('a');
            a.href = data.downloadUrl;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        })
        .catch(err => alert(err.message || 'Download failed. Please try again.'));
      return;
    }
  };

  const handleNextTrack = useCallback((shuffle) => {
    setPanelQueue(q => {
      if (!q.length) return q;
      setPanelTrack(cur => {
        const currentId = cur?.id || cur?._id;
        const idx = q.findIndex(t => (t.id || t._id) === currentId);
        let nextIdx;
        if (shuffle) {
          const pool = q.filter((_, i) => i !== idx);
          if (!pool.length) return cur;
          nextIdx = q.indexOf(pool[Math.floor(Math.random() * pool.length)]);
        } else {
          nextIdx = (idx + 1) % q.length;
        }
        setPanelProgress(0);
        setPanelIsPlaying(true);
        return q[nextIdx];
      });
      return q;
    });
  }, []);

  const handlePrevTrack = useCallback(() => {
    setPanelQueue(q => {
      if (!q.length) return q;
      setPanelTrack(cur => {
        const currentId = cur?.id || cur?._id;
        const idx = q.findIndex(t => (t.id || t._id) === currentId);
        const prevIdx = idx <= 0 ? q.length - 1 : idx - 1;
        setPanelProgress(0);
        setPanelIsPlaying(true);
        return q[prevIdx];
      });
      return q;
    });
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setAuthModalOpen(false);
    if (pendingPlan) {
      setSelectedSubscriptionPlan(pendingPlan);
      setShowCheckoutModal(true);
      setPendingPlan(null);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setShowAdminDashboard(false);
    navigate('/');
  };

  const handleOpenAuth = () => {
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  // Progress is now driven by the real <audio> element in MusicControlPanel
  // via the onProgressChange callback — no fake timer needed.

  useEffect(() => {
    if (activePage !== 'home') {
      setShowTonalityButton(false);
      return;
    }

    const handleScroll = () => {
      if (tonalityRef.current) {
        const rect = tonalityRef.current.getBoundingClientRect();
        setShowTonalityButton(rect.bottom < 64);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [activePage]);

  const handleGenreChange = (genreId) => {
    setActiveGenre(genreId);
  };

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
  };

  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };

  const handleNavigate = (pageId) => {
    const path = PAGE_TO_PATH[pageId] || '/';
    navigate(path);
    console.log('Navigate to:', pageId, '→', path);
  };

  const handleAlbumClick = (album) => {
    setSelectedAlbum(album);
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  const handleAlbumPageClick = async (album, { autoPlay = false } = {}) => {
    // If album has _id, fetch real data from API
    if (album._id) {
      console.log('🎵 Fetching album:', album._id);
      setAlbumDetailLoading(true);
      setAlbumAutoPlay(autoPlay);
      setSelectedAlbumDetail(album);
      try {
        const res = await fetch(`${API}/albums/${album._id}`);
        const data = await res.json();
        console.log('📦 API Response:', data);
        console.log('📊 Tracks received:', data.data?.tracks?.length || 0);
        if (data.success) {
          const fetchedAlbum = data.data.album;
          setSelectedAlbumDetail({
            ...fetchedAlbum,
            id: fetchedAlbum._id,
            title: fetchedAlbum.name,
            artist: fetchedAlbum.genre || 'Various Artists',
            trackCount: fetchedAlbum.trackCount,
            year: fetchedAlbum.year,
            coverArt: fetchedAlbum.coverArt,
          });
          const mappedTracks = (data.data.tracks || []).map((t, i) => ({
            id: t._id,
            title: t.title,
            artist: t.artist,
            genre: t.genre,
            bpm: t.bpm,
            tonality: t.tonality?.camelot || t.tonality?.key || '',
            pool: t.pool || '',
            collection: t.collection || '',
            dateAdded: t.dateAdded || t.createdAt,
            coverArt: t.coverArt || fetchedAlbum.coverArt || '',
            duration: t.audioFile?.duration || 0,
          }));
          console.log('✅ Mapped tracks:', mappedTracks.length, mappedTracks);
          setAlbumDetailTracks(mappedTracks);
        }
      } catch (err) {
        console.error('❌ Error fetching album details:', err);
      } finally {
        setAlbumDetailLoading(false);
      }
    } else {
      // No API ID available — show album with no tracks
      setSelectedAlbumDetail(album);
      setAlbumDetailTracks([]);
      setAlbumDetailLoading(false);
    }
  };

  const handleAlbumDownload = (album) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (user.role !== 'admin') {
      const sub = user.subscription;
      const isPaid = sub && sub.plan && sub.plan !== 'free';
      const isActive = sub && sub.status === 'active';
      const notExpired = !sub?.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date();

      if (!isPaid || !isActive || !notExpired) {
        navigate('/pricing');
        return;
      }
    }

    const albumId = album?._id || album?.id;
    if (!albumId) {
      alert('Album id is missing');
      return;
    }

    const token = localStorage.getItem('token');
    const deviceId = getDeviceId();
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `${API}/downloads/album/${albumId}/file?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 120000);
  };

  const allTracks = useMemo(() => {
    let filtered = [...liveTracks];

    if (activeGenre !== 'all') {
      filtered = filtered.filter(track =>
        (track.collection || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (track.genre || '').toLowerCase().includes(activeGenre.toLowerCase()) ||
        (track.title || '').toLowerCase().includes(activeGenre.toLowerCase())
      );
    }

    if (activeTonality !== 'all') {
      filtered = filtered.filter(track => track.tonality === activeTonality);
    }

    return filtered;
  }, [activeGenre, activeTonality, liveTracks]);

  const playerContextValue = useMemo(() => ({
    currentTrackId: panelOpen ? (panelTrack?.id || panelTrack?._id) : null,
    isPanelPlaying: panelIsPlaying,
  }), [panelOpen, panelTrack?.id, panelTrack?._id, panelIsPlaying]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <PlayerContext.Provider value={playerContextValue}>
    <div className="min-h-screen bg-dark-bg relative overflow-x-hidden">
      <BackgroundGradients />
      
      <TopBar 
        onSearchFocus={handleSearchFocus}
        onSearchChange={handleSearchChange}
        searchQuery={searchQuery}
        showTonalityButton={showTonalityButton}
        activeTonality={activeTonality}
        onTonalityChange={setActiveTonality}
        user={user}
        onLoginClick={handleOpenAuth}
        onSubscribe={() => {
          if (user) {
            navigate('/pricing');
          } else {
            setAuthModalOpen(true);
          }
        }}
      />
      
      <Sidebar
        onAdminClick={() => {
          if (user && user.role === 'admin') {
            setShowAdminDashboard(true);
            setSearchOpen(false);
          } else if (!user) {
            setAuthModalOpen(true);
          }
        }}
        user={user}
        onLoginClick={handleOpenAuth}
        onLogout={handleLogout}
        onProfileClick={() => { setShowUserDashboard(true); setSearchOpen(false); }}
      />

      <div className="md:ml-20">
        <main className={`pt-16 md:pt-20 ${panelOpen && !panelHidden ? 'pb-36 md:pb-24' : 'pb-20 md:pb-10'} relative`}>
        <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
        {selectedAlbumDetail ? (
          <AlbumDetailView
            album={selectedAlbumDetail}
            tracks={albumDetailLoading ? [] : albumDetailTracks}
            isLoading={albumDetailLoading}
            autoPlay={albumAutoPlay}
            onClose={() => { setSelectedAlbumDetail(null); setAlbumDetailTracks([]); setAlbumAutoPlay(false); }}
            onTrackInteraction={handleTrackInteraction}
            userFavorites={userFavorites}
            user={user}
            onAuthRequired={handleOpenAuth}
            onSubscribe={() => {
              navigate('/pricing');
            }}
          />
        ) : activePage === 'library' ? (
          <LibraryPage
            onTrackInteraction={handleTrackInteraction}
            userFavorites={userFavorites}
          />
        ) : activePage === 'album' ? (
          <RecordPoolPage
            onAlbumClick={handleAlbumPageClick}
            onAlbumDownload={handleAlbumDownload}
            onTrackInteraction={handleTrackInteraction}
          />
        ) : activePage === 'mashup' ? (
          <LiveMashUpPage 
            onTrackInteraction={handleTrackInteraction}
            userFavorites={userFavorites}
          />
        ) : activePage === 'profile' ? (
          <ProfilePage 
            user={user}
            onLogout={handleLogout}
            onUserUpdate={setUser}
          />
        ) : activePage === 'pricing' ? (
          <PricingPage 
            onSelectPlan={(plan) => {
              if (!user) {
                setPendingPlan(plan);
                setAuthModalOpen(true);
              } else {
                setSelectedSubscriptionPlan(plan);
                setShowCheckoutModal(true);
              }
            }}
            user={user}
          />
        ) : activePage === 'subscription' ? (
          <SubscriptionDashboard 
            user={user}
            onUpdate={() => {
              // Refresh user data
              if (user) {
                authService.getCurrentUser().then(setUser);
              }
            }}
          />
        ) : activePage === 'settings' ? (
          <SettingsPage user={user} onUserUpdate={setUser} onLogout={handleLogout} />
        ) : activePage === 'home' ? (
          <>
            <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5">
              <GenreFilterHorizontal
                activeCategory={activeCategory}
                onCategoryChange={(name) => setActiveCategory(name || null)}
              />
            </div>

            {activeCategory ? (
              <CategoryTrackSection
                categoryName={activeCategory}
                onTrackInteraction={handleTrackInteraction}
                userFavorites={userFavorites}
              />
            ) : (
              <>
                <TrendingSection onTrackInteraction={handleTrackInteraction} activeGenre={activeGenre} />

                <div ref={tonalityRef}>
                  <TonalityFilter
                    activeTonality={activeTonality}
                    onTonalityChange={setActiveTonality}
                  />
                </div>

                <div className="mb-8">
                  <div className="px-4 md:px-10 mb-4">
                    <h2 className="text-lg md:text-xl font-bold text-white">{t('home.latestUploadsTitle')}</h2>
                  </div>
                  {allTracks.length > 0 ? (
                    <TrackListView
                      tracks={allTracks}
                      onTrackInteraction={handleTrackInteraction}
                      userFavorites={userFavorites}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-sm text-brand-text-tertiary font-medium">{t('home.noRecentUploads')}</p>
                      <p className="text-xs text-brand-text-tertiary/50 mt-1">{t('home.checkBackSoon')}</p>
                    </div>
                  )}
                </div>

                <AlbumsSection albums={albums} onAlbumClick={handleAlbumPageClick} activeGenre={activeGenre} />

                <PlaylistsSection onAlbumClick={handleAlbumPageClick} activeGenre={activeGenre} />
              </>
            )}
          </>
        ) : null}
        </Suspense>
        </ErrorBoundary>
        </main>
      </div>

      <SearchOverlay 
        isOpen={searchOpen} 
        onClose={handleCloseSearch}
        results={searchResults}
        onTrackInteraction={handleTrackInteraction}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <MusicControlPanel
        track={panelOpen ? panelTrack : null}
        isPlaying={panelIsPlaying}
        progress={panelProgress}
        onPlayPause={() => setPanelIsPlaying((p) => !p)}
        onProgressChange={(pct) => setPanelProgress(pct)}
        onClose={() => setPanelHidden(true)}
        hidden={panelHidden}
        user={user}
        onAuthRequired={handleOpenAuth}
        onSubscribe={() => {
          navigate('/pricing');
        }}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
      />

      {selectedProfile && (
        <ArtistAlbumView 
          profile={selectedProfile}
          onClose={handleCloseProfile}
        />
      )}

      {selectedAlbum && (
        <ArtistAlbumView 
          profile={{
            name: selectedAlbum.artist,
            type: 'album',
            avatar: selectedAlbum.coverArt,
            trackCount: selectedAlbum.trackCount
          }}
          onClose={() => setSelectedAlbum(null)}
        />
      )}

      {selectedPlaylist && (
        <ArtistAlbumView 
          profile={{
            name: selectedPlaylist.title,
            type: 'playlist',
            avatar: selectedPlaylist.coverArt,
            trackCount: selectedPlaylist.trackCount
          }}
          onClose={() => setSelectedPlaylist(null)}
        />
      )}

      {showAdminDashboard && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AdminDashboard 
              onClose={() => setShowAdminDashboard(false)} 
              user={user}
              onUserUpdate={setUser}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showUserDashboard && user && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <UserDashboard
              user={user}
              onClose={() => setShowUserDashboard(false)}
              onUserUpdate={setUser}
              onLogout={handleLogout}
              onTrackInteraction={handleTrackInteraction}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showCheckoutModal && selectedSubscriptionPlan && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => {
            setShowCheckoutModal(false);
            setSelectedSubscriptionPlan(null);
          }}
          plan={selectedSubscriptionPlan}
          user={user}
        />
      )}

      {showCheckout && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <CheckoutPage 
              selectedPlan={selectedPlan}
              onClose={() => setShowCheckout(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {authModalOpen && (
        <AuthModal 
          onClose={handleCloseAuth}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* ── Persistent upload modals — stay mounted across page navigation ── */}
      {upload?.bulkOpen && (
        <BulkUploadModal
          onClose={upload.closeBulkUpload}
          onSuccess={() => { upload.bulkSuccessRef.current?.(); }}
        />
      )}
      {upload?.albumMeta && (
        <AlbumUploadModal
          {...upload.albumMeta}
          onClose={upload.closeAlbumUpload}
          onSuccess={() => { upload.albumSuccessRef.current?.(); }}
        />
      )}
      {upload && <ResumedUploadWidget upload={upload} />}
    </div>
    </PlayerContext.Provider>
  );
}

export default App;
