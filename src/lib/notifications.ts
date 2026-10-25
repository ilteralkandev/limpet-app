// Local notifications, one at a time: a new one is only scheduled once the previous one has been
// dealt with (swiped away, tapped, or the app was opened). Needs no server.
import * as Notifications from 'expo-notifications';

import type { Card } from '@/lib/rotation';

const QUIET_FROM_HOUR = 23;
const QUIET_UNTIL_HOUR = 8;
const ID_PREFIX = 'fact-';
const CATEGORY = 'fact';

export const FAVORITE_ACTION = 'favorite';

// While the app is open the card is already on screen: stay silent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

/** The "Favorilere ekle" button shown when the notification is pulled down or long-pressed. */
export function registerNotificationActions(): Promise<unknown> {
  return Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: FAVORITE_ACTION, buttonTitle: 'Favorilere ekle', options: { opensAppToForeground: false } },
  ]);
}

export type PendingFactNotification = { id: string; at: number; factId: string; signature: string };

/** The notification waiting to fire, if any (there is never more than one). */
export async function pendingFactNotification(): Promise<PendingFactNotification | null> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of requests) {
    const data = request.content.data as { at?: number; factId?: string; signature?: string } | undefined;
    if (request.identifier.startsWith(ID_PREFIX) && data?.factId && typeof data.at === 'number') {
      return { id: request.identifier, at: data.at, factId: data.factId, signature: data.signature ?? '' };
    }
  }
  return null;
}

/** Whether the notification is still sitting in Notification Center (nobody swiped or tapped it). */
export async function isStillPresented(id: string): Promise<boolean> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  return presented.some((n) => n.request.identifier === id);
}

export async function scheduleFactNotification(at: number, card: Card, signature: string): Promise<string> {
  await registerNotificationActions();
  const id = `${ID_PREFIX}${at}`;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: card.topicTitle,
      body: card.text,
      sound: false,
      categoryIdentifier: CATEGORY,
      data: { at, factId: card.factId, signature, card },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
  return id;
}

export async function cancelFactNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Opening the app means the latest card has been seen: clear what is left in Notification Center. */
export async function clearDeliveredNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

function cardFrom(response: Notifications.NotificationResponse | null): Card | null {
  if (response?.actionIdentifier !== FAVORITE_ACTION) return null;
  const card = response.notification.request.content.data?.card as Partial<Card> | undefined;
  const ok =
    typeof card?.factId === 'string' &&
    typeof card.text === 'string' &&
    typeof card.topicTitle === 'string' &&
    typeof card.symbol === 'string';
  return ok ? (card as Card) : null;
}

/**
 * Calls `onFavorite` for every "Favorilere ekle" tap, including one that happened while the app
 * was not running (iOS hands it over on the next launch). Returns the unsubscribe function.
 */
export function subscribeFavoriteActions(onFavorite: (card: Card, key: string) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const card = cardFrom(response);
    if (response && card) onFavorite(card, `${response.notification.request.identifier}:${response.notification.date}`);
  };
  Notifications.getLastNotificationResponseAsync().then(handle, () => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
