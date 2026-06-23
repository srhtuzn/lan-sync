import { useState, useEffect, useCallback } from 'react';
import type { DeviceStatus, Peer, HistoryEntry, WsMessage, SyncState } from '@lan-sync/shared';
import { getStatus } from './api';
import { useWebSocket } from './useWebSocket';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import styles from './App.module.css';

export default function App(): JSX.Element {
  const [localStatus, setLocalStatus] = useState<DeviceStatus | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [activePeer, setActivePeer] = useState<Peer | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [progress, setProgress] = useState<{ file: string; transferred: number; total: number; speed: number } | null>(null);

  useEffect(() => {
    getStatus().then(setLocalStatus).catch(() => {});
    const interval = setInterval(() => getStatus().then(setLocalStatus).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const addHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void => {
    setHistory(prev => [{
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      ...entry,
    }, ...prev].slice(0, 200));
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage): void => {
    switch (msg.type) {
      case 'state_changed':
        setSyncState(msg.state);
        break;
      case 'sync_started':
        addHistory({ level: 'info', message: `${msg.peerId} ile eşitleme başladı` });
        break;
      case 'sync_complete':
        addHistory({ level: 'success', message: `${msg.filesSynced} dosya ${(msg.duration / 1000).toFixed(1)} saniyede eşitlendi` });
        setProgress(null);
        break;
      case 'sync_error':
        addHistory({ level: 'error', message: `Hata: ${msg.file}`, detail: msg.error });
        break;
      case 'sync_progress':
        setProgress({ file: msg.file, transferred: msg.transferred, total: msg.total, speed: msg.speed });
        break;
      case 'file_changed':
        addHistory({ level: 'info', message: `${msg.action === 'added' ? 'Eklendi' : 'Değiştirildi'}: ${msg.relativePath}` });
        break;
    }
  }, [addHistory]);

  useWebSocket(handleWsMessage);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.logo}>&#8635; LAN Sync</span>
        <span className={styles.headerStatus} data-state={syncState}>
          {syncState === 'idle' ? 'Boşta' : syncState === 'syncing' ? 'Eşitleniyor…' : syncState === 'scanning' ? 'Taranıyor…' : 'Hata'}
        </span>
      </header>
      <div className={styles.panels}>
        <aside className={styles.leftPanel} id="left-panel">
          <LeftPanel
            localStatus={localStatus}
            activePeer={activePeer}
            setActivePeer={setActivePeer}
          />
        </aside>
        <main className={styles.centerPanel} id="center-panel">
          <CenterPanel
            localStatus={localStatus}
            activePeer={activePeer}
            syncState={syncState}
            progress={progress}
            addHistory={addHistory}
          />
        </main>
        <aside className={styles.rightPanel} id="right-panel">
          <RightPanel
            history={history}
            onClear={() => setHistory([])}
          />
        </aside>
      </div>
    </div>
  );
}
