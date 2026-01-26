import { create } from 'zustand';
import type { AppState } from './types.js';

export const useAppStore = create<AppState>()((set) => ({
  // Initial UI state
  isConfirmingExit: false,
  showHelp: false,
  selectedIndex: 0,
  activeSessionId: null,
  error: null,

  // Initial refresh state
  lastRefresh: null,
  refreshInterval: 2000, // 2 seconds default

  // Sessions (empty initially)
  sessions: [],

  // Actions
  setConfirmingExit: (value) => set({ isConfirmingExit: value }),
  setShowHelp: (value) => set({ showHelp: value }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setError: (error) => set({ error }),
  setLastRefresh: (date) => set({ lastRefresh: date }),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  setSessions: (sessions) => set({ sessions }),
}));
