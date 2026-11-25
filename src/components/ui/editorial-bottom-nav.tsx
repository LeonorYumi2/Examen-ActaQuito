import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  Building2,
  TrendingUp,
  MapPin,
  Users,
  FileText,
  FileCheck2,
  Vote,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react-native';
import { BrandColors, FontFamilies } from '@/constants/tokens';

export interface EditorialBottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarLabel?: string | ((props: any) => React.ReactNode);
        tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
        href?: string | null;
        tabBarStyle?: any;
      };
    }
  >;
  navigation: any;
  insets?: any;
}

function getIconForRoute(routeName: string, title?: string): LucideIcon {
  const norm = (routeName || '').toLowerCase();
  const titleNorm = (title || '').toLowerCase();

  if (norm === 'index') {
    if (titleNorm.includes('recinto')) return Building2;
    if (titleNorm.includes('inicio') || titleNorm.includes('mesa')) return Vote;
    return LayoutDashboard;
  }
  if (norm === 'recintos' || titleNorm.includes('recinto')) return Building2;
  if (norm === 'resultados' || titleNorm.includes('resultado')) return TrendingUp;
  if (norm === 'mapa' || titleNorm.includes('mapa')) return MapPin;
  if (norm === 'veedores' || titleNorm.includes('veedor')) return Users;
  if (norm === 'actas' || titleNorm.includes('acta')) return FileCheck2;

  return FileText;
}

interface TabItemProps {
  name: string;
  title: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
}

const TabItem: React.FC<TabItemProps> = ({
  name,
  title,
  isFocused,
  onPress,
  onLongPress,
  tabBarIcon,
}) => {
  const animatedPillStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isFocused ? BrandColors.azulPrincipal : 'transparent', {
      duration: 180,
    }),
    transform: [
      {
        scale: withTiming(isFocused ? 1 : 0.94, { duration: 180 }),
      },
    ],
  }));

  const activeColor = '#FFFFFF';
  const inactiveColor = BrandColors.grisAzulado; // #8BA0B3
  const iconColor = isFocused ? activeColor : inactiveColor;
  const textColor = isFocused ? activeColor : inactiveColor;

  const IconComponent = getIconForRoute(name, title);

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={title}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.pillContainer, animatedPillStyle]}>
        {tabBarIcon ? (
          tabBarIcon({ focused: isFocused, color: iconColor, size: 18 })
        ) : (
          <IconComponent size={18} color={iconColor} strokeWidth={isFocused ? 2.2 : 1.8} />
        )}
        <Text
          style={[
            styles.tabText,
            { color: textColor },
            isFocused && styles.tabTextActive,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const EditorialBottomTabBar: React.FC<EditorialBottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Ocultar si el teclado está desplegado (evita colisiones con campos de texto)
  if (isKeyboardVisible) {
    return null;
  }

  // Comprobar si la pantalla activa solicita ocultar la barra (ej: formularios, modales)
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options;
  if (
    currentOptions?.tabBarStyle &&
    (currentOptions.tabBarStyle as any).display === 'none'
  ) {
    return null;
  }

  // Filtrar rutas que no deben aparecer en la barra (ej: formularios, rutas secundarias)
  const hiddenRoutes = ['invitar-coordinador', 'invitar-veedor'];
  const visibleRoutes = state.routes.filter((route) => {
    if (hiddenRoutes.includes(route.name)) return false;
    const options = descriptors[route.key]?.options;
    if (options?.href === null || (options as any)?.href === false) return false;
    if ((options as any)?.tabBarItemStyle?.display === 'none') return false;
    if ((options as any)?.tabBarButton === null) return false;
    return true;
  });

  // Separación visual inferior de aproximadamente 14–16 dp respecto al área segura / gestos
  const bottomOffset = Math.max(insets.bottom, 10) + 14;

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          bottom: bottomOffset,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.islandCapsule}>
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const isFocused = state.routes[state.index].key === route.key;
            const { options } = descriptors[route.key];
            const rawTitle =
              options.tabBarLabel !== undefined
                ? String(options.tabBarLabel)
                : options.title !== undefined
                ? options.title
                : route.name;

            const title =
              rawTitle === 'index'
                ? 'Resumen'
                : rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                name={route.name}
                title={title}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                tabBarIcon={options.tabBarIcon as any}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
    zIndex: 999,
  },
  islandCapsule: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: BrandColors.azulTitulos, // #253D59
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(64, 92, 121, 0.55)', // Acento sutil en #405C79
    paddingVertical: 5,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#0A131C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 48,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 44,
  },
  pillContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 22,
    gap: 3,
    minWidth: 52,
  },
  tabText: {
    fontFamily: FontFamilies.titleSemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    fontFamily: FontFamilies.titleBold,
    color: '#FFFFFF',
  },
});
