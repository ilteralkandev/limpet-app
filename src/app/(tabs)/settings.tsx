import Constants from 'expo-constants';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IntervalPicker } from '@/components/IntervalPicker';
import { ShellMark } from '@/components/Shell';
import { TAB_BAR_CLEARANCE } from '@/components/TabBar';
import { TopicGrid } from '@/components/TopicGrid';
import { Button, Eyebrow, Title } from '@/components/ui';
import { isLiveActivitySupported } from '@/live-activity';
import { loadManifest } from '@/lib/content/cache';
import type { TopicSummary } from '@/lib/content/types';
import { relativeTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { useAppState } from '@/state/app-state';
import { colors, fonts, radii } from '@/theme';

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { prefs, snapshot, savePreferences, setLockScreen } = useAppState();
  const [catalog, setCatalog] = useState<TopicSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [topicIds, setTopicIds] = useState(prefs.topicIds);
  const [intervalMinutes, setIntervalMinutes] = useState(prefs.intervalMinutes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadManifest().then(
      ({ manifest, offline }) => {
        if (cancelled) return;
        setCatalog(manifest.topics);
        setOffline(offline);
      },
      (error) => !cancelled && setCatalogError(error instanceof Error ? error.message : String(error)),
    );
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const dirty = !sameSet(topicIds, prefs.topicIds) || intervalMinutes !== prefs.intervalMinutes;

  const save = async (refresh = false) => {
    if (!catalog) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePreferences({ ...prefs, topicIds, intervalMinutes }, catalog);
      haptic.success();
      if (refresh) setRefreshedAt(Date.now());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + 70 }]}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.titles}>
          <Eyebrow>Ayarlar</Eyebrow>
          <Title>Kendi gelgitin</Title>
        </Animated.View>

        <Section title="İlgi alanları" note={offline ? 'Çevrimdışı: kayıtlı liste' : undefined}>
          {catalog ? (
            <TopicGrid
              topics={catalog}
              selected={topicIds}
              onToggle={(id) =>
                setTopicIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]))
              }
            />
          ) : catalogError ? (
            <View style={styles.card}>
              <Text style={styles.muted}>{catalogError}</Text>
              <Button
                title="Tekrar dene"
                variant="ghost"
                onPress={() => {
                  setCatalogError(null);
                  setLoadAttempt((n) => n + 1);
                }}
              />
            </View>
          ) : (
            <ActivityIndicator color={colors.coral} style={styles.loader} />
          )}
        </Section>

        <Section title="Ritim">
          <IntervalPicker value={intervalMinutes} onChange={setIntervalMinutes} />
        </Section>

        {isLiveActivitySupported ? (
          <Section title="Kilit ekranı">
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Live Activity</Text>
                  <Text style={styles.muted}>Kart kilit ekranına ve Dynamic Island’a sabitlenir.</Text>
                </View>
                <Switch
                  value={prefs.lockScreenEnabled}
                  onValueChange={(v) => {
                    haptic.select();
                    setLockScreen(v);
                  }}
                  trackColor={{ true: colors.coral, false: colors.slate }}
                  thumbColor={colors.text}
                />
              </View>
              {snapshot?.lockScreenError && prefs.lockScreenEnabled ? (
                <Button title="iOS ayarlarında izin ver" variant="ghost" icon="gear" onPress={() => Linking.openSettings()} />
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section title="İçerik">
          <View style={styles.card}>
            <Text style={styles.muted}>
              {refreshedAt
                ? `Paketler güncel · son kontrol ${relativeTime(refreshedAt, now)}`
                : 'Yeni bilgiler yayınlandığında paketler ayarları kaydederken güncellenir. Şimdi kontrol etmek için:'}
            </Text>
            <Button
              title="Paketleri güncelle"
              variant="ghost"
              icon="arrow.clockwise"
              loading={saving && !dirty}
              onPress={() => save(true)}
              disabled={!catalog || dirty}
            />
          </View>
        </Section>

        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

        <View style={styles.footer}>
          <ShellMark size={56} />
          <Text style={styles.footerText}>
            Limpet {Constants.expoConfig?.version} · kayaya tutunan bilgiler
          </Text>
        </View>
      </ScrollView>

      {dirty ? (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOutDown.duration(180)}
          style={[styles.saveBar, { bottom: TAB_BAR_CLEARANCE + insets.bottom - 40 }]}>
          <Button
            title={topicIds.length ? 'Değişiklikleri kaydet' : 'En az bir konu seç'}
            icon="checkmark"
            loading={saving}
            disabled={!topicIds.length || !catalog}
            onPress={() => save()}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Eyebrow>{title}</Eyebrow>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 30 },
  titles: { gap: 4 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  note: { fontSize: 12, color: colors.textFaint },
  loader: { paddingVertical: 24 },
  card: {
    padding: 16,
    gap: 14,
    borderRadius: radii.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  muted: { fontSize: 13.5, lineHeight: 19, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13.5, textAlign: 'center' },
  footer: { alignItems: 'center', gap: 10, paddingTop: 8, opacity: 0.8 },
  footerText: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.textFaint },
  saveBar: { position: 'absolute', left: 20, right: 20 },
});
