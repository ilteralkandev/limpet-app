// Single entry point for "what card is showing and is the lock screen in sync".
// Used by the UI and by the background task, so it must not depend on React.
import { hideFromLockScreen, isShownOnLockScreen, showOnLockScreen } from '@/live-activity';
import { loadCachedPacks, pruneCachedPacks, syncPacks } from '@/lib/content/cache';
import type { TopicSummary } from '@/lib/content/types';
import { loadPreferences, savePreferences, type Preferences } from '@/lib/preferences';
import {
  advance,
  buildDeck,
  currentCard,
  INITIAL_ROTATION,
  isDue,
  nextUpdateAt,
  type Card,
  type RotationState,
} from '@/lib/rotation';
import { readJSON, writeJSON } from '@/lib/storage';
import { cancelBackgroundRotation, scheduleBackgroundRotation } from '@/tasks/rotate-task';

const ROTATION_KEY = 'rotation:v1';
// Mark the lock screen card stale if it misses its update by this much.
const STALE_GRACE_MS = 15 * 60_000;

export type Snapshot = {
  card: Card | null;
  nextUpdateAt: number | null;
  deckSize: number;
  lockScreenError: string | null;
};

/**
 * Advances to the next card when its interval has passed (or when forced),
 * then makes sure the lock screen shows the current card. Offline-only.
 */
export async function rotate({ force = false } = {}): Promise<Snapshot> {
  const prefs = await loadPreferences();
  const deck = buildDeck(await loadCachedPacks(prefs.topicIds));
  let rotation = (await readJSON<RotationState>(ROTATION_KEY)) ?? INITIAL_ROTATION;
  const now = Date.now();

  const factStillInDeck = deck.some((c) => c.factId === rotation.factId);
  const advanced = force || !factStillInDeck || isDue(rotation, prefs.intervalMinutes, now);
  if (advanced) {
    rotation = advance(deck, rotation, now);
    await writeJSON(ROTATION_KEY, rotation);
  }

  const card = currentCard(deck, rotation);
  let lockScreenError: string | null = null;
  try {
    await syncLockScreen(prefs, card, rotation, advanced);
  } catch (error) {
    lockScreenError = error instanceof Error ? error.message : String(error);
  }

  return {
    card,
    nextUpdateAt: card ? nextUpdateAt(rotation, prefs.intervalMinutes) : null,
    deckSize: deck.length,
    lockScreenError,
  };
}

async function syncLockScreen(prefs: Preferences, card: Card | null, rotation: RotationState, changed: boolean) {
  if (!prefs.lockScreenEnabled || !card) {
    if (isShownOnLockScreen()) await hideFromLockScreen();
    return;
  }
  // Also restarts the activity after iOS ended it (Live Activities expire after ~8 hours).
  if (changed || !isShownOnLockScreen()) {
    const staleDate = new Date(nextUpdateAt(rotation, prefs.intervalMinutes) + STALE_GRACE_MS);
    await showOnLockScreen(card, staleDate);
  }
}

/** Saves new settings: downloads selected topics, drops the rest, reschedules updates. */
export async function applyPreferences(prefs: Preferences, catalog: TopicSummary[]): Promise<Snapshot> {
  const selected = catalog.filter((t) => prefs.topicIds.includes(t.id));
  await syncPacks(selected);
  await savePreferences(prefs);
  await pruneCachedPacks(prefs.topicIds);
  await updateSchedule(prefs);
  return rotate();
}

/** Turns the lock screen card on/off without re-downloading content. */
export async function setLockScreenEnabled(enabled: boolean): Promise<Snapshot> {
  const prefs = { ...(await loadPreferences()), lockScreenEnabled: enabled };
  await savePreferences(prefs);
  await updateSchedule(prefs);
  return rotate();
}

async function updateSchedule(prefs: Preferences) {
  if (prefs.lockScreenEnabled && prefs.topicIds.length) {
    await scheduleBackgroundRotation(prefs.intervalMinutes);
  } else {
    await cancelBackgroundRotation();
  }
}
