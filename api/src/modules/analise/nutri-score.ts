import type { Alimento } from './alimento.js';
import type { LetraNutriScore } from './dados-alimento.js';

export type ResultadoNutriScore = {
  letra: LetraNutriScore;
  /** "calculado" pela API a partir da tabela nutricional, ou "fonte" (letra informada pelo OFF). */
  origem: 'calculado' | 'fonte';
};

/**
 * Categorias com regras próprias no Nutri-Score (gorduras, óleos, oleaginosas, queijos).
 * Não implementamos essas regras: para elas usamos a letra informada pela fonte.
 * Lista exata de tags: comparar por trecho ("nuts") pegaria "doughnuts" e "coconuts".
 */
const CATEGORIAS_ESPECIAIS = [
  'en:fats',
  'en:vegetable-fats',
  'en:animal-fats',
  'en:vegetable-oils',
  'en:olive-oils',
  'en:butters',
  'en:margarines',
  'en:cheeses',
  'en:nuts',
  'en:peanuts',
  'en:nut-butters',
  'en:peanut-butters',
  'en:oilseed-purees',
];

const AGUAS = [
  'en:waters',
  'en:mineral-waters',
  'en:natural-mineral-waters',
  'en:spring-waters',
  'en:unsweetened-waters',
];
const AGUAS_COM_ADICAO = /flavou?red|sweetened|tonic|sodas/;

/** Quantos limites o valor ultrapassa (estritamente maior) = pontos da tabela. */
const pontos = (valor: number, limites: readonly number[]) =>
  limites.filter((l) => valor > l).length;

// Tabelas do algoritmo de 2023 (Santé publique France). Valores por 100 g ou 100 ml.
const ENERGIA_KJ = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const ACUCARES = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51];
const GORDURA_SATURADA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SAL = Array.from({ length: 20 }, (_, i) => Math.round(0.2 * (i + 1) * 10) / 10);
const PROTEINAS = [2.4, 4.8, 7.2, 9.6, 12, 14, 17];
const FIBRAS = [3.0, 4.1, 5.2, 6.3, 7.4];

const BEBIDA_ENERGIA_KJ = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390];
const BEBIDA_ACUCARES = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11];
const BEBIDA_PROTEINAS = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0];
const PONTOS_ADOCANTE_BEBIDA = 4;

/**
 * Nutri-Score: calcula a partir da tabela nutricional quando possível; senão usa a letra
 * informada pela fonte; senão null. Fibras, proteínas e frutas ausentes contam como zero
 * (a escolha conservadora: nunca melhora a nota por falta de dado).
 */
export function avaliarNutriScore(
  alimento: Alimento,
  temAdocante: boolean,
): ResultadoNutriScore | null {
  // No algoritmo, a letra A entre as bebidas é exclusiva da água pura.
  if (ehAguaPura(alimento, temAdocante)) return { letra: 'A', origem: 'calculado' };

  const especial = alimento.categorias.some((c) => CATEGORIAS_ESPECIAIS.includes(c));
  const calculado = especial ? null : calcular(alimento, temAdocante);
  if (calculado) return { letra: calculado, origem: 'calculado' };
  if (alimento.nutriScoreInformado) {
    return { letra: alimento.nutriScoreInformado, origem: 'fonte' };
  }
  return null;
}

function ehAguaPura(alimento: Alimento, temAdocante: boolean): boolean {
  const { categorias, nutrientes } = alimento;
  return (
    categorias.some((c) => AGUAS.includes(c)) &&
    !categorias.some((c) => AGUAS_COM_ADICAO.test(c)) &&
    !temAdocante &&
    (nutrientes.acucares ?? 0) === 0 &&
    (nutrientes.energiaKcal ?? 0) < 1
  );
}

function calcular(alimento: Alimento, temAdocante: boolean): LetraNutriScore | null {
  const n = alimento.nutrientes;
  const { energiaKcal, acucares, gorduraSaturada, sodioMg } = n;
  if (
    energiaKcal === undefined ||
    acucares === undefined ||
    gorduraSaturada === undefined ||
    sodioMg === undefined
  ) {
    return null;
  }

  const kj = energiaKcal * 4.184;
  const salG = (sodioMg / 1000) * 2.5;
  const fibras = pontos(n.fibras ?? 0, FIBRAS);
  const frutas = n.frutasLegumesPct ?? 0;
  const gordSal = pontos(gorduraSaturada, GORDURA_SATURADA) + pontos(salG, SAL);

  if (alimento.bebida) {
    const negativos =
      pontos(kj, BEBIDA_ENERGIA_KJ) +
      pontos(acucares, BEBIDA_ACUCARES) +
      gordSal +
      (temAdocante ? PONTOS_ADOCANTE_BEBIDA : 0);
    const positivos =
      pontos(n.proteinas ?? 0, BEBIDA_PROTEINAS) +
      fibras +
      (frutas > 80 ? 6 : frutas > 60 ? 4 : frutas > 40 ? 2 : 0);
    const s = negativos - positivos;
    // Fora a água pura (tratada acima), bebidas começam em B.
    return s <= 2 ? 'B' : s <= 6 ? 'C' : s <= 9 ? 'D' : 'E';
  }

  const negativos = pontos(kj, ENERGIA_KJ) + pontos(acucares, ACUCARES) + gordSal;
  // Com 11 pontos negativos ou mais, a proteína deixa de compensar.
  const proteinas = negativos >= 11 ? 0 : pontos(n.proteinas ?? 0, PROTEINAS);
  const positivos = proteinas + fibras + (frutas > 80 ? 5 : frutas > 60 ? 2 : frutas > 40 ? 1 : 0);
  const s = negativos - positivos;
  return s <= 0 ? 'A' : s <= 2 ? 'B' : s <= 10 ? 'C' : s <= 18 ? 'D' : 'E';
}
