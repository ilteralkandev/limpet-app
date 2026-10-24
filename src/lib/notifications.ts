// Local notifications that mirror the card timeline (see planNotifications). Needs no server.
import * as Notifications from 'expo-notifications';

import type { PlannedNotification } from '@/lib/rotation';

// iOS keeps at most 64 pending local notifications per app.
const MAX_PENDING = 60;
const QUIET_FROM_HOUR = 23;
const QUIET_UNTIL_HOUR = 8;

// While the app is open the card is already on screen: stay silent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const NOTIFICATION_LIMIT = MAX_PENDING;

export function isQuietHour(at: Date): boolean {
  const hour = at.getHours();
  return hour >= QUIET_FROM_HOUR || hour < QUIET_UNTIL_HOUR;
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Shows the system prompt the first time; returns whether notifications are allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces everything pending with the given plan (an empty plan just clears). */
export async function scheduleNotifications(plan: PlannedNotification[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const { at, card } of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: `fact-${at}`,
      content: { title: card.topicTitle, body: card.text, sound: false, data: { factId: card.factId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}
