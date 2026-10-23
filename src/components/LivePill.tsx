import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui';
import { colors, radii } from '@/theme';

type LivePillProps = {
  live: boolean;
  onPress: () => void;
};

/** "Kilit ekranında" status with a sonar-like pulse while the Live Activity is running. */
export function LivePill({ live, onPress }: LivePillProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.set(live && !reduceMotion ? withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false) : 0);
  }, [live, reduceMotion, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.7,
    transform: [{ scale: 1 + pulse.value * 1.8 }],
  }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityState={{ checked: live }}
      accessibilityLabel="Kilit ekranında göster"
      onPress={onPress}
      style={[styles.pill, live && styles.pillLive]}>
      <View style={styles.dotWrap}>
        {live ? <Animated.View style={[styles.ring, ring]} /> : null}
        <View style={[styles.dot, { backgroundColor: live ? colors.coral : colors.textFaint }]} />
      </View>
      <Text style={[styles.text, live && { color: colors.text }]}>{live ? 'Kilit ekranında' : 'Kapalı'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pillLive: { borderColor: colors.border },
  dotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ring: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },
  text: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
});
