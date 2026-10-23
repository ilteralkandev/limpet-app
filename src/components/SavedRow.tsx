import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PressableScale } from '@/components/ui';
import type { SavedCard } from '@/lib/collection';
import { relativeTime } from '@/lib/format';
import { colors, fonts, radii } from '@/theme';

type SavedRowProps = {
  item: SavedCard;
  now: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
};

export function SavedRow({ item, now, favorite, onToggleFavorite, onShare }: SavedRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <SymbolView name={item.symbol as SFSymbol} size={12} tintColor={colors.coral} weight="semibold" />
        <Text style={styles.topic}>{item.topicTitle}</Text>
        <Text style={styles.time}>· {relativeTime(item.at, now)}</Text>
      </View>
      <Text style={styles.text}>{item.text}</Text>
      <View style={styles.actions}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Paylaş" onPress={onShare} hitSlop={10} scaleTo={0.85}>
          <SymbolView name="square.and.arrow.up" size={18} tintColor={colors.textMuted} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          onPress={onToggleFavorite}
          hitSlop={10}
          scaleTo={0.8}>
          <SymbolView name={favorite ? 'heart.fill' : 'heart'} size={19} tintColor={favorite ? colors.coral : colors.textMuted} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 10,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topic: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.coral },
  time: { fontSize: 12, color: colors.textFaint },
  text: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 22, marginTop: 2 },
});
