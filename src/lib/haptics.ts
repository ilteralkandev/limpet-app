import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Fire-and-forget wrappers; haptics must never block or throw into UI code.
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  tap: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  select: () => enabled && Haptics.selectionAsync().catch(() => {}),
  success: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  swipe: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
};
