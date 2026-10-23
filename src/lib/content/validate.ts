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
