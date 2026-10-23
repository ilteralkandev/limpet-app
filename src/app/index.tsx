import { Link, Redirect, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { CardPreview } from '@/components/CardPreview';
import { Button, Section } from '@/components/ui';
import { isLiveActivitySupported } from '@/live-activity';
import { rotate, setLockScreenEnabled, type Snapshot } from '@/lib/engine';
import { INTERVAL_OPTIONS, loadPreferences, type Preferences } from '@/lib/preferences';
import { useTheme } from '@/theme';

// While the app is open, check this often whether the card is due.
const FOREGROUND_POLL_MS = 30_000;

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export default function HomeScreen() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (force = false) => {
    const loaded = await loadPreferences();
    setPrefs(loaded);
    if (loaded.topicIds.length) setSnapshot(await rotate({ force }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, FOREGROUND_POLL_MS);
      const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
      return () => {
        clearInterval(timer);
        sub.remove();
      };
    }, [refresh]),
  );

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  if (!prefs) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  if (!prefs.topicIds.length) return <Redirect href="/settings" />;

  const interval = INTERVAL_OPTIONS.find((o) => o.minutes === prefs.intervalMinutes)?.label ?? `${prefs.intervalMinutes} dk`;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" style={[styles.headerLink, { color: theme.accent }]}>
              Ayarlar
            </Link>
          ),
        }}
      />

      <CardPreview card={snapshot?.card ?? null} />

      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {snapshot?.nextUpdateAt
          ? `Her ${interval} yenilenir · sıradaki ≈ ${formatTime(snapshot.nextUpdateAt)}`
          : 'Kartlar hazırlanıyor…'}
        {snapshot ? ` · ${snapshot.deckSize} bilgi` : ''}
      </Text>

      <Button title="Sonraki bilgi" variant="secondary" loading={busy} onPress={() => run(() => refresh(true))} />

      <Section title="Kilit ekranı">
        <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Kilit ekranında göster</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
              {isLiveActivitySupported
                ? 'Live Activity olarak sabitlenir.'
                : 'Live Activity yalnızca iOS 16.2+ cihazlarda çalışır.'}
            </Text>
          </View>
          <Switch
            value={prefs.lockScreenEnabled}
            disabled={busy || !isLiveActivitySupported}
            trackColor={{ true: theme.accent }}
            onValueChange={(enabled) =>
              run(async () => {
                setPrefs({ ...prefs, lockScreenEnabled: enabled });
                setSnapshot(await setLockScreenEnabled(enabled));
              })
            }
          />
        </View>
        {snapshot?.lockScreenError ? (
          <Text style={[styles.error, { color: theme.danger }]}>
            Kilit ekranı güncellenemedi: {snapshot.lockScreenError}
            {'\n'}Ayarlar → Limpet → Canlı Etkinlikler açık mı kontrol et.
          </Text>
        ) : null}
      </Section>

      <Text style={[styles.footnote, { color: theme.textMuted }]}>
        Uygulama kapalıyken iOS güncellemeleri kendi takvimine göre çalıştırır; kart seçtiğin aralıktan geç
        yenilenebilir. Uygulamayı açtığında hemen güncellenir.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 20 },
  headerLink: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, textAlign: 'center', marginTop: -8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSubtitle: { fontSize: 13 },
  error: { fontSize: 13 },
  footnote: { fontSize: 12, lineHeight: 17 },
});
