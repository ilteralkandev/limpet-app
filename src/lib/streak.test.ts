import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayKey, INITIAL_STREAK, recordVisit } from './streak.ts';

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();

describe('recordVisit', () => {
  it('starts a streak on the first visit', () => {
    assert.deepEqual(recordVisit(INITIAL_STREAK, at(1)), { current: 1, best: 1, lastDay: dayKey(at(1)) });
  });

  it('counts a visit once per day', () => {
    const first = recordVisit(INITIAL_STREAK, at(1, 8));
    assert.equal(recordVisit(first, at(1, 23)), first);
  });

  it('grows on consecutive days, even across midnight', () => {
    const s = recordVisit(recordVisit(INITIAL_STREAK, at(1, 23)), at(2, 0));
    assert.equal(s.current, 2);
  });

  it('resets after a missed day but keeps the best run', () => {
    let s = INITIAL_STREAK;
    for (const d of [1, 2, 3]) s = recordVisit(s, at(d));
    s = recordVisit(s, at(5));
    assert.deepEqual([s.current, s.best], [1, 3]);
  });

  it('handles month boundaries', () => {
    const s = recordVisit(recordVisit(INITIAL_STREAK, new Date(2026, 9, 31, 12).getTime()), at(32));
    assert.equal(s.current, 2);
  });
});
