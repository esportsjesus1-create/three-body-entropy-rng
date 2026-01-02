/**
 * Commitment Store
 * 
 * In-memory storage for spin commitments.
 * In production, this would be replaced with a database.
 */

export interface CommitmentData {
  serverSeed: string;
  commitmentHash: string;
  timestamp: number;
  expiresAt: number;
  used: boolean;
}

const commitmentStore = new Map<string, CommitmentData>();

export function getCommitment(spinId: string): CommitmentData | undefined {
  return commitmentStore.get(spinId);
}

export function setCommitment(spinId: string, data: CommitmentData): void {
  commitmentStore.set(spinId, data);
}

export function deleteCommitment(spinId: string): boolean {
  return commitmentStore.delete(spinId);
}

export function cleanupExpiredCommitments(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  commitmentStore.forEach((commitment, spinId) => {
    if (now > commitment.expiresAt) {
      keysToDelete.push(spinId);
    }
  });
  keysToDelete.forEach((key) => commitmentStore.delete(key));
}
