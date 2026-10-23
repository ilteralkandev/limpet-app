import { CONTENT_BASE_URL } from '@/config';

import type { Manifest, TopicPack, TopicSummary } from './types';
import { assertPackMatches, contentUrl } from './validate';

async function getJSON<T>(path: string, version: number | string): Promise<T> {
  if (!CONTENT_BASE_URL) throw new Error('İçerik adresi tanımlı değil (app.json → extra.contentBaseUrl).');
  const res = await fetch(contentUrl(CONTENT_BASE_URL, path, version));
  if (!res.ok) throw new Error(`${path} indirilemedi (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

export async function fetchManifest(): Promise<Manifest> {
  // The catalog has no version of its own; a per-minute key keeps it fresh without
  // defeating the CDN completely.
  const manifest = await getJSON<Manifest>('index.json', Math.floor(Date.now() / 60_000));
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.topics)) {
    throw new Error('Desteklenmeyen içerik kataloğu biçimi.');
  }
  return manifest;
}

export async function fetchTopicPack(topic: TopicSummary): Promise<TopicPack> {
  const pack = await getJSON<TopicPack>(topic.file, topic.version);
  assertPackMatches(pack, topic);
  return pack;
}
