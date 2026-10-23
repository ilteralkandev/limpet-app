import { readJSON, writeJSON } from '@/lib/storage';

export type Preferences = {
  topicIds: string[];
  intervalMinutes: number;
  lockScreenEnabled: boolean;
};

// iOS background tasks cannot run more often than every 15 minutes.
export const INTERVAL_OPTIONS = [
  { minutes: 15, label: '15 dk' },
  { minutes: 30, label: '30 dk' },
  { minutes: 60, label: '1 saat' },
  { minutes: 180, label: '3 saat' },
  { minutes: 360, label: '6 saat' },
] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  topicIds: [],
  intervalMinutes: 60,
  lockScreenEnabled: true,
};

const KEY = 'prefs:v1';

export async function loadPreferences(): Promise<Preferences> {
  const stored = await readJSON<Partial<Preferences>>(KEY);
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await writeJSON(KEY, prefs);
}
