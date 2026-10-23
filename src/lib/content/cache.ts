import { keysWithPrefix, readJSON, removeKeys, writeJSON } from '@/lib/storage';

import { fetchManifest, fetchTopicPack } from './api';
import type { Manifest, TopicPack, TopicSummary } from './types';

const MANIFEST_KEY = 'content:manifest';
const PACK_PREFIX = 'content:pack:';
const packKey = (id: string) => `${PACK_PREFIX}${id}`;

/** Fetches the topic catalog, falling back to the last cached copy when offline. */
export async function loadManifest(): Promise<{ manifest: Manifest; offline: boolean }> {
  try {
    const manifest = await fetchManifest();
    await writeJSON(MANIFEST_KEY, manifest);
    return { manifest, offline: false };
  } catch (error) {
    const cached = await readJSON<Manifest>(MANIFEST_KEY);
    if (cached) return { manifest: cached, offline: true };
    throw error;
  }
}

/** Downloads packs that are missing or older than the catalog version. */
export async function syncPacks(topics: TopicSummary[]): Promise<TopicPack[]> {
  return Promise.all(
    topics.map(async (topic) => {
      const cached = await readJSON<TopicPack>(packKey(topic.id));
      if (cached && cached.version >= topic.version) return cached;
      const pack = await fetchTopicPack(topic);
      await writeJSON(packKey(topic.id), pack);
      return pack;
    }),
  );
}

/** Reads already-downloaded packs; never touches the network (safe for background tasks). */
export async function loadCachedPacks(ids: string[]): Promise<TopicPack[]> {
  const packs = await Promise.all(ids.map((id) => readJSON<TopicPack>(packKey(id))));
  return packs.filter((p): p is TopicPack => p != null);
}

/** Deletes packs of topics the user no longer follows. */
export async function pruneCachedPacks(keepIds: string[]): Promise<void> {
  const keep = new Set(keepIds.map(packKey));
  const stale = (await keysWithPrefix(PACK_PREFIX)).filter((k) => !keep.has(k));
  await removeKeys(stale);
}
