import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useAppState } from '@/state/app-state';

export default function TabsLayout() {
  const { ready, prefs } = useAppState();
  if (!ready) return null;
  if (!prefs.topicIds.length) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
