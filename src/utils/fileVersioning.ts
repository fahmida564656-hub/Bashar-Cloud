import { CloudFile, FileVersion } from '../types';

/**
 * Creates the initial v1 version entry for a newly created or uploaded file
 */
export function createInitialVersion(
  file: Pick<CloudFile, 'id' | 'name' | 'sizeBytes' | 'formattedSize' | 'date'>,
  uploaderName?: string
): FileVersion {
  return {
    versionId: `${file.id}-v1`,
    versionNumber: 1,
    timestamp: file.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    sizeBytes: file.sizeBytes,
    formattedSize: file.formattedSize,
    action: 'Created',
    modifiedBy: uploaderName || 'User',
    note: 'Initial upload / file creation',
    name: file.name,
  };
}

/**
 * Ensures a file has its version history list, creating v1 if empty
 */
export function ensureFileVersions(file: CloudFile, uploaderName?: string): FileVersion[] {
  if (file.versions && file.versions.length > 0) {
    return file.versions;
  }
  return [createInitialVersion(file, uploaderName)];
}

/**
 * Append a new version when a file is modified, renamed, re-uploaded, or restored
 */
export function appendFileVersion(
  file: CloudFile,
  action: FileVersion['action'],
  details?: {
    newName?: string;
    newSizeBytes?: number;
    newFormattedSize?: string;
    modifiedBy?: string;
    note?: string;
  }
): CloudFile {
  const currentVersions = ensureFileVersions(file, details?.modifiedBy);
  const nextVersionNumber = currentVersions.length + 1;

  const nowFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newVersion: FileVersion = {
    versionId: `${file.id}-v${nextVersionNumber}`,
    versionNumber: nextVersionNumber,
    timestamp: nowFormatted,
    sizeBytes: details?.newSizeBytes !== undefined ? details.newSizeBytes : file.sizeBytes,
    formattedSize: details?.newFormattedSize || file.formattedSize,
    action,
    modifiedBy: details?.modifiedBy || 'User',
    note: details?.note || `${action} on ${nowFormatted}`,
    name: details?.newName || file.name,
  };

  return {
    ...file,
    name: details?.newName || file.name,
    sizeBytes: details?.newSizeBytes !== undefined ? details.newSizeBytes : file.sizeBytes,
    formattedSize: details?.newFormattedSize || file.formattedSize,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    versions: [newVersion, ...currentVersions], // newest version first
  };
}
