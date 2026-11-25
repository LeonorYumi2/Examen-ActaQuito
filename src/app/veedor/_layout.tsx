import { Tabs } from 'expo-router';
import { EditorialBottomTabBar } from '@/components/ui/editorial-bottom-nav';

export default function VeedorTabsLayout() {
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
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="actas"
        options={{
          title: 'Registro',
        }}
      />
    </Tabs>
  );
}
