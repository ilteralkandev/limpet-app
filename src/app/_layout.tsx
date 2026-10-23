// Registers the background task at module scope; must stay imported here.
import '@/tasks/rotate-task';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'Limpet' }} />
        <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
