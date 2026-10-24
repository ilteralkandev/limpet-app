import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PressableScale } from '@/components/ui';
import type { TopicSummary } from '@/lib/content/types';
import { colors, fonts, radii } from '@/theme';

type TopicGridProps = {
  topics: TopicSummary[];
  selected: string[];
  onToggle: (id: string) => void;
};

/** Compact two-column grid (16 topics fit without long scrolling); selected tiles glow coral and get a check badge. */
export function TopicGrid({ topics, selected, onToggle }: TopicGridProps) {
  return (
    <View style={styles.grid}>
      {topics.map((topic) => {
        const on = selected.includes(topic.id);
        return (
          <PressableScale
            key={topic.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={topic.title}
            onPress={() => onToggle(topic.id)}
            style={[styles.tile, on && styles.tileOn]}>
            <View style={[styles.icon, on && styles.iconOn]}>
              <SymbolView
                name={topic.symbol as SFSymbol}
                size={22}
                tintColor={on ? colors.onCoral : colors.coral}
                weight="medium"
              />
            </View>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {topic.title}
            </Text>
            {on ? (
              <Animated.View entering={ZoomIn.springify().damping(12)} exiting={ZoomOut.duration(150)} style={styles.check}>
                <SymbolView name="checkmark" size={11} tintColor={colors.onCoral} weight="bold" />
              </Animated.View>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: 14,
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  tileOn: { borderColor: colors.coral, backgroundColor: 'rgba(217, 155, 127, 0.12)' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 155, 127, 0.12)',
    marginBottom: 4,
  },
  iconOn: { backgroundColor: colors.coral },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  check: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
