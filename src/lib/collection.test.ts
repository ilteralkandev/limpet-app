import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isFavorite, pushHistory, toggleFavorite, type SavedCard } from './collection.ts';
import type { Card } from './rotation.ts';

const card = (id: string): Card => ({ factId: id, text: id, topicTitle: 't', symbol: 'star' });

describe('toggleFavorite', () => {
  it('adds new favorites to the front with a timestamp', () => {
    const list = toggleFavorite(toggleFavorite([], card('a'), 1), card('b'), 2);
    assert.deepEqual(
      list.map((c) => [c.factId, c.at]),
      [
        ['b', 2],
        ['a', 1],
      ],
    );
  });

  it('removes an existing favorite', () => {
    const list = toggleFavorite([{ ...card('a'), at: 1 }], card('a'), 2);
    assert.equal(isFavorite(list, 'a'), false);
  });
});

describe('pushHistory', () => {
  it('ignores the same card shown twice in a row', () => {
    const list: SavedCard[] = [{ ...card('a'), at: 1 }];
    assert.equal(pushHistory(list, card('a'), 2), list);
  });

  it('moves a re-shown fact to the top instead of duplicating it', () => {
    const list = [card('b'), card('a')].map((c, i) => ({ ...c, at: i }));
    assert.deepEqual(
      pushHistory(list, card('a'), 9).map((c) => c.factId),
      ['a', 'b'],
    );
  });

  it('caps the list length', () => {
    let list: SavedCard[] = [];
    for (let i = 0; i < 5; i++) list = pushHistory(list, card(`f${i}`), i, 3);
    assert.deepEqual(
      list.map((c) => c.factId),
      ['f4', 'f3', 'f2'],
    );
  });
});
