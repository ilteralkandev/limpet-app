import { SymbolView } from 'expo-symbols';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { haptic } from '@/lib/haptics';
import { colors, radii } from '@/theme';

const TABS: Record<string, { icon: SFSymbol; label: string }> = {
  index: { icon: 'water.waves', label: 'Bugün' },
  collection: { icon: 'heart.text.square', label: 'Koleksiyon' },
  settings: { icon: 'slider.horizontal.3', label: 'Ayarlar' },
};

/** Floating pill tab bar with a coral "pebble" that slides under the active tab. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const [width, setWidth] = useState(0);
  const segment = width / state.routes.length;

  const pebble = useAnimatedStyle(() => ({
    width: segment - 10,
    transform: [{ translateX: withSpring(state.index * segment, { damping: 18, stiffness: 200 }) }],
  }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 10)} accessibilityRole="tablist">
        {width > 0 ? <Animated.View style={[styles.pebble, pebble]} /> : null}
        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          const focused = state.index === i;
          if (!tab) return null;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={styles.item}
              onPress={() => {
                if (focused) return;
                haptic.select();
                navigateToTab(route.key);
              }}>
              <SymbolView
                name={tab.icon}
                size={19}
                tintColor={focused ? colors.onCoral : colors.textMuted}
                weight={focused ? 'semibold' : 'regular'}
              />
              <Text style={[styles.label, { color: focused ? colors.onCoral : colors.textMuted }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, alignItems: 'stretch' },
  bar: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(15, 48, 64, 0.96)',
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  pebble: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    marginLeft: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.coral,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, gap: 3 },
  label: { fontSize: 11, fontWeight: '700' },
});

/** Space screens leave at the bottom so content clears the floating bar. */
export const TAB_BAR_CLEARANCE = 110;
