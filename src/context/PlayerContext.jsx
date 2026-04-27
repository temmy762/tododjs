import { createContext, useContext } from 'react';

/**
 * Provides the global player state (which track is currently playing in the panel)
 * to any component in the tree, avoiding prop drilling.
 */
export const PlayerContext = createContext({
  currentTrackId: null,
  isPanelPlaying: false,
});

export const usePlayer = () => useContext(PlayerContext);
