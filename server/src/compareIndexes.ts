import type { FileMetadata } from '@lan-sync/shared';

export interface IndexDiff {
  toDownload: FileMetadata[];      // missing on local or sha256 differs
}

export function compareIndexes(
  localFiles: FileMetadata[],
  remoteFiles: FileMetadata[],
): IndexDiff {
  const localMap = new Map(localFiles.map(f => [f.relativePath, f]));
  const toDownload = remoteFiles.filter(peerFile => {
    const local = localMap.get(peerFile.relativePath);
    return !local || local.kind !== peerFile.kind || local.sha256 !== peerFile.sha256;
  });
  return { toDownload };
}
