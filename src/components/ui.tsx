import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: theme.accent }
          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        { opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.accentText : theme.text} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? theme.accentText : theme.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.accentText : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, children, style }: { title: string; children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
