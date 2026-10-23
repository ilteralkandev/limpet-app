import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { haptic } from '@/lib/haptics';
import { colors, fonts, radii } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
  haptics?: boolean;
};

/** Pressable that sinks slightly under the finger, with a light haptic. */
export function PressableScale({ style, scaleTo = 0.96, haptics = true, onPressIn, onPressOut, onPress, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 15, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 12, stiffness: 300 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic.tap();
        onPress?.(e);
      }}
    />
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: SFSymbol;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onCoral : colors.text;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, primary ? styles.primary : styles.ghost, (disabled || loading) && styles.inactive, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={17} tintColor={fg} weight="semibold" /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

type IconButtonProps = {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  active?: boolean;
  size?: number;
};

/** Round glass button; `active` fills it with coral (e.g. a saved favorite). */
export function IconButton({ icon, label, onPress, active, size = 56 }: IconButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      scaleTo={0.88}
      style={[
        styles.iconButton,
        { width: size, height: size },
        active && { backgroundColor: colors.coral, borderColor: colors.coral },
      ]}>
      <SymbolView name={icon} size={size * 0.38} tintColor={active ? colors.onCoral : colors.text} weight="medium" />
    </PressableScale>
  );
}

/** Large serif screen title, the app's typographic signature. */
export function Title({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, style]} {...rest}>
      {children}
    </Text>
  );
}

/** Small uppercase label above a section. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  ghost: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inactive: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  iconButton: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text,
    letterSpacing: -0.5,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.coral,
  },
});

