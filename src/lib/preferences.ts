import { readJSON, writeJSON } from '@/lib/storage';

export type Preferences = {
  topicIds: string[];
  intervalMinutes: number;
  lockScreenEnabled: boolean;
};

export const INTERVAL_OPTIONS = [
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
  const prefs = { ...DEFAULT_PREFERENCES, ...stored };
  // Older versions offered 15/30 minutes; snap anything unknown to the shortest current option.
  if (!INTERVAL_OPTIONS.some((o) => o.minutes === prefs.intervalMinutes)) prefs.intervalMinutes = INTERVAL_OPTIONS[0].minutes;
  return prefs;
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await writeJSON(KEY, prefs);
}
