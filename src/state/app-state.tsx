import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

import { isFavorite } from '@/lib/collection';
import type { TopicSummary } from '@/lib/content/types';
import {
  applyPreferences,
  rotate,
  setNotificationsEnabled,
  setSurfacesEnabled,
  updateContentIfStale,
  updateContentNow,
  type Snapshot,
} from '@/lib/engine';
import { loadLibrary, recordVisitStored, toggleFavoriteStored, type Library } from '@/lib/library';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences as storePreferences,
  type Preferences,
} from '@/lib/preferences';
import type { Card } from '@/lib/rotation';
import { INITIAL_STREAK } from '@/lib/streak';

// While the app is open, check this often whether the card is due.
const FOREGROUND_POLL_MS = 30_000;
// Top safe-area inset: Dynamic Island phones report 59pt, notch phones 47–50pt.
const DYNAMIC_ISLAND_MIN_INSET = 55;

type AppStateValue = {
  ready: boolean;
  prefs: Preferences;
  snapshot: Snapshot | null;
  library: Library;
  /** Re-reads storage and advances the card if it is due. */
  refresh: () => Promise<void>;
  /** Skips to the next card right away. */
  next: () => Promise<void>;
  /** Returns whether the card is a favorite after toggling. */
  toggleFavorite: (card: Card) => Promise<boolean>;
  /** Downloads topics and saves settings; throws on network errors. */
  savePreferences: (prefs: Preferences, catalog: TopicSummary[]) => Promise<void>;
  /** Turns the whole Live Activity (lock screen and Dynamic Island) on or off. */
  setLockScreen: (enabled: boolean) => Promise<void>;
  /** Toggles the lock screen and Dynamic Island presentations independently. */
  setSurfaces: (change: { lockScreenEnabled?: boolean; islandEnabled?: boolean }) => Promise<void>;
  /** Turns notifications on/off (asks iOS for permission). Resolves to whether they are on. */
  setNotifications: (enabled: boolean) => Promise<boolean>;
  /** Checks the host for newer packs now. Returns how many were downloaded; throws when offline. */
  updateContent: () => Promise<number>;
};

const EMPTY_LIBRARY: Library = { favorites: [], history: [], seen: 0, streak: INITIAL_STREAK };

const Context = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [library, setLibrary] = useState(EMPTY_LIBRARY);
  // Serializes engine calls so a poll can't race a user action.
  const queue = useRef(Promise.resolve());

  const run = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(task);
    queue.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  // Polling runs every 30 s; only touch React state when something actually changed, so a quiet
  // minute does not re-render every screen.
  const last = useRef({ prefs: '', snapshot: '', library: '' });
  const sync = useCallback(
    (force = false) =>
      run(async () => {
        const loaded = await loadPreferences();
        const snap = loaded.topicIds.length ? await rotate({ force }) : null;
        const lib = await loadLibrary();
        const next = { prefs: JSON.stringify(loaded), snapshot: JSON.stringify(snap), library: JSON.stringify(lib) };
        if (next.prefs !== last.current.prefs) setPrefs(loaded);
        if (next.snapshot !== last.current.snapshot) setSnapshot(snap);
        if (next.library !== last.current.library) setLibrary(lib);
        last.current = next;
      }),
    [run],
  );

  // Silent, throttled check for newer packs; refreshes the UI only when something changed.
  const checkContent = useCallback(async () => {
    if (await run(() => updateContentIfStale())) await sync();
  }, [run, sync]);

  const updateContent = useCallback(async () => {
    const downloaded = await run(() => updateContentNow());
    await sync();
    return downloaded;
  }, [run, sync]);

  const setSurfaces = useCallback(
    (change: { lockScreenEnabled?: boolean; islandEnabled?: boolean }) =>
      run(async () => {
        setPrefs((p) => ({ ...p, ...change }));
        setSnapshot(await setSurfacesEnabled(change));
      }),
    [run],
  );

  // The background task has no safe-area insets, so remember once whether this phone has a Dynamic Island.
  useEffect(() => {
    const islandCapable = Platform.OS === 'ios' && (initialWindowMetrics?.insets.top ?? 0) >= DYNAMIC_ISLAND_MIN_INSET;
    run(async () => {
      const stored = await loadPreferences();
      if (stored.islandCapable === islandCapable) return;
      setPrefs((p) => ({ ...p, islandCapable }));
      if (stored.topicIds.length) setSnapshot(await setSurfacesEnabled({ islandCapable }));
      else await storePreferences({ ...stored, islandCapable });
    });
  }, [run]);

  useEffect(() => {
    // Show the app as soon as the first card is ready; the content check may need the network.
    recordVisitStored()
      .then(() => sync())
      .finally(() => setReady(true))
      .then(() => checkContent());

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') sync();
    }, FOREGROUND_POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recordVisitStored().then(() => sync()).then(() => checkContent());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [sync, checkContent]);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      prefs,
      snapshot,
      library,
      refresh: () => sync(),
      next: () => sync(true),
      toggleFavorite: (card) =>
        run(async () => {
          const favorites = await toggleFavoriteStored(card);
          setLibrary((lib) => ({ ...lib, favorites }));
          return isFavorite(favorites, card.factId);
        }),
      savePreferences: (next, catalog) =>
        run(async () => {
          const snap = await applyPreferences(next, catalog);
          setPrefs(next);
          setSnapshot(snap);
          setLibrary(await loadLibrary());
        }),
      updateContent,
      setLockScreen: (enabled) => setSurfaces({ lockScreenEnabled: enabled, islandEnabled: enabled }),
      setSurfaces,
      setNotifications: (enabled) =>
        run(async () => {
          const result = await setNotificationsEnabled(enabled);
          setPrefs((p) => ({ ...p, notificationsEnabled: result.enabled }));
          setSnapshot(result.snapshot);
          return result.enabled;
        }),
    }),
    [ready, prefs, snapshot, library, sync, run, updateContent, setSurfaces],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(Context);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
