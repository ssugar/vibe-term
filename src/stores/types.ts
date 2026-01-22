// Session represents a Claude Code instance (used in later phases)
export interface Session {
  id: string;
  projectPath: string;
  status: 'working' | 'idle' | 'blocked';
  contextUsage: number; // 0-100 percentage
  model: 'sonnet' | 'opus' | 'haiku';
  startedAt: Date;
  lastActivity: Date;
}

// Application state
export interface AppState {
  // UI state
  isConfirmingExit: boolean;
  showHelp: boolean;
  selectedIndex: number;
  error: string | null;

  // Refresh state
  lastRefresh: Date | null;
  refreshInterval: number; // milliseconds

  // Sessions (empty in Phase 1, populated in Phase 2)
  sessions: Session[];

  // Actions
  setConfirmingExit: (value: boolean) => void;
  setShowHelp: (value: boolean) => void;
  setSelectedIndex: (index: number) => void;
  setError: (error: string | null) => void;
  setLastRefresh: (date: Date) => void;
  setRefreshInterval: (interval: number) => void;
  setSessions: (sessions: Session[]) => void;
}
