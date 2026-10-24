import type { SFSymbol } from 'sf-symbols-typescript';

import { APP_SCHEME } from '@/config';
import type { Card } from '@/lib/rotation';

import FactActivity from './FactActivity.ios';
import { ensureMascot } from './mascot.ios';

export const isLiveActivitySupported = true;

/** Shows the card on the lock screen, reusing the running activity when there is one. */
export type Surfaces = { lockScreen: boolean; island: boolean };

export async function showOnLockScreen(card: Card, position: string, staleDate: Date, on: Surfaces): Promise<void> {
  const props = {
    topic: card.topicTitle,
    text: card.text,
    symbol: card.symbol as SFSymbol,
    position,
    lockScreen: on.lockScreen,
    island: on.island,
    shell: (await ensureMascot()) ?? '',
  };
  const [current, ...extra] = FactActivity.getInstances();
  await Promise.all(extra.map((a) => a.end('immediate')));
  if (current) {
    await current.update(props, staleDate);
  } else {
    // Throws when the user disabled Live Activities for this app in Settings.
    FactActivity.start(props, `${APP_SCHEME}://`, staleDate);
  }
}

export async function hideFromLockScreen(): Promise<void> {
  await Promise.all(FactActivity.getInstances().map((a) => a.end('immediate')));
}

export function isShownOnLockScreen(): boolean {
  return FactActivity.getInstances().length > 0;
}
