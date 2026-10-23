// Limpet design tokens. The brand palette is four colors; everything else is derived from them.
// The app is intentionally dark-only: it lives "under water", like the limpet on its rock.

export const palette = {
  abyss: '#0F3040',
  slate: '#464858',
  clay: '#A56F63',
  coral: '#D99B7F',
} as const;

export const colors = {
  /** Abyss pushed ~55% toward black: the screen background. */
  bg: '#061821',
  /** Bottom of the background gradient, almost black. */
  bgDeep: '#030D13',
  /** The brand abyss, lifted one step above the background: sheets, tab bar. */
  surface: palette.abyss,
  /** Translucent cards floating over the animated background. */
  glass: 'rgba(15, 48, 64, 0.55)',
  glassStrong: 'rgba(15, 48, 64, 0.85)',
  border: 'rgba(217, 155, 127, 0.22)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  /** Primary text: warm white, the brand's light counterpart to the abyss. */
  text: '#FFFFFF',
  /** Body text on dark: white with a hint of coral. */
  textSoft: '#F4E9E2',
  /** Secondary text; slate lifted for 6:1 contrast on the background. */
  textMuted: '#A7ACBE',
  textFaint: '#7A8094',
  coral: palette.coral,
  clay: palette.clay,
  slate: palette.slate,
  onCoral: '#061821',
  danger: '#F08A7A',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  serif: 'Fraunces_400Regular',
  serifMedium: 'Fraunces_500Medium',
  serifItalic: 'Fraunces_400Regular_Italic',
} as const;

export const radii = { sm: 12, md: 18, lg: 28, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
