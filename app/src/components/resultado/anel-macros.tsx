import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Texto } from '@/components/ui/texto';
import { type Macro, ORDEM_MACROS } from '@/lib/nutricao';
import { cores, coresMacros } from '@/theme/tokens';

/** Grade do anel: ímpar, para ter um bloco no centro exato. */
const BLOCOS = 25;
const RAIO_EXTERNO = BLOCOS / 2;
const RAIO_INTERNO = BLOCOS * 0.31;

type Props = {
  /** Fração (0–1) da energia de cada macro; null pinta o anel vazio. */
  divisao: Record<Macro, number> | null;
  tamanho: number;
  /** Texto grande no centro (ex.: "128") e a legenda abaixo dele (ex.: "kcal · 30 g"). */
  valor: string;
  legenda: string;
};

type Bloco = { x: number; y: number; cor: string };

/**
 * Anel de energia em pixel art: blocos de uma grade, coloridos pelo ângulo (começa no topo, no
 * sentido horário), com contorno de tinta por dentro e por fora — o mesmo traço da barra de HP.
 */
export function AnelMacros({ divisao, tamanho, valor, legenda }: Props) {
  const lado = tamanho / BLOCOS;
  const blocos = montarBlocos(divisao);
  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <Svg width={tamanho} height={tamanho}>
        {blocos.map((b) => (
          <Rect
            key={`${b.x}-${b.y}`}
            x={b.x * lado}
            y={b.y * lado}
            // Um pouco maior que o bloco: sem frestas entre os vizinhos no arredondamento.
            width={lado + 0.5}
            height={lado + 0.5}
            fill={b.cor}
          />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, estilos.centro]} pointerEvents="none">
        <Texto variante="pixel" style={estilos.valor}>
          {valor}
        </Texto>
        <Texto variante="legenda" style={estilos.legenda}>
          {legenda}
        </Texto>
      </View>
    </View>
  );
}

function montarBlocos(divisao: Record<Macro, number> | null): Bloco[] {
  // Limites acumulados de cada macro ao longo da volta (0–1).
  const limites: [Macro, number][] = [];
  let acumulado = 0;
  for (const m of ORDEM_MACROS) {
    acumulado += divisao?.[m] ?? 0;
    limites.push([m, acumulado]);
  }

  const blocos: Bloco[] = [];
  for (let y = 0; y < BLOCOS; y++) {
    for (let x = 0; x < BLOCOS; x++) {
      const dx = x + 0.5 - RAIO_EXTERNO;
      const dy = y + 0.5 - RAIO_EXTERNO;
      const r = Math.hypot(dx, dy);
      if (r >= RAIO_EXTERNO || r < RAIO_INTERNO) continue;
      // Contorno: a última camada de fora e a primeira de dentro.
      if (r >= RAIO_EXTERNO - 1 || r < RAIO_INTERNO + 1) {
        blocos.push({ x, y, cor: cores.tinta });
        continue;
      }
      if (!divisao) {
        blocos.push({ x, y, cor: cores.vazio });
        continue;
      }
      // Ângulo a partir do topo, no sentido horário, como fração da volta.
      const volta = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
      const macro = limites.find(([, limite]) => volta < limite)?.[0] ?? 'gorduras';
      blocos.push({ x, y, cor: coresMacros[macro] });
    }
  }
  return blocos;
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
  valor: { fontSize: 22, lineHeight: 26 },
  legenda: { textAlign: 'center' },
});
