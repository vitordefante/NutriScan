import { StyleSheet, View } from 'react-native';

import { cores } from '@/theme/tokens';

const CANTO = 34;
const ESPESSURA = 6;

/** Moldura do scanner: quatro cantos e a linha de leitura, em branco sobre a câmera. */
export function Visor() {
  return (
    <View style={estilos.visor} pointerEvents="none">
      <View
        style={[
          estilos.canto,
          { top: 0, left: 0, borderTopWidth: ESPESSURA, borderLeftWidth: ESPESSURA },
        ]}
      />
      <View
        style={[
          estilos.canto,
          { top: 0, right: 0, borderTopWidth: ESPESSURA, borderRightWidth: ESPESSURA },
        ]}
      />
      <View
        style={[
          estilos.canto,
          { bottom: 0, left: 0, borderBottomWidth: ESPESSURA, borderLeftWidth: ESPESSURA },
        ]}
      />
      <View
        style={[
          estilos.canto,
          { bottom: 0, right: 0, borderBottomWidth: ESPESSURA, borderRightWidth: ESPESSURA },
        ]}
      />
      <View style={estilos.linha} />
    </View>
  );
}

const estilos = StyleSheet.create({
  visor: { width: 270, height: 170 },
  canto: { position: 'absolute', width: CANTO, height: CANTO, borderColor: cores.papel },
  linha: {
    position: 'absolute',
    top: 83,
    left: 18,
    right: 18,
    height: 4,
    backgroundColor: cores.papel,
  },
});
