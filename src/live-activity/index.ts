// Live Activities are iOS-only; other platforms get no-ops so shared code stays branch-free.
import type { Card } from '@/lib/rotation';

export const isLiveActivitySupported = false;

export async function showOnLockScreen(_card: Card, _position: string, _staleDate: Date): Promise<void> {}

export async function hideFromLockScreen(): Promise<void> {}

export function isShownOnLockScreen(): boolean {
  return false;
}
