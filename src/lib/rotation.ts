// Pure rotation logic: no React Native imports, so it runs under `node --test`.
import type { TopicPack } from './content/types';

export type Card = {
  factId: string;
  text: string;
  topicTitle: string;
  symbol: string;
};

/** What is on the lock screen right now. Keyed by fact id so the deck can change underneath. */
export type RotationState = {
  factId: string | null;
  shownAt: number;
};

export const INITIAL_ROTATION: RotationState = { factId: null, shownAt: 0 };

// Timers and background tasks can fire slightly early; don't skip a turn because of that.
const DUE_TOLERANCE_MS = 30_000;

/** FNV-1a: a stable, dependency-free hash for ordering facts. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Mixes topics so nothing repeats in a visible pattern: each round takes one fact per topic,
 * but the topic order within a round is shuffled per seed. Facts inside a topic are shuffled
 * too; both orders depend only on (seed, ids), so a pack growing never reshuffles old facts.
 * Seed 0 keeps the authored order (tests).
 */
export function buildDeck(packs: TopicPack[], seed = 0): Card[] {
  // Hash each key once (decorate-sort-undecorate): sorting 1,000 facts would otherwise hash ~20,000 times.
  const ordered = packs.map((pack) =>
    seed
      ? pack.facts
          .map((fact) => ({ fact, key: hash(`${seed}:${fact.id}`) }))
          .sort((a, b) => a.key - b.key)
          .map((entry) => entry.fact)
      : pack.facts,
  );
  const deck: Card[] = [];
  const longest = Math.max(0, ...ordered.map((facts) => facts.length));
  for (let i = 0; i < longest; i++) {
    // Only packs that still have a fact this round take part (the big ones run on alone later).
    const round = ordered.flatMap((facts, p) => (facts.length > i ? [p] : []));
    if (seed && round.length > 1) {
      const keys = new Map(round.map((p) => [p, hash(`${seed}:${i}:${packs[p].id}`)]));
      round.sort((a, b) => keys.get(a)! - keys.get(b)!);
    }
    for (const p of round) {
      const fact = ordered[p][i];
      if (fact) deck.push({ factId: fact.id, text: fact.text, topicTitle: packs[p].title, symbol: packs[p].symbol });
    }
  }
  return deck;
}

export function currentCard(deck: Card[], state: RotationState): Card | null {
  if (!deck.length) return null;
  return deck.find((c) => c.factId === state.factId) ?? deck[0];
}

export function isDue(state: RotationState, intervalMinutes: number, now: number): boolean {
  return dueSteps(state, intervalMinutes, now) > 0;
}

/**
 * How many whole intervals have passed since the card was shown (0 = not due yet).
 * The deck is a timeline: a card per interval, whether or not the app was open for it.
 */
export function dueSteps(state: RotationState, intervalMinutes: number, now: number): number {
  if (state.factId == null) return 1;
  return Math.max(0, Math.floor((now - state.shownAt + DUE_TOLERANCE_MS) / (intervalMinutes * 60_000)));
}

/**
 * Moves `steps` cards forward and stamps the new card with `shownAt`; an unknown/removed
 * fact restarts the deck at its first card.
 */
export function advance(deck: Card[], state: RotationState, shownAt: number, steps = 1): RotationState {
  if (!deck.length) return { factId: null, shownAt };
  const index = deck.findIndex((c) => c.factId === state.factId);
  return { factId: deck[(index + steps) % deck.length].factId, shownAt };
}

export type PlannedNotification = { at: number; card: Card };

/**
 * The next cards on the timeline as local notifications: card k+1 after the current one is due
 * k intervals after it was shown. Slots that `isQuiet` rejects (e.g. at night) are skipped, but
 * their cards still pass, so the app and the notifications always agree on the position.
 */
export function planNotifications(
  deck: Card[],
  state: RotationState,
  intervalMinutes: number,
  now: number,
  { limit = 60, isQuiet = (_at: Date) => false }: { limit?: number; isQuiet?: (at: Date) => boolean } = {},
): PlannedNotification[] {
  const start = deck.findIndex((c) => c.factId === state.factId);
  if (start < 0) return [];
  const planned: PlannedNotification[] = [];
  for (let k = 1; planned.length < limit && k <= limit * 4; k++) {
    const at = state.shownAt + k * intervalMinutes * 60_000;
    if (at <= now || isQuiet(new Date(at))) continue;
    planned.push({ at, card: deck[(start + k) % deck.length] });
  }
  return planned;
}

export function nextUpdateAt(state: RotationState, intervalMinutes: number): number {
  return state.shownAt + intervalMinutes * 60_000;
}
