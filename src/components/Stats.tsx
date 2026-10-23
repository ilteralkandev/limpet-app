import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, fonts, radii } from '@/theme';

type Stat = { icon: SFSymbol; value: number; label: string };

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <View key={s.label} style={styles.tile} accessible accessibilityLabel={`${s.value} ${s.label}`}>
          <SymbolView name={s.icon} size={16} tintColor={colors.coral} weight="semibold" />
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 2,
  },
  value: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, marginTop: 6 },
  label: { fontSize: 12, color: colors.textMuted },
});
