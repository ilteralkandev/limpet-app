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
 * Interleaves topics round-robin so consecutive cards come from different topics.
 * With a seed, each topic's facts are shuffled per install; the order depends only on
 * (seed, fact id), so adding facts to a pack never reshuffles the ones already seen.
 * Seed 0 keeps the authored order.
 */
export function buildDeck(packs: TopicPack[], seed = 0): Card[] {
  const ordered = packs.map((pack) =>
    seed ? [...pack.facts].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`)) : pack.facts,
  );
  const deck: Card[] = [];
  const longest = Math.max(0, ...ordered.map((facts) => facts.length));
  for (let i = 0; i < longest; i++) {
    packs.forEach((pack, p) => {
      const fact = ordered[p][i];
      if (fact) deck.push({ factId: fact.id, text: fact.text, topicTitle: pack.title, symbol: pack.symbol });
    });
  }
  return deck;
}

export function currentCard(deck: Card[], state: RotationState): Card | null {
  if (!deck.length) return null;
  return deck.find((c) => c.factId === state.factId) ?? deck[0];
}

export function isDue(state: RotationState, intervalMinutes: number, now: number): boolean {
  if (state.factId == null) return true;
  return now - state.shownAt >= intervalMinutes * 60_000 - DUE_TOLERANCE_MS;
}

/** Moves to the card after the current one; an unknown/removed fact restarts the deck. */
export function advance(deck: Card[], state: RotationState, now: number): RotationState {
  if (!deck.length) return { factId: null, shownAt: now };
  const index = deck.findIndex((c) => c.factId === state.factId);
  return { factId: deck[(index + 1) % deck.length].factId, shownAt: now };
}

export function nextUpdateAt(state: RotationState, intervalMinutes: number): number {
  return state.shownAt + intervalMinutes * 60_000;
}
