import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { palette } from '@/theme';

// Geometry mirrors assets/mascot/shell.svg (the source of the icon, splash and lock screen PNGs):
// change both together. Ribs are tapered wedges from the apex to the scalloped rim.
const BODY = "M8 76 C 18 40, 44 14, 58 14 C 72 14, 102 40, 112 76 Q 106.5 82.2 101 76 Q 96.0 82.7 91 76 Q 86.0 83.2 81 76 Q 76.5 83.7 72 76 Q 68.0 84.1 64 76 Q 60.0 84.5 56 76 Q 52.0 84.1 48 76 Q 43.5 83.7 39 76 Q 34.0 83.2 29 76 Q 24.0 82.7 19 76 Q 13.5 82.2 8 76 Z";
const RINGS = ["M38.4 44 Q 58 33 77.6 44", "M28.4 60 Q 58 47 87.6 60", "M19.8 74 Q 58 60 96.2 74"];
const RIBS = ["M58 19 Q 35.4 46 12.2 79.3 L 15.8 79.3 Q 36.6 46 58 19 Z", "M58 19 Q 40.4 46 22.2 80.1 L 25.8 80.1 Q 41.6 46 58 19 Z", "M58 19 Q 45.4 46 32.2 80.9 L 35.8 80.9 Q 46.6 46 58 19 Z", "M58 19 Q 50.4 46 42.2 81.7 L 45.8 81.7 Q 51.6 46 58 19 Z", "M58 19 Q 54.4 46 50.2 82.4 L 53.8 82.4 Q 55.6 46 58 19 Z", "M58 19 Q 58.4 46 58.2 83.0 L 61.8 83.0 Q 59.6 46 58 19 Z", "M58 19 Q 62.4 46 66.2 82.4 L 69.8 82.4 Q 63.6 46 58 19 Z", "M58 19 Q 66.4 46 74.2 81.7 L 77.8 81.7 Q 67.6 46 58 19 Z", "M58 19 Q 71.4 46 84.2 80.9 L 87.8 80.9 Q 72.6 46 58 19 Z", "M58 19 Q 76.4 46 94.2 80.1 L 97.8 80.1 Q 77.6 46 58 19 Z", "M58 19 Q 81.4 46 104.2 79.3 L 107.8 79.3 Q 82.6 46 58 19 Z"];
const RIB_HIGHLIGHTS = ["M58.2 19.5 Q 37.2 46 16.0 79.3 L 17.5 79.3 Q 38.4 46 58.6 19.5 Z", "M58.2 19.5 Q 42.2 46 26.0 80.1 L 27.5 80.1 Q 43.4 46 58.6 19.5 Z", "M58.2 19.5 Q 47.2 46 36.0 80.9 L 37.5 80.9 Q 48.4 46 58.6 19.5 Z", "M58.2 19.5 Q 52.2 46 46.0 81.7 L 47.5 81.7 Q 53.4 46 58.6 19.5 Z", "M58.2 19.5 Q 56.2 46 54.0 82.4 L 55.5 82.4 Q 57.4 46 58.6 19.5 Z", "M58.2 19.5 Q 60.2 46 62.0 83.0 L 63.5 83.0 Q 61.4 46 58.6 19.5 Z", "M58.2 19.5 Q 64.2 46 70.0 82.4 L 71.5 82.4 Q 65.4 46 58.6 19.5 Z", "M58.2 19.5 Q 68.2 46 78.0 81.7 L 79.5 81.7 Q 69.4 46 58.6 19.5 Z", "M58.2 19.5 Q 73.2 46 88.0 80.9 L 89.5 80.9 Q 74.4 46 58.6 19.5 Z", "M58.2 19.5 Q 78.2 46 98.0 80.1 L 99.5 80.1 Q 79.4 46 58.6 19.5 Z", "M58.2 19.5 Q 83.2 46 108.0 79.3 L 109.5 79.3 Q 84.4 46 58.6 19.5 Z"];

/** The Limpet mark: a ribbed cone shell clinging to a rock. */
export function ShellMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 120 96">
      <Defs>
        <LinearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E5AB8E" />
          <Stop offset="0.55" stopColor={palette.coral} />
          <Stop offset="1" stopColor={palette.clay} />
        </LinearGradient>
        <LinearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.slate} />
          <Stop offset="1" stopColor={palette.abyss} />
        </LinearGradient>
        <ClipPath id="body">
          <Path d={BODY} />
        </ClipPath>
      </Defs>
      <Ellipse cx={60} cy={85.5} rx={56} ry={9.5} fill="url(#rock)" />
      <Path d={BODY} fill="url(#shell)" />
      <G clipPath="url(#body)">
        <G stroke={palette.abyss} strokeOpacity={0.16} strokeWidth={1.3} strokeLinecap="round" fill="none">
          {RINGS.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
        <G fill="#F4E9E2" fillOpacity={0.34}>
          {RIB_HIGHLIGHTS.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
        <G fill={palette.abyss} fillOpacity={0.5}>
          {RIBS.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
      </G>
      <Path d={BODY} fill="none" stroke={palette.abyss} strokeOpacity={0.45} strokeWidth={1.2} strokeLinejoin="round" />
      <Ellipse cx={58} cy={17} rx={6.5} ry={3.4} fill="#F4E9E2" fillOpacity={0.6} />
    </Svg>
  );
}

/** ShellMark with a slow tidal bob, for hero spots. */
export function FloatingShell({ size = 120 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * t.value }, { rotate: `${(t.value - 0.5) * 4}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <ShellMark size={size} />
    </Animated.View>
  );
}
