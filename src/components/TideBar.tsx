import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useNow } from '@/lib/use-now';
import { colors, palette } from '@/theme';

const progressAt = (shownAt: number, nextAt: number, now: number) =>
  Math.min(1, Math.max(0, (now - shownAt) / Math.max(1, nextAt - shownAt)));

function formatRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 0) return 'şimdi';
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

/** The "tide": fills up until the next card arrives, like the lock screen bar. */
export function TideBar({ shownAt, nextAt }: { shownAt: number; nextAt: number }) {
  // The bar moves a fraction of a pixel per second: ticking every 15 s keeps the JS thread idle.
  const now = useNow(15_000);
  const progress = useSharedValue(progressAt(shownAt, nextAt, now));

  useEffect(() => {
    progress.set(withTiming(progressAt(shownAt, nextAt, now), { duration: 1200, easing: Easing.out(Easing.quad) }));
  }, [now, shownAt, nextAt, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.wrap} accessibilityLabel={`Sıradaki bilgiye ${formatRemaining(nextAt - now)}`}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]}>
          <LinearGradient colors={[palette.clay, palette.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <View style={styles.head} />
        </Animated.View>
      </View>
      <Text style={styles.label}>{formatRemaining(nextAt - now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3, overflow: 'visible', justifyContent: 'center' },
  head: {
    position: 'absolute',
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
    shadowColor: colors.coral,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 54, textAlign: 'right' },
});
