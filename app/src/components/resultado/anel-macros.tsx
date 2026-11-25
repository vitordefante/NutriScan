import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

/**
 * Anel de energia em pixel art: blocos de uma grade, coloridos pelo ângulo (começa no topo, no
 * sentido horário), com contorno de tinta por dentro e por fora — o mesmo traço da barra de HP.
 */
export function AnelMacros({ divisao, tamanho, valor, legenda }: Props) {
  const caminhos = montarCaminhos(divisao);
  return (
    <View style={{ width: tamanho, height: tamanho }}>
      {/* Um caminho por cor (4 ou 5 elementos), não um retângulo por bloco (~500): a tela troca
          porção/100 g sem travar. Cada unidade do viewBox é um bloco, como nos ícones pixel. */}
      <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${BLOCOS} ${BLOCOS}`}>
        {[...caminhos].map(([cor, d]) => (
          <Path key={cor} d={d} fill={cor} />
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

/** Cor de cada bloco da grade (null = fora do anel). */
function corDoBloco(
  x: number,
  y: number,
  divisao: Record<Macro, number> | null,
  limites: [Macro, number][],
): string | null {
  const dx = x + 0.5 - RAIO_EXTERNO;
  const dy = y + 0.5 - RAIO_EXTERNO;
  const r = Math.hypot(dx, dy);
  if (r >= RAIO_EXTERNO || r < RAIO_INTERNO) return null;
  // Contorno: a última camada de fora e a primeira de dentro.
  if (r >= RAIO_EXTERNO - 1 || r < RAIO_INTERNO + 1) return cores.tinta;
  if (!divisao) return cores.vazio;
  // Ângulo a partir do topo, no sentido horário, como fração da volta.
  const volta = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
  return coresMacros[limites.find(([, limite]) => volta < limite)?.[0] ?? 'gorduras'];
}

/** Os blocos de cada cor num caminho SVG, juntando os vizinhos da mesma linha. */
function montarCaminhos(divisao: Record<Macro, number> | null): Map<string, string> {
  // Limites acumulados de cada macro ao longo da volta (0–1).
  const limites: [Macro, number][] = [];
  let acumulado = 0;
  for (const m of ORDEM_MACROS) {
    acumulado += divisao?.[m] ?? 0;
    limites.push([m, acumulado]);
  }

  const caminhos = new Map<string, string>();
  for (let y = 0; y < BLOCOS; y++) {
    let x = 0;
    while (x < BLOCOS) {
      const cor = corDoBloco(x, y, divisao, limites);
      let fim = x + 1;
      while (fim < BLOCOS && corDoBloco(fim, y, divisao, limites) === cor) fim++;
      if (cor) {
        const n = fim - x;
        caminhos.set(cor, `${caminhos.get(cor) ?? ''}M${x} ${y}h${n}v1h-${n}z`);
      }
      x = fim;
    }
  }
  return caminhos;
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
  valor: { fontSize: 22, lineHeight: 26 },
  legenda: { textAlign: 'center' },
});
