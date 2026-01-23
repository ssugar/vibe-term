// Session represents a Claude Code instance
export interface Session {
  id: string;                    // `claude-${pid}` for stability
  pid: number;                   // Process ID for detection
  projectPath: string;           // Full path to project
  projectName: string;           // Display name (folder or parent/folder)
  status: 'working' | 'idle' | 'blocked' | 'ended';  // 'ended' for fade-out
  contextUsage: number;          // 0-100 percentage (Phase 4)
  model: 'sonnet' | 'opus' | 'haiku';
  subagentCount: number;         // Number of active subagents
  startedAt: Date;
  lastActivity: Date;
  inTmux: boolean;               // Whether running in tmux
  tmuxTarget?: string;           // e.g., "session:1.2" for navigation
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
