import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TopicPack } from './content/types.ts';
import { advance, buildDeck, currentCard, INITIAL_ROTATION, isDue } from './rotation.ts';

const pack = (id: string, n: number): TopicPack => ({
  id,
  title: id,
  symbol: 'star',
  version: 1,
  facts: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i}`, text: `${id} ${i}` })),
});

describe('buildDeck', () => {
  it('interleaves topics round-robin', () => {
    const ids = buildDeck([pack('a', 3), pack('b', 1)]).map((c) => c.factId);
    assert.deepEqual(ids, ['a-0', 'b-0', 'a-1', 'a-2']);
  });

  it('shuffles per seed, deterministically, without losing facts', () => {
    const a = buildDeck([pack('a', 20), pack('b', 20)], 7).map((c) => c.factId);
    assert.deepEqual(a, buildDeck([pack('a', 20), pack('b', 20)], 7).map((c) => c.factId));
    assert.notDeepEqual(a, buildDeck([pack('a', 20), pack('b', 20)]).map((c) => c.factId));
    assert.equal(new Set(a).size, 40);
  });

  it('keeps the relative order of old facts when a pack grows', () => {
    const before = buildDeck([pack('a', 10)], 7).map((c) => c.factId);
    const after = buildDeck([pack('a', 15)], 7).map((c) => c.factId).filter((id) => before.includes(id));
    assert.deepEqual(after, before);
  });

  it('is empty without packs', () => {
    assert.deepEqual(buildDeck([]), []);
  });
});

describe('advance', () => {
  const deck = buildDeck([pack('a', 2), pack('b', 1)]);

  it('starts at the first card', () => {
    assert.equal(advance(deck, INITIAL_ROTATION, 5).factId, 'a-0');
  });

  it('wraps around at the end', () => {
    assert.equal(advance(deck, { factId: 'a-1', shownAt: 0 }, 5).factId, 'a-0');
  });

  it('restarts when the current fact was removed from the deck', () => {
    assert.equal(advance(deck, { factId: 'gone', shownAt: 0 }, 5).factId, 'a-0');
  });

  it('records when the card was shown', () => {
    assert.equal(advance(deck, INITIAL_ROTATION, 1234).shownAt, 1234);
  });
});

describe('currentCard', () => {
  it('falls back to the first card for unknown ids', () => {
    const deck = buildDeck([pack('a', 2)]);
    assert.equal(currentCard(deck, { factId: 'x', shownAt: 0 })?.factId, 'a-0');
    assert.equal(currentCard([], INITIAL_ROTATION), null);
  });
});

describe('isDue', () => {
  const hour = 60 * 60_000;

  it('is due when nothing has been shown yet', () => {
    assert.equal(isDue(INITIAL_ROTATION, 60, 0), true);
  });

  it('waits for the interval, tolerating timers that fire a little early', () => {
    const state = { factId: 'a-0', shownAt: 0 };
    assert.equal(isDue(state, 60, hour - 5 * 60_000), false);
    assert.equal(isDue(state, 60, hour - 10_000), true);
  });
});
