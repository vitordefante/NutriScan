import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cores, espaco } from '@/theme/tokens';

const DESLOCAMENTO = 8;

type Props = {
  children: ReactNode;
  /** Estilo da face (fundo, padding, gap...). A borda e o fundo papel já vêm por padrão. */
  style?: StyleProp<ViewStyle>;
};

/** Cartão com uma "folha de trás" deslocada: a sensação de cartões sobrepostos. */
export function CartaoEmPilha({ children, style }: Props) {
  return (
    <View style={estilos.pilha}>
      <View style={estilos.folhaDeTras} />
      <View style={[estilos.face, style]}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pilha: { marginRight: DESLOCAMENTO, marginBottom: DESLOCAMENTO },
  folhaDeTras: {
    position: 'absolute',
    top: DESLOCAMENTO,
    left: DESLOCAMENTO,
    right: -DESLOCAMENTO,
    bottom: -DESLOCAMENTO,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.papel,
  },
  face: { borderWidth: espaco.borda, borderColor: cores.tinta, backgroundColor: cores.papel },
});
