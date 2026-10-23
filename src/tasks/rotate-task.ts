import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const ROTATE_TASK = 'limpet-rotate-fact';

const supported = Platform.OS !== 'web';

// Must run at module scope (imported from the root layout) so iOS can wake the
// JS runtime straight into the task. iOS decides the actual timing; the
// interval is only a lower bound and is often stretched.
if (supported) {
  TaskManager.defineTask(ROTATE_TASK, async () => {
    try {
      // Lazy import breaks the engine ↔ task module cycle.
      const { rotate } = await import('@/lib/engine');
      await rotate();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.error('[rotate-task]', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function scheduleBackgroundRotation(intervalMinutes: number): Promise<void> {
  if (!supported) return;
  // Re-register so a changed interval takes effect.
  await cancelBackgroundRotation();
  await BackgroundTask.registerTaskAsync(ROTATE_TASK, { minimumInterval: Math.max(15, intervalMinutes) });
}

export async function cancelBackgroundRotation(): Promise<void> {
  if (!supported) return;
  if (await TaskManager.isTaskRegisteredAsync(ROTATE_TASK)) {
    await BackgroundTask.unregisterTaskAsync(ROTATE_TASK);
  }
}
