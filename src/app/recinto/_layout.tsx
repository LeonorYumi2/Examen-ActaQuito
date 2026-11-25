import { Tabs } from 'expo-router';
import { EditorialBottomTabBar } from '@/components/ui/editorial-bottom-nav';

export default function RecintoTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <EditorialBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      backBehavior="initialRoute"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Recinto',
        }}
      />
      <Tabs.Screen
        name="veedores"
        options={{
          title: 'Veedores',
        }}
      />
      <Tabs.Screen
        name="actas"
        options={{
          title: 'Actas',
        }}
      />
      <Tabs.Screen
        name="invitar-veedor"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
