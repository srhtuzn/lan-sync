import type { DeviceStatus, FileIndex, SyncRunRequest, ScanResult, AnalysisResult } from '@lan-sync/shared';

const BASE = '';

export async function getStatus(): Promise<DeviceStatus> {
  const res = await fetch(`${BASE}/api/status`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function getIndex(): Promise<FileIndex> {
  const res = await fetch(`${BASE}/api/index`);
  if (!res.ok) throw new Error(`index ${res.status}`);
  return res.json();
}

export async function setRootDir(rootDir: string): Promise<void> {
  const res = await fetch(`${BASE}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rootDir }),
  });
  if (!res.ok) throw new Error(`config ${res.status}`);
}

export async function syncRun(req: SyncRunRequest): Promise<void> {
  const res = await fetch(`${BASE}/api/sync/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`sync ${res.status}`);
}

export async function scanPeers(subnet?: string): Promise<ScanResult> {
  const res = await fetch(`${BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subnet }),
  });
  if (!res.ok) throw new Error(`scan ${res.status}`);
  return res.json();
}

export async function getPeerStatus(ip: string, port: number): Promise<DeviceStatus> {
  const res = await fetch(`http://${ip}:${port}/api/status`);
  if (!res.ok) throw new Error(`peer status ${res.status}`);
  return res.json();
}

export async function getPeerIndex(ip: string, port: number): Promise<FileIndex> {
  const res = await fetch(`http://${ip}:${port}/api/index`);
  if (!res.ok) throw new Error(`peer index ${res.status}`);
  return res.json();
}

export function analyzeIndexes(local: FileIndex, remote: FileIndex): AnalysisResult {
  const localMap = new Map(local.files.map(f => [f.relativePath, f]));
  const remoteMap = new Map(remote.files.map(f => [f.relativePath, f]));

  const missingOnLocal = remote.files.filter(f => !localMap.has(f.relativePath));
  const missingOnRemote = local.files.filter(f => !remoteMap.has(f.relativePath));
  const conflicting = local.files
    .filter(f => remoteMap.has(f.relativePath) && remoteMap.get(f.relativePath)!.sha256 !== f.sha256)
    .map(f => ({ local: f, remote: remoteMap.get(f.relativePath)! }));

  return {
    localCount: local.files.length,
    remoteCount: remote.files.length,
    localSize: local.files.reduce((s, f) => s + f.size, 0),
    remoteSize: remote.files.reduce((s, f) => s + f.size, 0),
    missingOnLocal,
    missingOnRemote,
    conflicting,
  };
}
