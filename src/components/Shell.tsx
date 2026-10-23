import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { palette } from '@/theme';

// Rib end points along the shell's rim, fanning out from the apex.
const RIBS = [14, 24, 34, 44, 52, 60, 68, 76, 86, 96, 106];

/** The Limpet mark: a ribbed cone shell clinging to a rock. */
export function ShellMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 120 96">
      <Defs>
        <LinearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.coral} />
          <Stop offset="1" stopColor={palette.clay} />
        </LinearGradient>
        <LinearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.slate} />
          <Stop offset="1" stopColor={palette.abyss} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={60} cy={84} rx={56} ry={11} fill="url(#rock)" />
      <Path d="M8 76 C 18 40, 44 14, 58 14 C 72 14, 102 40, 112 76 C 90 82, 30 82, 8 76 Z" fill="url(#shell)" />
      <G stroke={palette.abyss} strokeOpacity={0.28} strokeWidth={1.6} strokeLinecap="round">
        {RIBS.map((x) => (
          <Path key={x} d={`M58 18 Q ${(58 + x) / 2} 46 ${x} ${78 - Math.abs(x - 60) * 0.08}`} fill="none" />
        ))}
      </G>
      <Ellipse cx={58} cy={17} rx={6} ry={3.2} fill="#F4E9E2" fillOpacity={0.55} />
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
