// Persistence for the user's personal data: favorites, history, counters, streak.
import { pushHistory, toggleFavorite, type SavedCard } from '@/lib/collection';
import type { Card } from '@/lib/rotation';
import { readJSON, writeJSON } from '@/lib/storage';
import { INITIAL_STREAK, recordVisit, type Streak } from '@/lib/streak';

const FAVORITES_KEY = 'library:favorites:v1';
const HISTORY_KEY = 'library:history:v1';
const SEEN_KEY = 'library:seen:v1';
const STREAK_KEY = 'library:streak:v1';

export type Library = {
  favorites: SavedCard[];
  history: SavedCard[];
  seen: number;
  streak: Streak;
};

export async function loadLibrary(): Promise<Library> {
  const [favorites, history, seen, streak] = await Promise.all([
    readJSON<SavedCard[]>(FAVORITES_KEY),
    readJSON<SavedCard[]>(HISTORY_KEY),
    readJSON<number>(SEEN_KEY),
    readJSON<Streak>(STREAK_KEY),
  ]);
  return { favorites: favorites ?? [], history: history ?? [], seen: seen ?? 0, streak: streak ?? INITIAL_STREAK };
}

export async function toggleFavoriteStored(card: Card): Promise<SavedCard[]> {
  const next = toggleFavorite((await readJSON<SavedCard[]>(FAVORITES_KEY)) ?? [], card, Date.now());
  await writeJSON(FAVORITES_KEY, next);
  return next;
}

/** Called whenever a new card reaches the screen (foreground or background). */
export async function recordShown(card: Card): Promise<void> {
  const [history, seen] = await Promise.all([readJSON<SavedCard[]>(HISTORY_KEY), readJSON<number>(SEEN_KEY)]);
  await Promise.all([
    writeJSON(HISTORY_KEY, pushHistory(history ?? [], card, Date.now())),
    writeJSON(SEEN_KEY, (seen ?? 0) + 1),
  ]);
}

export async function recordVisitStored(): Promise<Streak> {
  const next = recordVisit((await readJSON<Streak>(STREAK_KEY)) ?? INITIAL_STREAK, Date.now());
  await writeJSON(STREAK_KEY, next);
  return next;
}
