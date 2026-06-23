export const VERSION = '1.0.0';

// File metadata stored in DB and exchanged between peers
export interface FileMetadata {
  relativePath: string;   // normalized with forward slashes, no leading slash
  size: number;           // bytes
  mtime: number;          // Unix timestamp ms
  sha256: string;         // hex string
  indexedAt: number;      // Unix timestamp ms
}

// The full index returned by GET /api/index
export interface FileIndex {
  deviceName: string;
  rootPath: string;
  files: FileMetadata[];
  generatedAt: number;    // Unix timestamp ms
}

// Sync state type
export type SyncState = 'idle' | 'scanning' | 'syncing' | 'error';

// GET /api/status response
export interface DeviceStatus {
  deviceName: string;
  ip: string;
  port: number;           // always 37821
  rootPath: string | null;
  syncState: SyncState;
  version: string;
}

// Peer info stored in client (UI state)
export interface Peer {
  id: string;             // "ip:port"
  ip: string;
  port: number;
  status: DeviceStatus | null;
  reachable: boolean;
  lastSeen: number | null;
}

// Peer record persisted in server DB
export interface StoredPeer {
  id: string;             // "ip:port"
  ip: string;
  port: number;
  autoSync: boolean;      // trigger sync automatically on file change
  addedAt: number;        // Unix ms
}

// POST /api/peers body
export interface AddPeerRequest {
  ip: string;
  port: number;
}

// PATCH /api/peers/:id body
export interface UpdatePeerRequest {
  autoSync: boolean;
}

// Analysis result (Analyze button)
export interface AnalysisResult {
  localCount: number;
  remoteCount: number;
  localSize: number;
  remoteSize: number;
  missingOnLocal: FileMetadata[];
  missingOnRemote: FileMetadata[];
  conflicting: Array<{ local: FileMetadata; remote: FileMetadata }>;
}

// WebSocket event types sent from server to client
export type WsMessage =
  | { type: 'sync_started'; peerId: string }
  | { type: 'sync_progress'; peerId: string; file: string; transferred: number; total: number; speed: number }
  | { type: 'sync_complete'; peerId: string; filesSynced: number; duration: number }
  | { type: 'sync_error'; peerId: string; file: string; error: string }
  | { type: 'file_changed'; relativePath: string; action: 'added' | 'changed' }
  | { type: 'state_changed'; state: SyncState }
  | { type: 'peer_status'; peerId: string; reachable: boolean; status: DeviceStatus | null };

// History log entry (client-side)
export interface HistoryEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

// POST /api/sync/run request body
export interface SyncRunRequest {
  peerIp: string;
  peerPort: number;
}

// POST /api/scan request body (LAN scan)
export interface ScanRequest {
  subnet?: string;  // e.g. "192.168.1" — if omitted, auto-detect
}

// POST /api/scan response
export interface ScanResult {
  peers: Array<{ ip: string; port: number; status: DeviceStatus }>;
}
