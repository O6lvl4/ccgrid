/**
 * In-memory store for follow-up file attachments.
 * Keyed by sessionId, each entry is an array of follow-up rounds.
 * Each round is an array of { name, mimeType, dataUrl }.
 */
export interface AttachmentPreview {
  name: string;
  mimeType: string;
  dataUrl: string;
}

const store = new Map<string, AttachmentPreview[][]>();

/** Push a new round of attachments for a session */
export function pushAttachments(sessionId: string, files: AttachmentPreview[]): void {
  const rounds = store.get(sessionId) ?? [];
  rounds.push(files);
  store.set(sessionId, rounds);
}

/** Get all follow-up attachment rounds for a session */
export function getAttachmentRounds(sessionId: string): AttachmentPreview[][] {
  return store.get(sessionId) ?? [];
}
