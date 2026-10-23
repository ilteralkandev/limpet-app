// Pure favorites/history logic: no React Native imports, so it runs under `node --test`.
import type { Card } from './rotation';

export type SavedCard = Card & { at: number };

export const HISTORY_LIMIT = 60;

export function isFavorite(list: SavedCard[], factId: string): boolean {
  return list.some((c) => c.factId === factId);
}

/** Adds the card to the front, or removes it if already saved. */
export function toggleFavorite(list: SavedCard[], card: Card, now: number): SavedCard[] {
  if (isFavorite(list, card.factId)) return list.filter((c) => c.factId !== card.factId);
  return [{ ...card, at: now }, ...list];
}

/** Records a shown card; a fact seen again moves to the top instead of repeating. */
export function pushHistory(list: SavedCard[], card: Card, now: number, limit = HISTORY_LIMIT): SavedCard[] {
  if (list[0]?.factId === card.factId) return list;
  return [{ ...card, at: now }, ...list.filter((c) => c.factId !== card.factId)].slice(0, limit);
}
