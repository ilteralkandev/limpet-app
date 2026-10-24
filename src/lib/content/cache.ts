import { keysWithPrefix, readJSON, removeKeys, writeJSON } from '@/lib/storage';

import { fetchManifest, fetchTopicPack } from './api';
import type { Manifest, TopicPack, TopicSummary } from './types';

const MANIFEST_KEY = 'content:manifest';
const PACK_PREFIX = 'content:pack:';
const packKey = (id: string) => `${PACK_PREFIX}${id}`;

// Parsed packs stay in memory: the app re-reads them every 30 s and a pack can be 200 KB of JSON.
// Written only through this module, so entries are replaced whenever a pack is downloaded or pruned.
const memory = new Map<string, TopicPack>();

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
export async function syncPacks(topics: TopicSummary[]): Promise<{ packs: TopicPack[]; downloaded: number }> {
  let downloaded = 0;
  const packs = await Promise.all(
    topics.map(async (topic) => {
      const cached = memory.get(topic.id) ?? (await readJSON<TopicPack>(packKey(topic.id)));
      if (cached && cached.version >= topic.version) {
        memory.set(topic.id, cached);
        return cached;
      }
      const pack = await fetchTopicPack(topic);
      await writeJSON(packKey(topic.id), pack);
      memory.set(topic.id, pack);
      downloaded++;
      return pack;
    }),
  );
  return { packs, downloaded };
}

/** Reads already-downloaded packs; never touches the network (safe for background tasks). */
export async function loadCachedPacks(ids: string[]): Promise<TopicPack[]> {
  const packs = await Promise.all(
    ids.map(async (id) => {
      const cached = memory.get(id);
      if (cached) return cached;
      const stored = await readJSON<TopicPack>(packKey(id));
      if (stored) memory.set(id, stored);
      return stored;
    }),
  );
  return packs.filter((p): p is TopicPack => p != null);
}

/** Deletes packs of topics the user no longer follows. */
export async function pruneCachedPacks(keepIds: string[]): Promise<void> {
  const keep = new Set(keepIds.map(packKey));
  const stale = (await keysWithPrefix(PACK_PREFIX)).filter((k) => !keep.has(k));
  for (const key of stale) memory.delete(key.slice(PACK_PREFIX.length));
  await removeKeys(stale);
}
