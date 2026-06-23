import type { HistoryEntry } from '@lan-sync/shared';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './RightPanel.module.css';

interface RightPanelProps {
  history: HistoryEntry[];
  onClear: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function LevelIcon({ level }: { level: HistoryEntry['level'] }): JSX.Element {
  switch (level) {
    case 'success': return <CheckCircle2 size={12} className={styles.iconSuccess} />;
    case 'error':   return <XCircle size={12} className={styles.iconError} />;
    case 'warning': return <AlertTriangle size={12} className={styles.iconWarning} />;
    default:        return <Info size={12} className={styles.iconInfo} />;
  }
}

export default function RightPanel({ history, onClear }: RightPanelProps): JSX.Element {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>History</span>
        <button className={styles.clearBtn} onClick={onClear}>Clear</button>
      </div>
      <div className={styles.list}>
        {history.length === 0 ? (
          <div className={styles.empty}>No activity yet</div>
        ) : (
          history.map(entry => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryTop}>
                <span className={styles.entryTime}>{formatTime(entry.timestamp)}</span>
                <LevelIcon level={entry.level} />
                <span className={styles.entryMsg}>{entry.message}</span>
              </div>
              {entry.detail && (
                <div className={styles.entryDetail}>{entry.detail}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
