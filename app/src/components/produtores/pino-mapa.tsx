import type { ProducerCategory } from '@nutriscan/shared';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { cores, espaco, fontes } from '@/theme/tokens';

import { IconeCategoria } from './icone-categoria';

type Props = {
  categoria: ProducerCategory;
  /** Produtores neste ponto (uma feira pode ter vários). */
  quantos: number;
  selecionado: boolean;
};

/** Pino do mapa: o ícone da categoria com a sombra sólida dos botões e, se houver, o número. */
export function PinoMapa({ categoria, quantos, selecionado }: Props) {
  return (
    <View style={estilos.pino}>
      <View style={estilos.sombra} />
      <IconeCategoria categoria={categoria} tamanho={36} invertido={selecionado} />
      {quantos > 1 && (
        <View style={estilos.contador}>
          <Texto style={estilos.numero}>{quantos}</Texto>
        </View>
      )}
    </View>
  );
}

const SOMBRA = 3;

const estilos = StyleSheet.create({
  // Espaço para a sombra e o contador não serem cortados pelo marcador.
  pino: { paddingRight: SOMBRA + 6, paddingBottom: SOMBRA, paddingTop: 6 },
  sombra: {
    position: 'absolute',
    top: 6 + SOMBRA,
    left: SOMBRA,
    width: 36,
    height: 36,
    backgroundColor: cores.tinta,
  },
  contador: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    backgroundColor: cores.tinta,
    borderWidth: espaco.borda,
    borderColor: cores.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontFamily: fontes.pixel, fontSize: 9, color: cores.papel },
});
