import { StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';

import { Texto } from './texto';

type Props = {
  texto: string;
  /** Sem fundo por padrão (ex.: tipo e subtipo do produto). */
  fundo?: string;
  tamanho?: 'p' | 'm';
};

/** Etiqueta com borda e texto pixel em caixa alta. */
export function Etiqueta({ texto, fundo, tamanho = 'p' }: Props) {
  return (
    <View
      style={[
        estilos.base,
        tamanho === 'm' && estilos.media,
        fundo !== undefined && { backgroundColor: fundo },
      ]}
    >
      <Texto variante="pixel" style={{ fontSize: tamanho === 'm' ? 11 : 10 }}>
        {texto.toLocaleUpperCase('pt-BR')}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  /** Mesma altura do botão "?" (28) para os dois ficarem alinhados. */
  media: { paddingHorizontal: 8, height: 28, paddingVertical: 0 },
});
