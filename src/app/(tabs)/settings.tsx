import Constants from 'expo-constants';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_BASE_URL } from '@/config';
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

const LEGAL_LINKS = [
  { label: 'Gizlilik Politikası', path: 'privacy.html' },
  { label: 'Kullanım Koşulları', path: 'terms.html' },
  { label: 'Destek', path: 'support.html' },
] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { prefs, snapshot, savePreferences, setSurfaces, setNotifications, updateContent } = useAppState();
  const [catalog, setCatalog] = useState<TopicSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [notificationsDenied, setNotificationsDenied] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [topicIds, setTopicIds] = useState(prefs.topicIds);
  const toggleTopic = useCallback(
    (id: string) => setTopicIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id])),
    [],
  );
  const [intervalMinutes, setIntervalMinutes] = useState(prefs.intervalMinutes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [update, setUpdate] = useState<{ at: number; downloaded: number } | null>(null);
  const [updating, setUpdating] = useState(false);
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

  const save = async () => {
    if (!catalog) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePreferences({ ...prefs, topicIds, intervalMinutes }, catalog);
      haptic.success();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  // Re-reads the catalog from the host, so it never judges against a stale list.
  const checkForUpdates = async () => {
    setUpdating(true);
    setSaveError(null);
    try {
      const downloaded = await updateContent();
      setUpdate({ at: Date.now(), downloaded });
      haptic.success();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setUpdating(false);
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
              onToggle={toggleTopic}
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
          <Section title="kilit ekranı">
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Kilit ekranında göster</Text>
                  <Text style={styles.muted}>Kart kilit ekranına sabitlenir.</Text>
                </View>
                <Switch
                  value={prefs.lockScreenEnabled}
                  onValueChange={(v) => {
                    haptic.select();
                    setSurfaces({ lockScreenEnabled: v });
                  }}
                  trackColor={{ true: colors.coral, false: colors.slate }}
                  thumbColor={colors.text}
                />
              </View>
              {prefs.islandCapable ? (
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Dynamic Island’da göster</Text>
                    <Text style={styles.muted}>Kabuk adanın içinde küçük bir simge olarak durur.</Text>
                  </View>
                  <Switch
                    value={prefs.islandEnabled}
                    onValueChange={(v) => {
                      haptic.select();
                      setSurfaces({ islandEnabled: v });
                    }}
                    trackColor={{ true: colors.coral, false: colors.slate }}
                    thumbColor={colors.text}
                  />
                </View>
              ) : null}
              {snapshot?.lockScreenError && (prefs.lockScreenEnabled || (prefs.islandEnabled && prefs.islandCapable)) ? (
                <Button title="iOS ayarlarında izin ver" variant="ghost" icon="gear" onPress={() => Linking.openSettings()} />
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section title="bildirimler">
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Bilgi bildirimleri</Text>
                <Text style={styles.muted}>
                  Bilgiler seçtiğin ritimde bildirim olarak da gelir. Bildirimi kaydırıp sildiğinde ya da uygulamayı açtığında bir sonraki gelir; yanıtsız kalanlar birikmez. Gece 23:00–08:00 arası sessizdir.
                </Text>
              </View>
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={async (v) => {
                  haptic.select();
                  setNotificationsDenied(false);
                  const on = await setNotifications(v);
                  if (v && !on) setNotificationsDenied(true);
                }}
                trackColor={{ true: colors.coral, false: colors.slate }}
                thumbColor={colors.text}
              />
            </View>
            {notificationsDenied ? (
              <Button title="iOS ayarlarında izin ver" variant="ghost" icon="gear" onPress={() => Linking.openSettings()} />
            ) : null}
          </View>
        </Section>

        <Section title="İçerik">
          <View style={styles.card}>
            <Text style={styles.muted}>
              {update
                ? `${update.downloaded ? `${update.downloaded} paket güncellendi` : 'Paketler güncel'} · son kontrol ${relativeTime(update.at, now)}`
                : 'Yeni bilgiler yayınlandığında paketler kendiliğinden güncellenir (en fazla 6 saatte bir). Şimdi kontrol etmek için:'}
            </Text>
            <Text style={styles.muted}>
              Uygulamanın ilk sürümlerinde bilgi sayısı sınırlıdır; yeni bilgiler eklendikçe konular genişleyecek.
            </Text>
            <Button
              title="Paketleri güncelle"
              variant="ghost"
              icon="arrow.clockwise"
              loading={updating}
              onPress={checkForUpdates}
              disabled={saving || dirty}
            />
          </View>
        </Section>

        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

        <View style={styles.legalRow}>
          {LEGAL_LINKS.map((link) => (
            <Pressable
              key={link.path}
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => Linking.openURL(`${CONTENT_BASE_URL}/legal/${link.path}`)}>
              <Text style={styles.legalLink}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <ShellMark size={56} />
          <Text style={styles.footerText}>
            Limpet {Constants.expoConfig?.version} · kayaya tutunan bilgiler
          </Text>
          <Text style={styles.credit}>
            Bilgiler genel kültür amaçlıdır; tıbbi, hukuki veya finansal tavsiye değildir.
          </Text>
          <Text style={styles.credit}>
            Bazı bilgiler Vikipedi’den alınmıştır (CC BY-SA 4.0): “Genel Kültür” ve “Tarihte Bugün” konuları.
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
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, paddingTop: 8 },
  legalLink: { fontSize: 13, color: colors.coral, textDecorationLine: 'underline' },
  credit: { fontSize: 11, lineHeight: 15, textAlign: 'center', color: colors.textFaint, paddingHorizontal: 24 },
  saveBar: { position: 'absolute', left: 20, right: 20 },
});
