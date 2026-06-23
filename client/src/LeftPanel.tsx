import { useState, useEffect } from 'react';
import type { DeviceStatus, Peer, StoredPeer } from '@lan-sync/shared';
import { setRootDir, getStatus, getPeers, addPeer, removePeer, toggleAutoSync } from './api';
import { Monitor, FolderOpen, RefreshCw, X, Zap } from 'lucide-react';
import styles from './LeftPanel.module.css';

interface LeftPanelProps {
  localStatus: DeviceStatus | null;
  activePeer: Peer | null;
  setActivePeer: (peer: Peer | null) => void;
}

type RichPeer = StoredPeer & { status: DeviceStatus | null; reachable: boolean };

interface PeerRowProps {
  peer: RichPeer;
  isActive: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
  onToggleAutoSync: (e: React.MouseEvent) => void;
}

function PeerRow({ peer, isActive, onSelect, onRemove, onToggleAutoSync }: PeerRowProps): JSX.Element {
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
      <button
        className={`${styles.autoSyncBtn} ${peer.autoSync ? styles.autoSyncOn : ''}`}
        onClick={onToggleAutoSync}
        title={peer.autoSync ? 'Oto-Eşitleme Açık — kapat' : 'Oto-Eşitleme Kapalı — aç'}
      >
        <Zap size={11} />
      </button>
      <button className={styles.removeBtn} onClick={onRemove} title="Cihazı kaldır">
        <X size={11} />
      </button>
    </div>
  );
}

export default function LeftPanel({ localStatus, activePeer, setActivePeer }: LeftPanelProps): JSX.Element {
  const [localOverride, setLocalOverride] = useState<DeviceStatus | null>(null);
  const [folderInput, setFolderInput] = useState('');
  const [folderFeedback, setFolderFeedback] = useState<'success' | 'error' | null>(null);
  const [peers, setPeers] = useState<RichPeer[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);

  const displayStatus = localOverride ?? localStatus;

  // Sunucudan cihaz listesini yükle
  useEffect(() => {
    getPeers().then(setPeers).catch(() => {});
  }, []);

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
    if (!ip || adding) return;
    setAdding(true);
    try {
      const saved = await addPeer({ ip, port: 37821 });
      setPeers(prev => prev.find(p => p.id === saved.id) ? prev : [...prev, saved]);
      setManualIp('');
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleScan = async (): Promise<void> => {
    if (scanning) return;
    setScanning(true);
    try {
      // Tarama: broadcast isteği ile tüm ağı tara
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('scan failed');
      const result = await res.json() as { peers: Array<{ ip: string; port: number; status: DeviceStatus }> };
      // Bulunan yeni cihazları sunucuya ekle
      for (const p of result.peers) {
        if (!peers.find(existing => existing.id === `${p.ip}:${p.port}`)) {
          try {
            const saved = await addPeer({ ip: p.ip, port: p.port });
            setPeers(prev => [...prev, saved]);
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore scan errors */ }
    setScanning(false);
  };

  const handleRemovePeer = async (peer: RichPeer, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try { await removePeer(peer.id); } catch { /* ignore */ }
    setPeers(prev => prev.filter(p => p.id !== peer.id));
    if (activePeer?.id === peer.id) setActivePeer(null);
  };

  const handleToggleAutoSync = async (peer: RichPeer, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const next = !peer.autoSync;
    try { await toggleAutoSync(peer.id, next); } catch { /* ignore */ }
    setPeers(prev => prev.map(p => p.id === peer.id ? { ...p, autoSync: next } : p));
  };

  return (
    <div className={styles.panel}>
      {/* ── Yerel cihaz kartı ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>BU CİHAZ</div>
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
              : <span className={styles.muted}>Klasör seçilmedi</span>
            }
          </div>
        </div>
        <div className={`${styles.inputRow} ${styles.mt8}`}>
          <input
            className={`${styles.input}${folderFeedback === 'success' ? ' ' + styles.flashSuccess : folderFeedback === 'error' ? ' ' + styles.flashError : ''}`}
            placeholder="C:\Dosyalar"
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSetFolder(); }}
          />
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void handleSetFolder()}>Seç</button>
        </div>
      </div>

      {/* ── Cihaz keşfi ── */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>DİĞER CİHAZLAR</div>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="192.168.1.x"
            value={manualIp}
            onChange={e => setManualIp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAddPeer(); }}
          />
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => void handleAddPeer()}
            disabled={adding}
          >
            {adding ? '…' : 'Ekle'}
          </button>
        </div>
        <button
          className={`${styles.btn} ${styles.btnSecondary} ${styles.scanBtn}`}
          onClick={() => void handleScan()}
          disabled={scanning}
        >
          <RefreshCw size={11} className={scanning ? styles.spinning : ''} />
          {scanning ? 'Taranıyor…' : 'Ağı Tara'}
        </button>
      </div>

      {/* ── Cihaz listesi ── */}
      <div className={styles.peerList}>
        {peers.length === 0
          ? (
            <div className={styles.emptyPeers}>
              Cihaz bulunamadı — IP ekleyin veya ağı tarayın
            </div>
          )
          : peers.map(peer => (
            <PeerRow
              key={peer.id}
              peer={peer}
              isActive={activePeer?.id === peer.id}
              onSelect={() => {
                const asPeer: Peer = {
                  id: peer.id,
                  ip: peer.ip,
                  port: peer.port,
                  status: peer.status,
                  reachable: peer.reachable,
                  lastSeen: peer.addedAt,
                };
                setActivePeer(activePeer?.id === peer.id ? null : asPeer);
              }}
              onRemove={(e) => void handleRemovePeer(peer, e)}
              onToggleAutoSync={(e) => void handleToggleAutoSync(peer, e)}
            />
          ))
        }
      </div>

      {/* ── Oto-Eşitleme açıklaması ── */}
      {peers.some(p => p.autoSync) && (
        <div className={styles.autoSyncNote}>
          <Zap size={10} style={{ flexShrink: 0, marginTop: 1 }} />
          Dosya değişince otomatik eşitleme aktif
        </div>
      )}
    </div>
  );
}

