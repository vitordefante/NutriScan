import type { Macronutrients, Micronutrient, NutritionFacts } from '@nutriscan/shared';

/** Em que base mostrar os valores: a porção do rótulo ou 100 g/ml. */
export type BaseNutricao = 'porcao' | '100';

export type Macro = 'carboidratos' | 'proteinas' | 'gorduras';

/** kcal por grama (Atwater), as mesmas usadas na rotulagem. */
const KCAL_POR_GRAMA: Record<Macro, number> = { carboidratos: 4, proteinas: 4, gorduras: 9 };

export const ORDEM_MACROS: Macro[] = ['carboidratos', 'proteinas', 'gorduras'];

/** Multiplica os valores por 100 para chegar à base escolhida. */
export function fatorDaBase(n: NutritionFacts, base: BaseNutricao): number {
  return base === 'porcao' && n.porcao ? n.porcao / 100 : 1;
}

/** "30 g", "200 ml", "100 g" (com espaço que não quebra: o número não se separa da unidade). */
export function rotuloDaBase(n: NutritionFacts, base: BaseNutricao): string {
  const q = base === 'porcao' && n.porcao ? n.porcao : 100;
  return `${formatarNumero(q)}\u00A0${n.unidade}`;
}

/**
 * De onde vêm as calorias: a fração (0–1) de cada macro, pela energia que ele dá. É a mesma em
 * qualquer base (porção ou 100 g). Null quando não há energia vinda dos macros (ex.: água).
 */
export function divisaoDaEnergia(macros: Macronutrients): Record<Macro, number> | null {
  const kcal = ORDEM_MACROS.map((m) => (macros[m] ?? 0) * KCAL_POR_GRAMA[m]);
  const total = kcal.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return {
    carboidratos: kcal[0]! / total,
    proteinas: kcal[1]! / total,
    gorduras: kcal[2]! / total,
  };
}

/** Energia (× fator): a do rótulo; sem ela, a soma pelos macros. */
export function energia(macros: Macronutrients, fator = 1): number | null {
  if (macros.energiaKcal !== undefined) return macros.energiaKcal * fator;
  const temMacro = ORDEM_MACROS.some((m) => macros[m] !== undefined);
  if (!temMacro) return null;
  return ORDEM_MACROS.reduce((s, m) => s + (macros[m] ?? 0) * KCAL_POR_GRAMA[m], 0) * fator;
}

/**
 * Quanto registrar de consumo, em "passos": meia porção quando o rótulo tem porção; sem ela,
 * 50 g/ml. Contar passos inteiros evita somar frações (0,1 + 0,2…). O padrão (2 passos) é uma
 * porção, ou 100 g/ml.
 */
export function passoDoConsumo(n: NutritionFacts): number {
  return n.porcao ? n.porcao / 2 : 50;
}
export const PASSOS_PADRAO = 2;
/** Até 10 porções (ou 1 kg), sem passar do limite da API (5 kg). */
export function maximoDePassos(n: NutritionFacts): number {
  return Math.max(1, Math.min(20, Math.floor(5000 / passoDoConsumo(n))));
}

/** "1 porção · 30 g", "1½ porções · 45 g", "½ porção · 15 g"; sem porção, só "150 g". */
export function descreverConsumo(quantidade: number, unidade: string, porcao?: number): string {
  const medida = `${formatarNumero(quantidade)}\u00A0${unidade}`;
  if (!porcao) return medida;
  const porcoes = quantidade / porcao;
  const inteiro = Math.floor(porcoes);
  const meio = Math.abs(porcoes - inteiro - 0.5) < 0.01;
  const exato = meio || Math.abs(porcoes - inteiro) < 0.01;
  const numero = exato
    ? `${inteiro > 0 ? inteiro : ''}${meio ? '½' : ''}`
    : formatarNumero(porcoes);
  return `${numero} ${porcoes > 1 ? 'porções' : 'porção'} · ${medida}`;
}

/** Percentual do valor diário na base escolhida (inteiro). */
export function pctVd(m: Micronutrient, fator: number): number {
  return Math.round(((m.quantidade * fator) / m.vdr) * 100);
}

/** Duas casas abaixo de 1, uma abaixo de 10, inteiro a partir daí ("0,24", "8,3", "123"). */
export function formatarNumero(v: number): string {
  const casas = v < 1 ? 2 : v < 10 ? 1 : 0;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}
