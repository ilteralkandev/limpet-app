import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IntervalPicker } from '@/components/IntervalPicker';
import { FloatingShell } from '@/components/Shell';
import { TopicGrid } from '@/components/TopicGrid';
import { Button, Eyebrow, Title } from '@/components/ui';
import { loadManifest } from '@/lib/content/cache';
import type { TopicSummary } from '@/lib/content/types';
import { haptic } from '@/lib/haptics';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { useAppState } from '@/state/app-state';
import { colors, fonts } from '@/theme';

const STEPS = 3;

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 26 : 8, { damping: 16 }),
    opacity: withSpring(active ? 1 : 0.35),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { savePreferences } = useAppState();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<TopicSummary[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_PREFERENCES.intervalMinutes);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Fetch the catalog while the user reads the welcome step.
  useEffect(() => {
    let cancelled = false;
    loadManifest().then(
      ({ manifest }) => !cancelled && setCatalog(manifest.topics),
      (error) => !cancelled && setCatalogError(error instanceof Error ? error.message : String(error)),
    );
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const finish = async () => {
    if (!catalog) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePreferences({ ...DEFAULT_PREFERENCES, topicIds, intervalMinutes }, catalog);
      haptic.success();
      router.replace('/');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      setSaving(false);
    }
  };

  const advance = () => {
    if (step < STEPS - 1) setStep(step + 1);
    else finish();
  };

  const canAdvance = step !== 1 || topicIds.length > 0;
  const cta = ['Başlayalım', topicIds.length ? `Devam · ${topicIds.length} konu` : 'Bir konu seç', 'Kilit ekranına sabitle'][step];

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.dots} accessibilityLabel={`Adım ${step + 1} / ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <Dot key={i} active={i === step} />
        ))}
      </View>

      <Animated.View key={step} entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(160)} style={styles.flex}>
        {step === 0 ? (
          <View style={styles.welcome}>
            <Animated.View entering={FadeIn.duration(900)}>
              <FloatingShell size={170} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(250).duration(700)} style={styles.brand}>
              Limpet
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(450).duration(700)} style={styles.tagline}>
              Kayaya tutunan bir kabuk gibi,{'\n'}kilit ekranına tutunan küçük bilgiler.
            </Animated.Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.titles}>
              <Eyebrow>{step === 1 ? 'Adım 1 · İlgi alanları' : 'Adım 2 · Ritim'}</Eyebrow>
              <Title>{step === 1 ? 'Neyi merak ediyorsun?' : 'Ne sıklıkla yenilensin?'}</Title>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'Seçtiğin konular telefonuna iner; sonra internet olmadan da çalışır.'
                  : 'Kart, seçtiğin ritimde kilit ekranında kendiliğinden değişir.'}
              </Text>
            </View>
            {step === 1 ? (
              catalog ? (
                <TopicGrid
                  topics={catalog}
                  selected={topicIds}
                  onToggle={(id) => setTopicIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]))}
                />
              ) : catalogError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.error}>{catalogError}</Text>
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
              )
            ) : (
              <IntervalPicker value={intervalMinutes} onChange={setIntervalMinutes} />
            )}
          </ScrollView>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Button
          title={cta}
          icon={step === STEPS - 1 ? 'pin.fill' : 'arrow.right'}
          onPress={advance}
          disabled={!canAdvance}
          loading={saving}
        />
        {step > 0 ? (
          <Button title="Geri" variant="ghost" onPress={() => setStep(step - 1)} disabled={saving} style={styles.back} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.coral },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 32 },
  brand: { fontFamily: fonts.displayBold, fontSize: 56, color: colors.text, letterSpacing: -1.5, marginTop: 12 },
  tagline: { fontFamily: fonts.serifItalic, fontSize: 19, lineHeight: 28, color: colors.textMuted, textAlign: 'center' },
  stepContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 24 },
  titles: { gap: 8, paddingTop: 12 },
  subtitle: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
  loader: { paddingVertical: 40 },
  errorBox: { gap: 12 },
  error: { color: colors.danger, fontSize: 13.5, textAlign: 'center' },
  footer: { paddingHorizontal: 20, gap: 10 },
  back: { minHeight: 46 },
});
