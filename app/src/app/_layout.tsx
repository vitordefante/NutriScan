import { Stack } from 'expo-router';

/**
 * Layout raiz: um Stack que contém as abas.
 * Telas de detalhe (ex.: produto/[barcode], produtor/[id]) ficarão neste Stack,
 * abrindo por cima das abas.
 */
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
