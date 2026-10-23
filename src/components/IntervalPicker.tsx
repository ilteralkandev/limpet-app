import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { INTERVAL_OPTIONS } from '@/lib/preferences';
import { colors, fonts, radii } from '@/theme';

// A personality for each rhythm, so the choice feels like picking a pace, not a number.
const MOODS: Record<number, { name: string; hint: string }> = {
  15: { name: 'Meraklı', hint: 'Gün boyu sürekli yeni bilgi' },
  30: { name: 'Hevesli', hint: 'Yarım saatte bir taze bir cümle' },
  60: { name: 'Dengeli', hint: 'Saatte bir, göz yormadan' },
  180: { name: 'Sakin', hint: 'Günde birkaç küçük durak' },
  360: { name: 'Ara sıra', hint: 'Sabah, öğle, akşam' },
};

export function IntervalPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {INTERVAL_OPTIONS.map((option) => {
        const on = option.minutes === value;
        const mood = MOODS[option.minutes];
        return (
          <PressableScale
            key={option.minutes}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            haptics={false}
            scaleTo={0.98}
            onPress={() => {
              haptic.select();
              onChange(option.minutes);
            }}
            style={[styles.row, on && styles.rowOn]}>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on ? <Animated.View entering={FadeIn.duration(160)} style={styles.radioDot} /> : null}
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{mood?.name ?? option.label}</Text>
              <Text style={styles.hint}>{mood?.hint}</Text>
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: colors.coral, backgroundColor: 'rgba(217, 155, 127, 0.10)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.coral },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  hint: { fontSize: 12.5, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '700', color: colors.textFaint, fontVariant: ['tabular-nums'] },
  labelOn: { color: colors.coral },
});
