import { StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';

import { IconePixel } from './icone-pixel';
import { Texto } from './texto';

/** Caixa amarela de aviso (erro de formulário, atenção), lida pelo leitor de tela ao aparecer. */
export function Aviso({ children }: { children: string }) {
  return (
    <View style={estilos.aviso} accessibilityLiveRegion="polite">
      <IconePixel nome="alerta" />
      <Texto style={estilos.texto}>{children}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: cores.avisoClaro,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    padding: 14,
  },
  texto: { flex: 1, fontSize: 14, lineHeight: 20 },
});
