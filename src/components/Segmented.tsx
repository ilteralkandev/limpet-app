import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { colors, radii } from '@/theme';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Segmented control with a sliding coral indicator. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  // Inner width excludes the 4pt padding on each side, matching the flex options.
  const segment = (width - 8) / options.length;

  const indicator = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, { damping: 18, stiffness: 220 }) }],
  }));

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {width > 0 ? <Animated.View style={[styles.indicator, indicator]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={styles.option}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(o.value);
            }}>
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.coral,
  },
  option: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  labelOn: { color: colors.onCoral },
});
