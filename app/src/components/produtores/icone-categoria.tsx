import type { ProducerCategory } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { IconePixel } from '@/components/ui/icone-pixel';
import { cores, espaco } from '@/theme/tokens';

type Props = {
  categoria: ProducerCategory;
  /** Lado do quadrado, em pontos. */
  tamanho?: number;
  /** Pino escolhido: face preta com borda branca (como o botão primário), para a sombra aparecer. */
  invertido?: boolean;
};

/** Quadrado com o ícone pixel da categoria (pino do mapa, lista e detalhe). */
export function IconeCategoria({ categoria, tamanho = 44, invertido = false }: Props) {
  return (
    <View
      style={[
        estilos.quadro,
        { width: tamanho, height: tamanho },
        invertido && { backgroundColor: cores.tinta, borderColor: cores.papel },
      ]}
    >
      <IconePixel
        nome={categoria}
        escala={tamanho >= 40 ? 2 : 1.5}
        cor={invertido ? cores.papel : cores.tinta}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  quadro: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    backgroundColor: cores.destaque,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
