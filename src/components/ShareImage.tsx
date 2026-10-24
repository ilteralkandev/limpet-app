import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { SFSymbol } from 'sf-symbols-typescript';

import { ShellMark } from '@/components/Shell';
import type { Card } from '@/lib/rotation';
import { shareCard } from '@/lib/share';
import { colors, fonts, palette } from '@/theme';

// Artwork is laid out at 360×450 dp; on 3x screens the capture is 1080×1350 (4:5, fits every feed).
const ART_WIDTH = 360;
const ART_HEIGHT = 450;

type ShareImageValue = { shareImage: (card: Card) => Promise<void> };

const Context = createContext<ShareImageValue | null>(null);

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Renders the share artwork off-screen, captures it as a PNG and opens the share sheet.
 * Falls back to plain text if capturing fails.
 */
export function ShareImageProvider({ children }: { children: ReactNode }) {
  const [card, setCard] = useState<Card | null>(null);
  const artRef = useRef<ComponentRef<typeof View>>(null);
  const busy = useRef(false);

  const shareImage = useCallback(async (next: Card) => {
    if (busy.current) return;
    busy.current = true;
    try {
      setCard(next);
      // Let the artwork mount and lay out before capturing it.
      await nextFrame();
      await nextFrame();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const uri = await captureRef(artRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Share.share({ url: uri });
    } catch {
      await shareCard(next);
    } finally {
      setCard(null);
      busy.current = false;
    }
  }, []);

  const value = useMemo(() => ({ shareImage }), [shareImage]);

  return (
    <Context.Provider value={value}>
      {children}
      {card ? (
        <View ref={artRef} collapsable={false} style={styles.offscreen} pointerEvents="none">
          <ShareArt card={card} />
        </View>
      ) : null}
    </Context.Provider>
  );
}

export function useShareImage(): ShareImageValue {
  const value = useContext(Context);
  if (!value) throw new Error('useShareImage must be used inside ShareImageProvider');
  return value;
}

function ShareArt({ card }: { card: Card }) {
  // Long facts get a smaller size so every fact (up to 160 characters) fits the frame.
  const fontSize = card.text.length > 120 ? 22 : card.text.length > 80 ? 25 : 28;
  return (
    <View style={styles.art}>
      <LinearGradient
        colors={[colors.surface, colors.bg, colors.bgDeep]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />
      <Text style={styles.quote}>“</Text>

      <View style={styles.brand}>
        <ShellMark size={44} />
        <Text style={styles.wordmark}>Limpet</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.chip}>
          <SymbolView name={card.symbol as SFSymbol} size={13} tintColor={colors.coral} weight="semibold" />
          <Text style={styles.chipText}>{card.topicTitle}</Text>
        </View>
        <Text style={[styles.text, { fontSize, lineHeight: fontSize * 1.38 }]}>{card.text}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.rule} />
        <Text style={styles.footerText}>kayaya tutunan bilgiler</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -ART_WIDTH * 3, top: 0, width: ART_WIDTH, height: ART_HEIGHT },
  art: { width: ART_WIDTH, height: ART_HEIGHT, padding: 32, justifyContent: 'space-between', overflow: 'hidden' },
  glow: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: palette.coral,
    opacity: 0.07,
  },
  quote: {
    position: 'absolute',
    top: 70,
    left: 18,
    fontFamily: fonts.displayBold,
    fontSize: 190,
    lineHeight: 210,
    color: colors.coral,
    opacity: 0.09,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  body: { gap: 18 },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 155, 127, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 155, 127, 0.28)',
  },
  chipText: { color: colors.coral, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  text: { fontFamily: fonts.serifMedium, color: colors.text, letterSpacing: -0.2 },
  footer: { gap: 10 },
  rule: { height: 1, backgroundColor: 'rgba(217, 155, 127, 0.28)' },
  footerText: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.textMuted },
});
