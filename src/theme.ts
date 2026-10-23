import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  accent: '#0D9488',
  accentText: '#FFFFFF',
  danger: '#DC2626',
  // The preview mimics the lock screen, which is always dark-tinted.
  lockCard: '#1E293B',
  lockCardText: '#F8FAFC',
  lockCardAccent: '#2DD4BF',
};

const dark: typeof light = {
  background: '#0B1120',
  surface: '#111827',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#1F2937',
  accent: '#2DD4BF',
  accentText: '#042F2E',
  danger: '#F87171',
  lockCard: '#1E293B',
  lockCardText: '#F8FAFC',
  lockCardAccent: '#2DD4BF',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
