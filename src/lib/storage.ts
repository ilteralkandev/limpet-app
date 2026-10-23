import AsyncStorage from '@react-native-async-storage/async-storage';

// Thin JSON wrapper so the backing store (AsyncStorage today, MMKV later)
// can be swapped without touching callers.

export async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

export async function keysWithPrefix(prefix: string): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(prefix));
}
