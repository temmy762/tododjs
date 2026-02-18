import { useState, useEffect, useMemo, useRef } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import SearchOverlay from './components/SearchOverlay';
import AuthModal from './components/auth/AuthModal';
import { authService } from './services/authService';
import ArtistAlbumView from './components/ArtistAlbumView';
import TonalityFilter from './components/TonalityFilter';
import GenreFilterHorizontal from './components/GenreFilterHorizontal';
import AlbumsSection from './components/AlbumsSection';
import PlaylistsSection from './components/PlaylistsSection';
import TrackListView from './components/TrackListView';
import LibraryPage from './components/LibraryPage';
import AlbumPage from './components/AlbumPage';
import RecordPoolPage from './components/RecordPoolPage';
import AlbumDetailView from './components/AlbumDetailView';
import LiveMashUpPage from './components/LiveMashUpPage';
import AdminDashboard from './components/admin/AdminDashboard';
import CheckoutPage from './components/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import UserDashboard from './components/UserDashboard';
import BackgroundGradients from './components/BackgroundGradients';
import MusicControlPanel from './components/MusicControlPanel';
import TrendingSection from './components/TrendingSection';
import PricingPage from './components/PricingPage';
import CheckoutModal from './components/CheckoutModal';
import SubscriptionDashboard from './components/SubscriptionDashboard';
import { contentRows, mockTracks, artistsAndLabels, albums as mockAlbums, playlists } from './data/mockData';
import API_URL from './config/api';

const API = API_URL;

function App() {
  console.log('App component rendering...');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [panelTrack, setPanelTrack] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelIsPlaying, setPanelIsPlaying] = useState(false);
  const [panelProgress, setPanelProgress] = useState(0);
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeTonality, setActiveTonality] = useState('all');
  const [activePage, setActivePage] = useState('library');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState(null);
  const [albumDetailTracks, setAlbumDetailTracks] = useState([]);
  const [albumDetailLoading, setAlbumDetailLoading] = useState(false);
  const [albumAutoPlay, setAlbumAutoPlay] = useState(false);
  const [showTonalityButton, setShowTonalityButton] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [showPricing, setShowPricing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState(null);
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
            isNew: a.isNew ?? true,
          }));
          setLiveAlbums(mapped);
        }
      } catch (err) {
        console.error('Error fetching live albums:', err);
      }
    };
    fetchAlbums();
  }, []);

  // Use live data if available, fall back to mock
  const tracks = liveTracks.length > 0 ? liveTracks : mockTracks;
  const albums = liveAlbums.length > 0 ? liveAlbums : mockAlbums;

  const filteredRows = useMemo(() => {
    if (activeGenre === 'all') return contentRows;
    
    return contentRows.map(row => ({
      ...row,
      tracks: row.tracks.filter(track => 
        track.collection.toLowerCase().includes(activeGenre.toLowerCase()) ||
        track.title.toLowerCase().includes(activeGenre.toLowerCase())
      )
    })).filter(row => row.tracks.length > 0);
  }, [activeGenre]);

  // Check for authenticated user on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        const currentUser = await authService.getCurrentUser();
        console.log('Current user:', currentUser);
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
        console.log('Auth loading complete');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        const filtered = tracks.filter(track => 
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (track.collection || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults(tracks);
    }
  }, [searchQuery, tracks]);

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
      setPanelOpen(true);
      setPanelTrack((prev) => {
        const isSame = prev?.id === track?.id;
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
          setSelectedPlan('premium');
          setShowCheckout(true);
          return;
        }
      }

      const trackId = track.id || track._id;
      const token = localStorage.getItem('token');
      fetch(`${API}/downloads/track/${trackId}/file`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.message || 'Download failed. Please try again.');
          }
          if (data?.downloadUrl) {
            window.location.href = data.downloadUrl;
          }
        })
        .catch(err => alert(err.message || 'Download failed. Please try again.'));
      return;
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setShowAdminDashboard(false);
    setActivePage('home');
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
    setActivePage(pageId);
    console.log('Navigate to:', pageId);
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
      // Fallback for mock albums
      setSelectedAlbumDetail(album);
      setAlbumDetailTracks(tracks.filter(t => t.artist === album.artist).slice(0, album.trackCount));
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
        setSelectedPlan('premium');
        setShowCheckout(true);
        return;
      }
    }

    const albumId = album?._id || album?.id;
    if (!albumId) {
      alert('Album id is missing');
      return;
    }

    const token = localStorage.getItem('token');
    fetch(`${API}/downloads/album/${albumId}/file`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || 'Download failed. Please try again.');
        }
        if (data?.downloadUrl) {
          window.location.href = data.downloadUrl;
        }
      })
      .catch(err => alert(err.message || 'Download failed. Please try again.'));
  };

  const allTracks = useMemo(() => {
    const mashupKeywords = ['mashup', 'remix', 'transition', 'edit', 'bootleg', 'blend', 'flip'];
    let filtered = liveTracks.filter(track => {
      const t = (track.title || '').toLowerCase();
      return mashupKeywords.some(kw => t.includes(kw));
    });
    
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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg relative">
      <BackgroundGradients />
      
      <TopBar 
        onSearchFocus={handleSearchFocus}
        onSearchChange={handleSearchChange}
        searchQuery={searchQuery}
        showTonalityButton={showTonalityButton}
        activeTonality={activeTonality}
        onTonalityChange={setActiveTonality}
        user={user}
        onNavigate={handleNavigate}
        onSubscribe={() => {
          if (user) {
            setSelectedPlan('premium');
            setShowCheckout(true);
          } else {
            setAuthModalOpen(true);
          }
        }}
      />
      
      <Sidebar 
        activePage={activePage}
        onNavigate={handleNavigate}
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
        <main className={`pt-16 md:pt-20 ${panelOpen ? 'pb-36 md:pb-24' : 'pb-20 md:pb-10'} relative`}>
        {activePage === 'library' ? (
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
              setSelectedSubscriptionPlan(plan);
              setShowCheckoutModal(true);
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
        ) : activePage === 'home' ? (
          <>
            <div className="sticky top-14 md:top-16 z-20 bg-dark-bg/95 backdrop-blur-md border-b border-white/5">
              <GenreFilterHorizontal 
                activeGenre={activeGenre}
                onGenreChange={setActiveGenre}
              />
            </div>

            <TrendingSection onTrackInteraction={handleTrackInteraction} activeGenre={activeGenre} />

            <div ref={tonalityRef}>
              <TonalityFilter 
                activeTonality={activeTonality}
                onTonalityChange={setActiveTonality}
              />
            </div>

            <div className="mb-8">
              <TrackListView 
                tracks={allTracks}
                onTrackInteraction={handleTrackInteraction}
                userFavorites={userFavorites}
              />
            </div>

            <AlbumsSection albums={albums} onAlbumClick={handleAlbumPageClick} activeGenre={activeGenre} />
            
            <PlaylistsSection onAlbumClick={handleAlbumPageClick} activeGenre={activeGenre} />
          </>
        ) : null}
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
        onClose={() => {
          setPanelOpen(false);
          setPanelIsPlaying(false);
        }}
        user={user}
        onAuthRequired={handleOpenAuth}
        onSubscribe={() => {
          setSelectedPlan('premium');
          setShowCheckout(true);
        }}
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

      {selectedAlbumDetail && (
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
            setSelectedPlan('premium');
            setShowCheckout(true);
          }}
        />
      )}

      {showAdminDashboard && (
        <AdminDashboard 
          onClose={() => setShowAdminDashboard(false)} 
          user={user}
          onUserUpdate={setUser}
        />
      )}

      {showUserDashboard && user && (
        <UserDashboard
          user={user}
          onClose={() => setShowUserDashboard(false)}
          onUserUpdate={setUser}
          onLogout={handleLogout}
          onTrackInteraction={handleTrackInteraction}
        />
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
        <CheckoutPage 
          selectedPlan={selectedPlan}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {authModalOpen && (
        <AuthModal 
          onClose={handleCloseAuth}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default App;
