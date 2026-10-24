// Pure checks for downloaded content: no React Native imports, so it runs under `node --test`.
import type { TopicPack, TopicSummary } from './types.ts';

/**
 * Content URLs carry the version, so a new version is a new URL and no HTTP cache
 * (iOS keeps responses for the host's `max-age`) can serve an outdated file for it.
 */
export function contentUrl(base: string, path: string, version: number | string): string {
  return `${base}/${path}?v=${version}`;
}

/** Throws unless the downloaded pack is the topic the catalog promised, at least at its version. */
export function assertPackMatches(pack: TopicPack | undefined, topic: TopicSummary): asserts pack is TopicPack {
  if (pack?.id !== topic.id || !Array.isArray(pack.facts)) {
    throw new Error(`${topic.file} beklenen biçimde değil.`);
  }
  // An older pack than the catalog means a stale copy was served; storing it would hide the update.
  if (pack.version < topic.version) {
    throw new Error(`${topic.file} güncel değil (v${pack.version}, beklenen v${topic.version}).`);
  }
}

const MAX_FACT_CHARS = 400; // generous: content is capped at 160, this only stops absurd payloads
const MAX_FACTS_PER_PACK = 5000;
const TOPIC_FILE = /^topics\/[a-z0-9-]+\.json$/;

/**
 * Keeps only well-formed facts. A bad pack must never crash the app: it is cached, so a single
 * malformed entry (say a non-string text) would otherwise fail on every launch.
 */
export function sanitizePack(pack: TopicPack, topic: TopicSummary): TopicPack {
  assertPackMatches(pack, topic);
  const facts = pack.facts
    .slice(0, MAX_FACTS_PER_PACK)
    .filter(
      (f) =>
        typeof f?.id === 'string' &&
        typeof f.text === 'string' &&
        f.text.trim().length > 0 &&
        f.text.length <= MAX_FACT_CHARS,
    );
  if (!facts.length) throw new Error(`${topic.file} geçerli bilgi içermiyor.`);
  return { ...pack, facts };
}

/** Drops catalog entries that are malformed or point outside `topics/`. */
export function sanitizeTopics(topics: unknown[]): TopicSummary[] {
  return topics.filter((t): t is TopicSummary => {
    const topic = t as Partial<TopicSummary> | null;
    return (
      typeof topic?.id === 'string' &&
      typeof topic.title === 'string' &&
      typeof topic.symbol === 'string' &&
      typeof topic.file === 'string' &&
      TOPIC_FILE.test(topic.file) &&
      Number.isInteger(topic.version) &&
      typeof topic.count === 'number'
    );
  });
}
