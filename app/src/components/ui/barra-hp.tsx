import { StyleSheet, View } from 'react-native';

import { cores, espaco } from '@/theme/tokens';

const BLOCOS = 20;

type Props = {
  /** 0 a 100. */
  valor: number;
  cor: string;
  altura?: number;
  /** Sobre fundo escuro: moldura branca e blocos vazios em cinza-escuro. */
  escura?: boolean;
};

/** Barra de HP: 20 blocos de 5 pontos cada. */
export function BarraHp({ valor, cor, altura = 18, escura = false }: Props) {
  const cheios = Math.round(Math.max(0, Math.min(100, valor)) / (100 / BLOCOS));
  const vazio = escura ? cores.vazioEscuro : cores.vazio;
  return (
    <View
      style={[estilos.moldura, escura && { borderColor: cores.papel }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: valor }}
    >
      {Array.from({ length: BLOCOS }, (_, i) => (
        <View
          key={i}
          style={[estilos.bloco, { height: altura, backgroundColor: i < cheios ? cor : vazio }]}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  moldura: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderWidth: espaco.borda,
    borderColor: cores.tinta,
  },
  bloco: { flex: 1 },
});
