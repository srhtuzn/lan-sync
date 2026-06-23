import { useState } from 'react';
import type { DeviceStatus, Peer, SyncState, HistoryEntry, AnalysisResult } from '@lan-sync/shared';
import { syncRun, getIndex, getPeerIndex, analyzeIndexes } from './api';
import { RefreshCw, Search, Wand2 } from 'lucide-react';
import styles from './CenterPanel.module.css';

interface CenterPanelProps {
  localStatus: DeviceStatus | null;
  activePeer: Peer | null;
  syncState: SyncState;
  progress: { file: string; transferred: number; total: number; speed: number } | null;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

const STATE_LABELS: Record<SyncState, string> = {
  idle: 'Ready',
  syncing: 'Syncing…',
  scanning: 'Scanning…',
  error: 'Error',
};

export default function CenterPanel({
  localStatus,
  activePeer,
  syncState,
  progress,
  addHistory,
}: CenterPanelProps): JSX.Element {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [toasts, setToasts] = useState<string[]>([]);

  const pushToast = (msg: string): void => {
    setToasts(prev => [...prev, msg]);
    setTimeout(() => setToasts(prev => prev.slice(1)), 3000);
  };

  const handleSyncNow = async (): Promise<void> => {
    if (!activePeer) return;
    try {
      await syncRun({ peerIp: activePeer.ip, peerPort: activePeer.port });
      addHistory({ level: 'info', message: `Sync requested with ${activePeer.ip}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addHistory({ level: 'error', message: 'Sync request failed', detail: msg });
    }
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!activePeer || analysisLoading) return;
    setAnalysisLoading(true);
    try {
      const [local, remote] = await Promise.all([
        getIndex(),
        getPeerIndex(activePeer.ip, activePeer.port),
      ]);
      const result = analyzeIndexes(local, remote);
      setAnalysisResult(result);
      setAnalysisOpen(true);
      addHistory({ level: 'info', message: `Analysis complete — local: ${result.localCount}, remote: ${result.remoteCount}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addHistory({ level: 'error', message: 'Analysis failed', detail: msg });
    }
    setAnalysisLoading(false);
  };

  const handleAutoRename = (): void => {
    pushToast('Feature coming soon');
  };

  const isSyncing = syncState === 'syncing';
  const pct = progress ? Math.min(100, (progress.transferred / progress.total) * 100) : 0;

  return (
    <div>
      {/* 1. Status Banner */}
      <div className={styles.statusBanner} data-state={syncState}>
        {STATE_LABELS[syncState]}
      </div>

      {/* 2. Active Peer Info */}
      {activePeer ? (
        <div className={styles.peerInfo}>
          <div className={styles.peerInfoName}>
            {activePeer.status?.deviceName ?? activePeer.ip}
          </div>
          <div className={styles.peerInfoDetail}>
            {activePeer.ip}:{activePeer.port}
            {activePeer.status?.rootPath ? ` · ${activePeer.status.rootPath}` : ''}
          </div>
        </div>
      ) : (
        <div className={styles.noPeer}>
          Select a peer from the left panel to sync.
        </div>
      )}

      {/* 3. Action Buttons */}
      <div className={styles.btnRow}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => void handleSyncNow()}
          disabled={!activePeer || isSyncing}
          title="Sync Now"
        >
          <RefreshCw size={13} />
          Sync Now
        </button>
        <button
          className={`${styles.btn} ${styles.btnDefault}`}
          onClick={() => void handleAnalyze()}
          disabled={!activePeer || analysisLoading}
          title="Analyze"
        >
          <Search size={13} />
          {analysisLoading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnDefault}`}
          onClick={handleAutoRename}
          title="Auto-rename"
        >
          <Wand2 size={13} />
          Auto-rename
        </button>
      </div>

      {/* 4. Progress Row */}
      {progress !== null && (
        <div className={styles.progressSection}>
          <div className={styles.progressFile}>{progress.file}</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressStats}>
            {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
            &nbsp;&nbsp;·&nbsp;&nbsp;
            {formatBytes(progress.speed)}/s
          </div>
        </div>
      )}

      {/* 5. Analysis Result */}
      {analysisResult !== null && (
        <div className={styles.analysisSection}>
          <div className={styles.analysisHeader} onClick={() => setAnalysisOpen(o => !o)}>
            <span className={styles.analysisTitle}>Analysis Result</span>
            <button className={styles.analysisToggle}>{analysisOpen ? '▲ Hide' : '▼ Show'}</button>
          </div>
          {analysisOpen && (
            <div className={styles.analysisBody}>
              <div className={styles.analysisSummary}>
                Local: {analysisResult.localCount} files ({formatBytes(analysisResult.localSize)})
                &nbsp;·&nbsp;
                Remote: {analysisResult.remoteCount} files ({formatBytes(analysisResult.remoteSize)})
              </div>

              <div className={styles.analysisGroup}>
                <div className={styles.analysisGroupTitle}>
                  Missing on this PC ({analysisResult.missingOnLocal.length})
                </div>
                {analysisResult.missingOnLocal.length === 0
                  ? <div className={styles.analysisEmpty}>None</div>
                  : analysisResult.missingOnLocal.map(f => (
                    <div key={f.relativePath} className={styles.analysisItem}>{f.relativePath}</div>
                  ))
                }
              </div>

              <div className={styles.analysisGroup}>
                <div className={styles.analysisGroupTitle}>
                  Missing on peer ({analysisResult.missingOnRemote.length})
                </div>
                {analysisResult.missingOnRemote.length === 0
                  ? <div className={styles.analysisEmpty}>None</div>
                  : analysisResult.missingOnRemote.map(f => (
                    <div key={f.relativePath} className={styles.analysisItem}>{f.relativePath}</div>
                  ))
                }
              </div>

              <div className={styles.analysisGroup}>
                <div className={styles.analysisGroupTitle}>
                  Conflicts ({analysisResult.conflicting.length})
                </div>
                {analysisResult.conflicting.length === 0
                  ? <div className={styles.analysisEmpty}>None</div>
                  : analysisResult.conflicting.map(({ local, remote }) => (
                    <div key={local.relativePath} className={styles.analysisItem}>
                      {local.relativePath}
                      &nbsp;
                      <span style={{ color: '#8b949e' }}>
                        ({formatBytes(local.size)} vs {formatBytes(remote.size)})
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map((msg, i) => (
            <div key={i} className={styles.toast}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
