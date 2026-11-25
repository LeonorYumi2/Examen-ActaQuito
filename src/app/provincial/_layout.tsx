import { Tabs } from 'expo-router';
import { EditorialBottomTabBar } from '@/components/ui/editorial-bottom-nav';

export default function ProvincialTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <EditorialBottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      backBehavior="initialRoute"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
        }}
      />
      <Tabs.Screen
        name="recintos"
        options={{
          title: 'Recintos',
        }}
      />
      <Tabs.Screen
        name="resultados"
        options={{
          title: 'Resultados',
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
        }}
      />
      <Tabs.Screen
        name="invitar-coordinador"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
