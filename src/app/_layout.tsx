import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthBootstrap } from '@/features/auth/presentation/AuthBootstrap';
import { useAuth } from '@/features/auth/presentation/auth-state';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const access = useAuth((state) => state.access);
  const role = access?.kind === 'operational' ? access.profile.role : null;

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthBootstrap />

      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="demo"
          options={{
            title: 'Prototipo ActaQuito',
            headerShown: true,
          }}
        />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
        <Stack.Protected guard={role === 'provincial'}>
          <Stack.Screen name="provincial" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === 'recinto'}>
          <Stack.Screen name="recinto" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === 'veedor'}>
          <Stack.Screen name="veedor" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={role === 'veedor' || role === 'recinto'}>
          <Stack.Screen name="actas" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
