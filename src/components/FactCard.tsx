import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { SFSymbol } from 'sf-symbols-typescript';

import { TideBar } from '@/components/TideBar';
import type { Card } from '@/lib/rotation';
import { colors, fonts, radii } from '@/theme';

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 800;

type FactCardProps = {
  card: Card;
  position: number;
  deckSize: number;
  shownAt: number;
  nextAt: number;
  /** Called after the card has flown off screen. */
  onSwiped: () => void;
  onDoubleTap: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function FactCard({ card, position, deckSize, shownAt, nextAt, onSwiped, onDoubleTap }: FactCardProps) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const enter = useSharedValue(0);
  const heart = useSharedValue(0);

  // Each new fact rises in like it surfaced from the deep. Keyed on shownAt too, so a
  // one-card deck (same factId after a swipe) still comes back on screen.
  useEffect(() => {
    x.set(0);
    enter.set(0);
    enter.set(withSpring(1, { damping: 16, stiffness: 140 }));
  }, [card.factId, shownAt, enter, x]);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      x.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const flung = Math.abs(e.translationX) > SWIPE_DISTANCE || Math.abs(e.velocityX) > SWIPE_VELOCITY;
      if (flung) {
        const dir = Math.sign(e.translationX || e.velocityX) || 1;
        x.set(
          withTiming(dir * width * 1.4, { duration: 240 }, (done) => {
            if (done) scheduleOnRN(onSwiped);
          }),
        );
      } else {
        x.set(withSpring(0, { damping: 14, stiffness: 180 }));
      }
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      heart.set(withSequence(withSpring(1, { damping: 6, stiffness: 260 }), withTiming(0, { duration: 380 })));
      scheduleOnRN(onDoubleTap);
    },
  });

  const gestures = useSimultaneousGestures(pan, doubleTap);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value), [0, width], [1, 0.4]) * enter.value,
    transform: [
      { translateX: x.value },
      { translateY: (1 - enter.value) * 40 },
      { rotate: `${x.value / 22}deg` },
      { scale: 0.94 + enter.value * 0.06 },
    ],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heart.value,
    transform: [{ scale: 0.4 + heart.value * 0.9 }],
  }));

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View
        style={[styles.card, cardStyle]}
        accessible
        accessibilityLabel={`${card.topicTitle}. ${card.text}`}
        accessibilityHint="Sonraki bilgi için kaydır, favorilere eklemek için iki kez dokun."
        accessibilityActions={[{ name: 'activate' }, { name: 'magicTap' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'magicTap' ? onDoubleTap() : onSwiped())}>
        <LinearGradient
          colors={['rgba(70, 72, 88, 0.55)', 'rgba(15, 48, 64, 0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.quote} importantForAccessibility="no">
          “
        </Text>

        <View style={styles.header}>
          <View style={styles.chip}>
            <SymbolView name={card.symbol as SFSymbol} size={13} tintColor={colors.coral} weight="semibold" />
            <Text style={styles.chipText}>{card.topicTitle}</Text>
          </View>
          <Text style={styles.position}>
            {pad(position)} <Text style={styles.positionTotal}>/ {pad(deckSize)}</Text>
          </Text>
        </View>

        <Text style={styles.text}>{card.text}</Text>

        <TideBar shownAt={shownAt} nextAt={nextAt} />

        <Animated.View style={[styles.heart, heartStyle]} pointerEvents="none">
          <SymbolView name="heart.fill" size={96} tintColor={colors.coral} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: 24,
    paddingTop: 22,
    gap: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    minHeight: 300,
  },
  quote: {
    position: 'absolute',
    top: -24,
    left: 10,
    fontFamily: fonts.displayBold,
    fontSize: 180,
    lineHeight: 200,
    color: colors.coral,
    opacity: 0.1,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(217, 155, 127, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 127, 0.25)',
  },
  chipText: { color: colors.coral, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  position: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.text },
  positionTotal: { color: colors.textFaint },
  text: {
    flexGrow: 1,
    fontFamily: fonts.serifMedium,
    fontSize: 25,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.2,
  },
  heart: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
