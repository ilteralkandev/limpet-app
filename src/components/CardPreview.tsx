import { StyleSheet, Text, View } from 'react-native';

import type { Card } from '@/lib/rotation';
import { useTheme } from '@/theme';

/** In-app replica of the lock screen banner rendered by FactActivity. */
export function CardPreview({ card }: { card: Card | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.lockCard }]}>
      <Text style={[styles.topic, { color: theme.lockCardAccent }]}>{card?.topicTitle ?? 'Limpet'}</Text>
      <Text style={[styles.text, { color: theme.lockCardText }]} numberOfLines={3}>
        {card?.text ?? 'Henüz gösterilecek bilgi yok. Ayarlardan bir konu seç.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  topic: {
    fontSize: 13,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
});
