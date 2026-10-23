import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Section } from '@/components/ui';
import { loadManifest } from '@/lib/content/cache';
import type { TopicSummary } from '@/lib/content/types';
import { applyPreferences } from '@/lib/engine';
import { INTERVAL_OPTIONS, loadPreferences, type Preferences } from '@/lib/preferences';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const [catalog, setCatalog] = useState<TopicSummary[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadManifest(), loadPreferences()]).then(
      ([{ manifest, offline }, stored]) => {
        if (cancelled) return;
        setCatalog(manifest.topics);
        setOffline(offline);
        setPrefs(stored);
        setIsFirstRun(stored.topicIds.length === 0);
      },
      (error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  if (loadError) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={[styles.errorTitle, { color: theme.text }]}>Konular yüklenemedi</Text>
        <Text style={[styles.muted, { color: theme.textMuted }]}>{loadError}</Text>
        <Button
          title="Tekrar dene"
          onPress={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }
  if (!catalog || !prefs) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const toggleTopic = (id: string) =>
    setPrefs({
      ...prefs,
      topicIds: prefs.topicIds.includes(id) ? prefs.topicIds.filter((t) => t !== id) : [...prefs.topicIds, id],
    });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await applyPreferences(prefs, catalog);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {isFirstRun ? (
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: theme.text }]}>Hoş geldin 👋</Text>
          <Text style={[styles.muted, { color: theme.textMuted }]}>
            İlgi alanlarını ve sıklığı seç; kilit ekranına kısa bilgiler sabitleyelim.
          </Text>
        </View>
      ) : null}

      {offline ? (
        <Text style={[styles.muted, { color: theme.textMuted }]}>
          Çevrimdışısın; kayıtlı konu listesi gösteriliyor.
        </Text>
      ) : null}

      <Section title="İlgi alanları">
        {catalog.map((topic) => {
          const selected = prefs.topicIds.includes(topic.id);
          return (
            <Pressable
              key={topic.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleTopic(topic.id)}
              style={[
                styles.topic,
                { backgroundColor: theme.surface, borderColor: selected ? theme.accent : theme.border },
              ]}>
              <View style={styles.topicText}>
                <Text style={[styles.topicTitle, { color: theme.text }]}>{topic.title}</Text>
                <Text style={[styles.muted, { color: theme.textMuted }]}>
                  {topic.description} · {topic.count} bilgi
                </Text>
              </View>
              <View
                style={[
                  styles.check,
                  selected
                    ? { backgroundColor: theme.accent, borderColor: theme.accent }
                    : { borderColor: theme.border },
                ]}>
                {selected ? <Text style={[styles.checkMark, { color: theme.accentText }]}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </Section>

      <Section title="Yenileme sıklığı">
        <View style={styles.chips}>
          {INTERVAL_OPTIONS.map((option) => (
            <Chip
              key={option.minutes}
              label={option.label}
              selected={prefs.intervalMinutes === option.minutes}
              onPress={() => setPrefs({ ...prefs, intervalMinutes: option.minutes })}
            />
          ))}
        </View>
      </Section>

      {saveError ? <Text style={[styles.muted, { color: theme.danger }]}>{saveError}</Text> : null}

      <Button
        title={isFirstRun ? 'Başla' : 'Kaydet'}
        loading={saving}
        disabled={!prefs.topicIds.length}
        onPress={save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 16, gap: 24 },
  intro: { gap: 6 },
  introTitle: { fontSize: 24, fontWeight: '700' },
  errorTitle: { fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, lineHeight: 18 },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  topicText: { flex: 1, gap: 2 },
  topicTitle: { fontSize: 16, fontWeight: '600' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
