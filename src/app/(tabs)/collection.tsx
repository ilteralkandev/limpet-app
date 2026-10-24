import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShareImage } from '@/components/ShareImage';
import { SavedRow } from '@/components/SavedRow';
import { Segmented } from '@/components/Segmented';
import { ShellMark } from '@/components/Shell';
import { TAB_BAR_CLEARANCE } from '@/components/TabBar';
import { Eyebrow, Title } from '@/components/ui';
import { isFavorite, type SavedCard } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { useAppState } from '@/state/app-state';
import { colors, fonts } from '@/theme';

type Tab = 'favorites' | 'history';

const EMPTY: Record<Tab, { title: string; body: string }> = {
  favorites: {
    title: 'Henüz favori yok',
    body: 'Sevdiğin bir bilgiye iki kez dokun; burada, kayaya tutunmuş bir kabuk gibi saklanır.',
  },
  history: {
    title: 'Geçmiş boş',
    body: 'Kilit ekranında gösterilen her bilgi buraya düşer. İlk gelgiti bekle.',
  },
};

// Stagger only the first screenful; later rows appear instantly while scrolling.
const STAGGER_LIMIT = 8;

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { library, toggleFavorite } = useAppState();
  const { shareImage } = useShareImage();
  const [tab, setTab] = useState<Tab>('favorites');
  const data = tab === 'favorites' ? library.favorites : library.history;

  const header = (
    <View style={styles.header}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.titles}>
        <Eyebrow>Koleksiyon</Eyebrow>
        <Title>Kayadaki kabuklar</Title>
      </Animated.View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'favorites', label: `Favoriler · ${library.favorites.length}` },
          { value: 'history', label: 'Geçmiş' },
        ]}
      />
    </View>
  );

  return (
    <Animated.FlatList
      data={data}
      key={tab}
      keyExtractor={(item: SavedCard) => item.factId}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
          <ShellMark size={96} />
          <Text style={styles.emptyTitle}>{EMPTY[tab].title}</Text>
          <Text style={styles.emptyBody}>{EMPTY[tab].body}</Text>
        </Animated.View>
      }
      itemLayoutAnimation={LinearTransition.springify().damping(18)}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }: { item: SavedCard; index: number }) => (
        <Animated.View
          entering={index < STAGGER_LIMIT ? FadeInDown.delay(index * 45).duration(380) : undefined}
          exiting={FadeOut.duration(200)}>
          <SavedRow
            item={item}
            now={now}
            favorite={isFavorite(library.favorites, item.factId)}
            onShare={() => shareImage(item)}
            onToggleFavorite={async () => {
              if (await toggleFavorite(item)) haptic.success();
            }}
          />
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  header: { gap: 18, marginBottom: 8 },
  titles: { gap: 4 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 12 },
  emptyBody: { fontSize: 14.5, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
});
