import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { cores } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /**
   * Tela dentro das abas: respeita também a borda de baixo. No iOS 26+ a barra de abas é
   * flutuante e fica por cima do conteúdo; a área segura nativa já desconta a altura dela
   * (a de react-native-safe-area-context não desconta).
   */
  comAbas?: boolean;
};

/** Fundo da tela respeitando a área segura (notch / Dynamic Island / barra de abas). */
export function Tela({ children, comAbas = false }: Props) {
  return (
    <SafeAreaView edges={{ top: true, bottom: comAbas }} style={estilos.tela}>
      {children}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.papel },
});
