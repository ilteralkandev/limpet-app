import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TopicPack, TopicSummary } from './types.ts';
import { assertPackMatches, contentUrl } from './validate.ts';

const topic: TopicSummary = {
  id: 'software',
  title: 'Yazılım',
  description: '',
  symbol: 'star',
  file: 'topics/software.json',
  version: 2,
  count: 1,
};
const pack = (over: Partial<TopicPack> = {}): TopicPack => ({
  id: 'software',
  title: 'Yazılım',
  symbol: 'star',
  version: 2,
  facts: [{ id: 'software-001', text: 'x' }],
  ...over,
});

describe('contentUrl', () => {
  it('puts the version in the URL so each version has its own cache entry', () => {
    assert.equal(contentUrl('https://a.app', 'topics/software.json', 2), 'https://a.app/topics/software.json?v=2');
    assert.notEqual(contentUrl('https://a.app', 'x.json', 1), contentUrl('https://a.app', 'x.json', 2));
  });
});

describe('assertPackMatches', () => {
  it('accepts the promised version, or a newer one published in the meantime', () => {
    assert.doesNotThrow(() => assertPackMatches(pack(), topic));
    assert.doesNotThrow(() => assertPackMatches(pack({ version: 3 }), topic));
  });

  it('rejects a stale pack instead of caching it as up to date', () => {
    assert.throws(() => assertPackMatches(pack({ version: 1 }), topic), /güncel değil \(v1, beklenen v2\)/);
  });

  it('rejects the wrong topic and malformed packs', () => {
    assert.throws(() => assertPackMatches(pack({ id: 'finance' }), topic), /beklenen biçimde değil/);
    assert.throws(() => assertPackMatches(undefined, topic), /beklenen biçimde değil/);
    assert.throws(() => assertPackMatches({ ...pack(), facts: undefined } as unknown as TopicPack, topic));
  });
});
