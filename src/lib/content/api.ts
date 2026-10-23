import { CONTENT_BASE_URL } from '@/config';

import type { Manifest, TopicPack, TopicSummary } from './types';

async function getJSON<T>(path: string): Promise<T> {
  if (!CONTENT_BASE_URL) throw new Error('İçerik adresi tanımlı değil (app.json → extra.contentBaseUrl).');
  const res = await fetch(`${CONTENT_BASE_URL}/${path}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${path} indirilemedi (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

export async function fetchManifest(): Promise<Manifest> {
  const manifest = await getJSON<Manifest>('index.json');
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.topics)) {
    throw new Error('Desteklenmeyen içerik kataloğu biçimi.');
  }
  return manifest;
}

export async function fetchTopicPack(topic: TopicSummary): Promise<TopicPack> {
  const pack = await getJSON<TopicPack>(topic.file);
  if (pack?.id !== topic.id || !Array.isArray(pack.facts)) {
    throw new Error(`${topic.file} beklenen biçimde değil.`);
  }
  return pack;
}
