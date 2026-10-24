import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TopicPack } from './content/types.ts';
import { advance, buildDeck, currentCard, dueSteps, INITIAL_ROTATION, isDue, planNotifications } from './rotation.ts';

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

  it('shuffles topic order within each round but keeps every topic in every round', () => {
    const packs = ['a', 'b', 'c', 'd'].map((id) => pack(id, 12));
    const deck = buildDeck(packs, 11).map((c) => c.factId.split('-')[0]);
    const rounds = Array.from({ length: 12 }, (_, i) => deck.slice(i * 4, i * 4 + 4));
    assert.ok(rounds.every((r) => new Set(r).size === 4));
    assert.ok(new Set(rounds.map((r) => r.join(''))).size > 3, 'topic order should vary between rounds');
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

describe('dueSteps', () => {
  const hour = 60 * 60_000;
  const state = { factId: 'a-0', shownAt: 0 };

  it('counts the whole intervals that passed while the app was away', () => {
    assert.equal(dueSteps(state, 60, 3 * hour + 10 * 60_000), 3);
    assert.equal(dueSteps(state, 60, 30 * 60_000), 0);
  });
});

describe('advance by several steps', () => {
  it('skips the cards that were already delivered', () => {
    const deck = buildDeck([pack('a', 5)]);
    assert.equal(advance(deck, { factId: 'a-1', shownAt: 0 }, 9, 3).factId, 'a-4');
    assert.equal(advance(deck, { factId: 'a-3', shownAt: 0 }, 9, 4).factId, 'a-2');
  });
});

describe('planNotifications', () => {
  const hour = 60 * 60_000;
  const deck = buildDeck([pack('a', 10)]);
  const state = { factId: 'a-2', shownAt: 0 };

  it('plans one notification per interval, following the deck', () => {
    const plan = planNotifications(deck, state, 60, 0, { limit: 3 });
    assert.deepEqual(plan.map((p) => p.card.factId), ['a-3', 'a-4', 'a-5']);
    assert.deepEqual(plan.map((p) => p.at), [hour, 2 * hour, 3 * hour]);
  });

  it('keeps the position of quiet slots so the app and notifications stay in step', () => {
    const quiet = (at: Date) => at.getTime() === 2 * hour;
    const plan = planNotifications(deck, state, 60, 0, { limit: 3, isQuiet: quiet });
    assert.deepEqual(plan.map((p) => p.card.factId), ['a-3', 'a-5', 'a-6']);
  });

  it('plans nothing when the current card is not in the deck', () => {
    assert.deepEqual(planNotifications(deck, { factId: 'gone', shownAt: 0 }, 60, 0), []);
  });
});
