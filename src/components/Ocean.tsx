import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors, palette } from '@/theme';

/** Sine-like wave across 2×width built from quadratic curves; tiles seamlessly every `width`. */
function wavePath(width: number, height: number, amplitude: number, crests: number): string {
  const half = width / crests / 2;
  const mid = amplitude;
  let d = `M0 ${mid}`;
  for (let i = 0; i < crests * 4; i++) {
    const x = i * half;
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` Q${x + half / 2} ${mid + dir * amplitude} ${x + half} ${mid}`;
  }
  return `${d} L${width * 2} ${height} L0 ${height} Z`;
}

type WaveProps = {
  color: string;
  height: number;
  amplitude: number;
  crests: number;
  duration: number;
  reverse?: boolean;
  bottom: number;
};

function Wave({ color, height, amplitude, crests, duration, reverse, bottom }: WaveProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const shift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    shift.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [duration, reduceMotion, shift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (reverse ? shift.value - 1 : -shift.value) * width }],
  }));
  const d = useMemo(() => wavePath(width, height, amplitude, crests), [width, height, amplitude, crests]);

  return (
    <Animated.View style={[styles.wave, { bottom, height, width: width * 2 }, style]}>
      <Svg width={width * 2} height={height}>
        <Path d={d} fill={color} />
      </Svg>
    </Animated.View>
  );
}

// Deterministic "random" so particles don't jump around between renders.
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1), size: 2 + r(2) * 3, duration: 14_000 + r(3) * 14_000, delay: r(4) * 10_000, drift: (r(5) - 0.5) * 40 };
});

function Particle({ x, size, duration, delay, drift }: (typeof PARTICLES)[number]) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)));
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(t.value * Math.PI) * 0.55,
    transform: [{ translateY: -t.value * height * 0.7 }, { translateX: Math.sin(t.value * Math.PI * 2) * drift }],
  }));

  return (
    <Animated.View
      style={[styles.particle, { left: x * width, top: height * 0.85, width: size, height: size, borderRadius: size }, style]}
    />
  );
}

/** Animated deep-sea backdrop shared by every screen. Purely decorative. */
export function Ocean() {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[colors.bg, colors.bg, colors.bgDeep]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {/* Light filtering down from the surface. */}
      <Svg width={width} height={width * 1.1} style={styles.glow}>
        <Defs>
          <RadialGradient id="sun" cx="78%" cy="0%" r="80%">
            <Stop offset="0" stopColor={palette.coral} stopOpacity={0.22} />
            <Stop offset="0.5" stopColor={palette.clay} stopOpacity={0.06} />
            <Stop offset="1" stopColor={palette.abyss} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={width * 0.78} cy={0} r={width * 1.1} fill="url(#sun)" />
      </Svg>
      {reduceMotion ? null : PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
      <Wave color="rgba(70, 72, 88, 0.30)" height={150} amplitude={14} crests={2} duration={22_000} bottom={0} />
      <Wave color="rgba(165, 111, 99, 0.14)" height={120} amplitude={10} crests={3} duration={16_000} reverse bottom={0} />
      <Wave color="rgba(3, 13, 19, 0.85)" height={80} amplitude={8} crests={2} duration={28_000} bottom={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute', left: 0 },
  glow: { position: 'absolute', top: 0, left: 0 },
  particle: { position: 'absolute', backgroundColor: palette.coral },
});
