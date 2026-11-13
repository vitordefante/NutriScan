import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconePixel } from './icone-pixel';
import { Texto } from './texto';

type Props = {
  titulo: ReactNode;
  onVoltar?: () => void;
};

/** Barra do topo com título pixel centralizado e botão de voltar opcional. */
export function CabecalhoTela({ titulo, onVoltar }: Props) {
  return (
    <View style={estilos.barra}>
      <View style={estilos.lado}>
        {onVoltar && (
          <Pressable
            onPress={onVoltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={estilos.voltar}
          >
            <IconePixel nome="voltar" />
          </Pressable>
        )}
      </View>
      <Texto variante="pixel" style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Texto>
      <View style={estilos.lado} />
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lado: { width: 44 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 16 },
});
