import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { cores } from '@/theme/tokens';

// A splash fica na tela até as fontes carregarem (evita o texto "piscar" com a fonte do sistema).
void SplashScreen.preventAutoHideAsync();

/**
 * Layout raiz: carrega as fontes e define o Stack.
 * As abas ficam em (tabs); as telas de produto abrem por cima delas.
 */
export default function RootLayout() {
  const [carregadas, erro] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Silkscreen_400Regular,
  });
  const pronto = carregadas || erro !== null;

  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.papel } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="produto/[barcode]/index" />
        <Stack.Screen name="produto/[barcode]/por-que" />
        <Stack.Screen
          name="digitar-codigo"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.45],
            sheetGrabberVisible: true,
          }}
        />
      </Stack>
    </>
  );
}
