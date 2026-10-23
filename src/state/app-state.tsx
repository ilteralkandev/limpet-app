import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isFavorite } from '@/lib/collection';
import type { TopicSummary } from '@/lib/content/types';
import {
  applyPreferences,
  rotate,
  setLockScreenEnabled,
  updateContentIfStale,
  updateContentNow,
  type Snapshot,
} from '@/lib/engine';
import { loadLibrary, recordVisitStored, toggleFavoriteStored, type Library } from '@/lib/library';
import { DEFAULT_PREFERENCES, loadPreferences, type Preferences } from '@/lib/preferences';
import type { Card } from '@/lib/rotation';
import { INITIAL_STREAK } from '@/lib/streak';

// While the app is open, check this often whether the card is due.
const FOREGROUND_POLL_MS = 30_000;

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
  setLockScreen: (enabled: boolean) => Promise<void>;
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

  const sync = useCallback(
    (force = false) =>
      run(async () => {
        const loaded = await loadPreferences();
        const snap = loaded.topicIds.length ? await rotate({ force }) : null;
        const lib = await loadLibrary();
        setPrefs(loaded);
        setSnapshot(snap);
        setLibrary(lib);
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

  useEffect(() => {
    recordVisitStored()
      .then(() => sync())
      .then(() => checkContent())
      .finally(() => setReady(true));

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
      setLockScreen: (enabled) =>
        run(async () => {
          setPrefs((p) => ({ ...p, lockScreenEnabled: enabled }));
          setSnapshot(await setLockScreenEnabled(enabled));
        }),
    }),
    [ready, prefs, snapshot, library, sync, run, updateContent],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(Context);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
