import React from 'react';
import { BentoDashboardDemoScreen } from '@/features/monitoreo/presentation/screens/BentoDashboardDemoScreen';

/**
 * Ruta temporal de demostración (Fase 3A)
 *
 * Expone BentoDashboardDemoScreen bajo la ruta "/demo" en Expo Router.
 * Permite previsualizar la identidad Bento UI + Material 3 Expressive
 * en emuladores Android o Expo Go sin tocar las pantallas de autenticación ni el backend.
 */
export default function DemoRoute() {
  return <BentoDashboardDemoScreen />;
}
