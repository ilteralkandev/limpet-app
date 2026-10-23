// Registers the background task at module scope; must stay imported here.
import '@/tasks/rotate-task';

import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Ocean } from '@/components/Ocean';
import { AppStateProvider } from '@/state/app-state';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Navigators paint their own background; keep it transparent so the shared <Ocean /> shows through.
const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: colors.surface, primary: colors.coral, text: colors.text },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* One shared ocean behind every screen, so waves keep flowing across navigation. */}
      <Ocean />
      <ThemeProvider value={navigationTheme}>
        <AppStateProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade',
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack>
        </AppStateProvider>
      </ThemeProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
