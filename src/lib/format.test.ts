import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { greeting, relativeTime } from './format.ts';

const now = new Date(2026, 9, 23, 15, 0).getTime();
const ago = (minutes: number) => now - minutes * 60_000;

describe('relativeTime', () => {
  it('formats recent moments', () => {
    assert.equal(relativeTime(ago(0), now), 'az önce');
    assert.equal(relativeTime(ago(12), now), '12 dk önce');
    assert.equal(relativeTime(ago(180), now), '3 sa önce');
  });

  it('switches to days across midnight, not after 24 hours', () => {
    assert.equal(relativeTime(new Date(2026, 9, 22, 23, 30).getTime(), now), 'dün');
    assert.equal(relativeTime(new Date(2026, 9, 19, 9, 0).getTime(), now), '4 gün önce');
  });
});

describe('greeting', () => {
  it('follows the time of day', () => {
    assert.equal(greeting(new Date(2026, 9, 23, 8).getTime()), 'Günaydın');
    assert.equal(greeting(new Date(2026, 9, 23, 21).getTime()), 'İyi akşamlar');
  });
});
