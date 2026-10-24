// Single entry point for "what card is showing and is the lock screen in sync".
// Used by the UI and by the background task, so it must not depend on React.
import { hideFromLockScreen, isShownOnLockScreen, showOnLockScreen } from '@/live-activity';
import { loadCachedPacks, loadManifest, pruneCachedPacks, syncPacks } from '@/lib/content/cache';
import type { TopicSummary } from '@/lib/content/types';
import { recordShown } from '@/lib/library';
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
const DECK_SEED_KEY = 'deck:seed';
const CONTENT_CHECKED_AT_KEY = 'content:checkedAt';
// New packs reach users within this window after being published.
const CONTENT_CHECK_INTERVAL_MS = 6 * 60 * 60_000;
// Mark the lock screen card stale if it misses its update by this much.
const STALE_GRACE_MS = 15 * 60_000;

export type Snapshot = {
  card: Card | null;
  shownAt: number | null;
  nextUpdateAt: number | null;
  /** 1-based position of the card in the deck. */
  position: number;
  deckSize: number;
  lockScreenError: string | null;
};

type RotateOptions = {
  /** Skip to the next card even if its interval has not passed. */
  force?: boolean;
  /** Push the current card to the lock screen even if it did not change (e.g. new interval). */
  refreshLockScreen?: boolean;
};

/** Per-install seed so every device walks the facts in its own order. Created once. */
async function deckSeed(): Promise<number> {
  const stored = await readJSON<number>(DECK_SEED_KEY);
  if (stored) return stored;
  const seed = Math.floor(Math.random() * 2 ** 31) + 1;
  await writeJSON(DECK_SEED_KEY, seed);
  return seed;
}

/**
 * Advances to the next card when its interval has passed (or when forced),
 * then makes sure the lock screen shows the current card. Offline-only.
 */
export async function rotate({ force = false, refreshLockScreen = false }: RotateOptions = {}): Promise<Snapshot> {
  const prefs = await loadPreferences();
  const deck = buildDeck(await loadCachedPacks(prefs.topicIds), await deckSeed());
  let rotation = (await readJSON<RotationState>(ROTATION_KEY)) ?? INITIAL_ROTATION;
  const now = Date.now();

  const factStillInDeck = deck.some((c) => c.factId === rotation.factId);
  const advanced = deck.length > 0 && (force || !factStillInDeck || isDue(rotation, prefs.intervalMinutes, now));
  if (advanced) {
    rotation = advance(deck, rotation, now);
    await writeJSON(ROTATION_KEY, rotation);
  }

  const shown = currentCard(deck, rotation);
  if (advanced && shown) await recordShown(shown);

  const position = shown ? deck.findIndex((c) => c.factId === shown.factId) + 1 : 0;
  const nextAt = nextUpdateAt(rotation, prefs.intervalMinutes);
  let lockScreenError: string | null = null;
  try {
    await syncLockScreen(prefs, shown, {
      nextAt,
      position: `${position}/${deck.length}`,
      changed: advanced || refreshLockScreen,
    });
  } catch (error) {
    lockScreenError = error instanceof Error ? error.message : String(error);
  }

  return {
    card: shown,
    shownAt: shown ? rotation.shownAt : null,
    nextUpdateAt: shown ? nextAt : null,
    position,
    deckSize: deck.length,
    lockScreenError,
  };
}

async function syncLockScreen(
  prefs: Preferences,
  card: Card | null,
  { changed, nextAt, position }: { changed: boolean; nextAt: number; position: string },
) {
  if (!prefs.lockScreenEnabled || !card) {
    if (isShownOnLockScreen()) await hideFromLockScreen();
    return;
  }
  // Also restarts the activity after iOS ended it (Live Activities expire after ~8 hours).
  if (changed || !isShownOnLockScreen()) {
    await showOnLockScreen(card, position, new Date(nextAt + STALE_GRACE_MS));
  }
}

/** Saves new settings: downloads selected topics, drops the rest, reschedules updates. */
export async function applyPreferences(prefs: Preferences, catalog: TopicSummary[]): Promise<Snapshot> {
  const selected = catalog.filter((t) => prefs.topicIds.includes(t.id));
  await syncPacks(selected);
  await savePreferences(prefs);
  await pruneCachedPacks(prefs.topicIds);
  await updateSchedule(prefs);
  return rotate({ refreshLockScreen: true });
}

/**
 * Fetches the catalog and downloads packs of followed topics that have a newer version.
 * Always compares against a fresh catalog; throws when offline so callers never report a
 * stale "up to date". Returns how many packs were downloaded.
 */
export async function updateContentNow(): Promise<number> {
  const prefs = await loadPreferences();
  const { manifest, offline } = await loadManifest();
  if (offline) throw new Error('İnternet bağlantısı yok; paketler güncellenemedi.');
  const { downloaded } = await syncPacks(manifest.topics.filter((t) => prefs.topicIds.includes(t.id)));
  await writeJSON(CONTENT_CHECKED_AT_KEY, Date.now());
  // New facts reshuffle the deck; push the current card only if something actually changed.
  if (downloaded > 0) await rotate({ refreshLockScreen: true });
  return downloaded;
}

/** Throttled, silent variant for app start / foreground. Returns true when packs were updated. */
export async function updateContentIfStale(): Promise<boolean> {
  const checkedAt = (await readJSON<number>(CONTENT_CHECKED_AT_KEY)) ?? 0;
  if (Date.now() - checkedAt < CONTENT_CHECK_INTERVAL_MS) return false;
  if (!(await loadPreferences()).topicIds.length) return false;
  try {
    return (await updateContentNow()) > 0;
  } catch {
    return false; // offline or host down: keep playing from the cache, retry next time
  }
}

/** Turns the lock screen card on/off without re-downloading content. */
export async function setLockScreenEnabled(enabled: boolean): Promise<Snapshot> {
  const prefs = { ...(await loadPreferences()), lockScreenEnabled: enabled };
  await savePreferences(prefs);
  await updateSchedule(prefs);
  return rotate({ refreshLockScreen: true });
}

async function updateSchedule(prefs: Preferences) {
  if (prefs.lockScreenEnabled && prefs.topicIds.length) {
    await scheduleBackgroundRotation(prefs.intervalMinutes);
  } else {
    await cancelBackgroundRotation();
  }
}
