// Single entry point for "what card is showing and is the lock screen in sync".
// Used by the UI and by the background task, so it must not depend on React.
import { hideFromLockScreen, isShownOnLockScreen, showOnLockScreen } from '@/live-activity';
import { loadCachedPacks, loadManifest, pruneCachedPacks, syncPacks } from '@/lib/content/cache';
import type { TopicPack, TopicSummary } from '@/lib/content/types';
import { recordShown } from '@/lib/library';
import { isLiveActive, loadPreferences, savePreferences, surfaces, type Preferences } from '@/lib/preferences';
import {
  advance,
  buildDeck,
  currentCard,
  dueSteps,
  INITIAL_ROTATION,
  nextUpdateAt,
  planNotifications,
  type Card,
  type RotationState,
} from '@/lib/rotation';
import {
  isQuietHour,
  NOTIFICATION_LIMIT,
  notificationsAllowed,
  requestNotificationPermission,
  scheduleNotifications,
} from '@/lib/notifications';
import { readJSON, writeJSON } from '@/lib/storage';
import { cancelBackgroundRotation, scheduleBackgroundRotation } from '@/tasks/rotate-task';

const ROTATION_KEY = 'rotation:v1';
const DECK_SEED_KEY = 'deck:seed';
const NOTIFICATION_PLAN_KEY = 'notifications:plan';
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

// The deck is rebuilt only when its inputs change; rotate() runs every 30 s while the app is open.
let deckMemo: { key: string; deck: Card[] } | null = null;
function deckFor(packs: TopicPack[], seed: number): Card[] {
  const key = `${seed}|${packs.map((p) => `${p.id}@${p.version}:${p.facts.length}`).join(',')}`;
  if (deckMemo?.key !== key) deckMemo = { key, deck: buildDeck(packs, seed) };
  return deckMemo.deck;
}

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
  const deck = deckFor(await loadCachedPacks(prefs.topicIds), await deckSeed());
  let rotation = (await readJSON<RotationState>(ROTATION_KEY)) ?? INITIAL_ROTATION;
  const now = Date.now();

  const factStillInDeck = deck.some((c) => c.factId === rotation.factId);
  // The deck is a timeline: one card per interval, even if the app was closed for some of them.
  const steps = factStillInDeck ? dueSteps(rotation, prefs.intervalMinutes, now) : 1;
  const advanced = deck.length > 0 && (force || !factStillInDeck || steps > 0);
  if (advanced) {
    const onTimeline = !force && factStillInDeck;
    const shownAt = onTimeline ? rotation.shownAt + steps * prefs.intervalMinutes * 60_000 : now;
    rotation = advance(deck, rotation, shownAt, onTimeline ? steps : 1);
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

  try {
    await syncNotifications(prefs, deck, rotation, now, advanced || refreshLockScreen);
  } catch {
    // Notifications are a bonus; never let them break the card.
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

/** Reschedules only when the timeline moved, so the 30-second foreground poll stays cheap. */
async function syncNotifications(
  prefs: Preferences,
  deck: Card[],
  rotation: RotationState,
  now: number,
  changed: boolean,
) {
  const signature = prefs.notificationsEnabled
    ? `${rotation.factId}:${rotation.shownAt}:${prefs.intervalMinutes}:${deck.length}`
    : 'off';
  if (!changed && (await readJSON<string>(NOTIFICATION_PLAN_KEY)) === signature) return;
  const allowed = prefs.notificationsEnabled && (await notificationsAllowed());
  const plan = allowed
    ? planNotifications(deck, rotation, prefs.intervalMinutes, now, { limit: NOTIFICATION_LIMIT, isQuiet: isQuietHour })
    : [];
  await scheduleNotifications(plan);
  await writeJSON(NOTIFICATION_PLAN_KEY, signature);
}

async function syncLockScreen(
  prefs: Preferences,
  card: Card | null,
  { changed, nextAt, position }: { changed: boolean; nextAt: number; position: string },
) {
  if (!isLiveActive(prefs) || !card) {
    if (isShownOnLockScreen()) await hideFromLockScreen();
    return;
  }
  // Also restarts the activity after iOS ended it (Live Activities expire after ~8 hours).
  if (changed || !isShownOnLockScreen()) {
    await showOnLockScreen(card, position, new Date(nextAt + STALE_GRACE_MS), surfaces(prefs));
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

/** Turns the lock screen / Dynamic Island presentations on or off without re-downloading content. */
export async function setSurfacesEnabled(
  change: Partial<Pick<Preferences, 'lockScreenEnabled' | 'islandEnabled' | 'islandCapable'>>,
): Promise<Snapshot> {
  const prefs = { ...(await loadPreferences()), ...change };
  await savePreferences(prefs);
  await updateSchedule(prefs);
  return rotate({ refreshLockScreen: true });
}

/**
 * Turns notifications on (asking iOS for permission) or off. Returns whether they ended up on:
 * false when the user declined, in which case nothing is saved.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<{ enabled: boolean; snapshot: Snapshot }> {
  const allowed = enabled ? await requestNotificationPermission() : false;
  const prefs = { ...(await loadPreferences()), notificationsEnabled: enabled && allowed };
  await savePreferences(prefs);
  return { enabled: prefs.notificationsEnabled, snapshot: await rotate({ refreshLockScreen: true }) };
}

async function updateSchedule(prefs: Preferences) {
  if (isLiveActive(prefs) && prefs.topicIds.length) {
    await scheduleBackgroundRotation(prefs.intervalMinutes);
  } else {
    await cancelBackgroundRotation();
  }
}
