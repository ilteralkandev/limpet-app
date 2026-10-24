import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FactCard } from '@/components/FactCard';
import { useShareImage } from '@/components/ShareImage';
import { LivePill } from '@/components/LivePill';
import { FloatingShell } from '@/components/Shell';
import { StatsRow } from '@/components/Stats';
import { TAB_BAR_CLEARANCE } from '@/components/TabBar';
import { Button, Eyebrow, IconButton, Title } from '@/components/ui';
import { isLiveActivitySupported } from '@/live-activity';
import { isFavorite } from '@/lib/collection';
import { greeting } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { isLiveActive } from '@/lib/preferences';
import { explainCard } from '@/lib/explain';
import { useNow } from '@/lib/use-now';
import { useAppState } from '@/state/app-state';
import { colors, fonts, radii } from '@/theme';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { shareImage } = useShareImage();
  const { snapshot, prefs, library, next, toggleFavorite, setLockScreen } = useAppState();
  const card = snapshot?.card ?? null;
  const favorite = card ? isFavorite(library.favorites, card.factId) : false;
  const now = useNow();
  const today = new Date(now).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  const onNext = () => {
    haptic.swipe();
    next();
  };
  const onToggleFavorite = async () => {
    if (!card) return;
    if (await toggleFavorite(card)) haptic.success();
  };
  // Double tap only ever adds, like a "like"; the heart button is the toggle.
  const onDoubleTap = () => {
    if (card && !favorite) onToggleFavorite();
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }]}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.brandRow}>
        <View style={styles.brand}>
          <FloatingShell size={40} />
          <Text style={styles.wordmark}>Limpet</Text>
        </View>
        {isLiveActivitySupported ? (
          <LivePill
            live={isLiveActive(prefs) && !snapshot?.lockScreenError}
            onPress={() => setLockScreen(!isLiveActive(prefs))}
          />
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(600)} style={styles.headerText}>
        <Eyebrow>{today}</Eyebrow>
        <Title>{greeting(now)}</Title>
      </Animated.View>

      {card && snapshot?.shownAt && snapshot.nextUpdateAt ? (
        <Animated.View entering={FadeInDown.delay(120).duration(600)}>
          <FactCard
            card={card}
            position={snapshot.position}
            deckSize={snapshot.deckSize}
            shownAt={snapshot.shownAt}
            nextAt={snapshot.nextUpdateAt}
            onSwiped={onNext}
            onDoubleTap={onDoubleTap}
            onExplain={() => explainCard(card)}
          />
        </Animated.View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Konu paketleri bulunamadı. Ayarlardan yeniden indirebilirsin.</Text>
          <Button title="Ayarlara git" variant="ghost" onPress={() => router.navigate('/settings')} />
        </View>
      )}

      <Animated.View entering={FadeIn.delay(400)} style={styles.actions}>
        <IconButton icon="square.and.arrow.up" label="Paylaş" onPress={() => card && shareImage(card)} />
        <IconButton
          icon={favorite ? 'heart.fill' : 'heart'}
          label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          active={favorite}
          size={68}
          onPress={onToggleFavorite}
        />
        <IconButton icon="arrow.right" label="Sonraki bilgi" onPress={onNext} />
      </Animated.View>
      <Text style={styles.hint}>Kaydır: sonraki · Çift dokun: favori · ?: araştır</Text>

      {snapshot?.lockScreenError && isLiveActive(prefs) ? (
        <Animated.View entering={FadeInDown} style={styles.alert}>
          <SymbolView name="exclamationmark.lock" size={20} tintColor={colors.danger} />
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>Kilit ekranına ulaşılamıyor</Text>
            <Text style={styles.alertBody}>iOS Ayarları → Limpet → Canlı Etkinlikler açık olmalı.</Text>
          </View>
          <Button title="Aç" variant="ghost" onPress={() => Linking.openSettings()} style={styles.alertButton} />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.stats}>
        <Eyebrow>Gelgit kaydın</Eyebrow>
        <StatsRow
          stats={[
            { icon: 'flame.fill', value: library.streak.current, label: 'gün seri' },
            { icon: 'book.pages', value: library.seen, label: 'bilgi okundu' },
            { icon: 'heart.fill', value: library.favorites.length, label: 'favori' },
          ]}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.text, letterSpacing: -0.4 },
  headerText: { gap: 4, marginTop: -6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  hint: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: -10 },
  empty: { padding: 24, gap: 16, borderRadius: radii.lg, backgroundColor: colors.glass },
  emptyText: { color: colors.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(240, 138, 122, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240, 138, 122, 0.35)',
  },
  alertText: { flex: 1, gap: 2 },
  alertTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  alertBody: { color: colors.textMuted, fontSize: 12.5, lineHeight: 17 },
  alertButton: { minHeight: 38, paddingHorizontal: 16 },
  stats: { gap: 12 },
});
