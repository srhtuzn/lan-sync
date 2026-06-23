import { useState } from 'react';
import type { DeviceStatus, Peer } from '@lan-sync/shared';
import { setRootDir, scanPeers, getPeerStatus, getStatus } from './api';
import { Monitor, FolderOpen, RefreshCw, X } from 'lucide-react';
import styles from './LeftPanel.module.css';

interface LeftPanelProps {
  localStatus: DeviceStatus | null;
  activePeer: Peer | null;
  setActivePeer: (peer: Peer | null) => void;
}

interface PeerRowProps {
  peer: Peer;
  isActive: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function PeerRow({ peer, isActive, onSelect, onRemove }: PeerRowProps): JSX.Element {
  const name = peer.status?.deviceName ?? peer.ip;
  const folder = peer.status?.rootPath ?? '—';
  return (
    <div className={`${styles.peerRow}${isActive ? ' ' + styles.active : ''}`} onClick={onSelect}>
      <span className={`${styles.statusDot} ${peer.reachable ? styles.online : styles.offline}`} />
      <div className={styles.peerInfo}>
        <span className={styles.peerName}>{name}</span>
        <span className={styles.peerMeta}>{peer.ip}:{peer.port}</span>
        <span className={styles.peerFolder}>{folder}</span>
      </div>
      <button className={styles.removeBtn} onClick={onRemove} title="Remove peer">
        <X size={11} />
      </button>
    </div>
  );
}

export default function LeftPanel({ localStatus, activePeer, setActivePeer }: LeftPanelProps): JSX.Element {
  const [localOverride, setLocalOverride] = useState<DeviceStatus | null>(null);
  const [folderInput, setFolderInput] = useState('');
  const [folderFeedback, setFolderFeedback] = useState<'success' | 'error' | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [scanning, setScanning] = useState(false);

  const displayStatus = localOverride ?? localStatus;

  const handleSetFolder = async (): Promise<void> => {
    const path = folderInput.trim();
    if (!path) return;
    try {
      await setRootDir(path);
      const updated = await getStatus();
      setLocalOverride(updated);
      setFolderFeedback('success');
    } catch {
      setFolderFeedback('error');
    }
    setTimeout(() => setFolderFeedback(null), 2500);
  };

  const handleAddPeer = async (): Promise<void> => {
    const ip = manualIp.trim();
    if (!ip) return;
    const id = `${ip}:37821`;
    if (peers.find(p => p.id === id)) { setManualIp(''); return; }
    try {
      const status = await getPeerStatus(ip, 37821);
      setPeers(prev => [...prev, { id, ip, port: 37821, status, reachable: true, lastSeen: Date.now() }]);
    } catch {
      setPeers(prev => [...prev, { id, ip, port: 37821, status: null, reachable: false, lastSeen: null }]);
    }
    setManualIp('');
  };

  const handleScan = async (): Promise<void> => {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await scanPeers();
      setPeers(prev => {
        const next = [...prev];
        for (const p of result.peers) {
          const id = `${p.ip}:${p.port}`;
          if (!next.find(m => m.id === id)) {
            next.push({ id, ip: p.ip, port: p.port, status: p.status, reachable: true, lastSeen: Date.now() });
          }
        }
        return next;
      });
    } catch { /* ignore scan errors */ }
    setScanning(false);
  };

  return (
    <div className={styles.panel}>
      {/* ── Local device card ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>THIS DEVICE</div>
        <div className={styles.deviceCard}>
          <div className={styles.deviceNameRow}>
            <Monitor size={13} />
            <span className={styles.deviceName}>{displayStatus?.deviceName ?? '—'}</span>
          </div>
          <div className={styles.deviceIp}>{displayStatus?.ip ?? '—'}</div>
          <div className={styles.folderPathRow}>
            <FolderOpen size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            {displayStatus?.rootPath
              ? <span className={styles.folderPath}>{displayStatus.rootPath}</span>
              : <span className={styles.muted}>No folder selected</span>
            }
          </div>
        </div>
        <div className={`${styles.inputRow} ${styles.mt8}`}>
          <input
            className={`${styles.input}${folderFeedback === 'success' ? ' ' + styles.flashSuccess : folderFeedback === 'error' ? ' ' + styles.flashError : ''}`}
            placeholder="D:\Files"
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSetFolder(); }}
          />
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void handleSetFolder()}>Set</button>
        </div>
      </div>

      {/* ── Peer discovery ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>PEERS</div>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="192.168.1.x"
            value={manualIp}
            onChange={e => setManualIp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAddPeer(); }}
          />
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void handleAddPeer()}>Add</button>
        </div>
        <button
          className={`${styles.btn} ${styles.btnSecondary} ${styles.scanBtn}`}
          onClick={() => void handleScan()}
          disabled={scanning}
        >
          <RefreshCw size={11} className={scanning ? styles.spinning : ''} />
          {scanning ? 'Scanning…' : 'Scan LAN'}
        </button>
      </div>

      {/* ── Peer list ── */}
      <div className={styles.peerList}>
        {peers.length === 0
          ? <div className={styles.emptyPeers}>No peers — add an IP or scan</div>
          : peers.map(peer => (
            <PeerRow
              key={peer.id}
              peer={peer}
              isActive={activePeer?.id === peer.id}
              onSelect={() => setActivePeer(activePeer?.id === peer.id ? null : peer)}
              onRemove={e => {
                e.stopPropagation();
                setPeers(prev => prev.filter(p => p.id !== peer.id));
                if (activePeer?.id === peer.id) setActivePeer(null);
              }}
            />
          ))
        }
      </div>
    </div>
  );
}
