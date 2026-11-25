import type { Micronutrient, MicronutrientId } from '@nutriscan/shared';

type Definicao = {
  nome: string;
  unidade: Micronutrient['unidade'];
  /** VDR para adultos — ANVISA, IN 75/2020, Anexo II (rotulagem dos alimentos em geral). */
  vdr: number;
  /** Chaves do Open Food Facts (sem o sufixo `_100g`), em ordem de preferência. */
  off: string[];
};

/**
 * Vitaminas e minerais com valor diário de referência na IN 75/2020 (Anexo II). Ficaram de fora
 * os que quase nunca aparecem nos rótulos ou não fazem sentido aqui (cloreto, flúor, colina).
 * O sódio já aparece com os macronutrientes.
 */
export const MICRONUTRIENTES: Record<MicronutrientId, Definicao> = {
  vitamina_a: { nome: 'Vitamina A', unidade: 'µg', vdr: 800, off: ['vitamin-a'] },
  vitamina_d: { nome: 'Vitamina D', unidade: 'µg', vdr: 15, off: ['vitamin-d'] },
  vitamina_e: { nome: 'Vitamina E', unidade: 'mg', vdr: 15, off: ['vitamin-e'] },
  vitamina_k: { nome: 'Vitamina K', unidade: 'µg', vdr: 120, off: ['vitamin-k', 'vitamin-k1'] },
  vitamina_c: { nome: 'Vitamina C', unidade: 'mg', vdr: 100, off: ['vitamin-c'] },
  tiamina: { nome: 'Vitamina B1 (tiamina)', unidade: 'mg', vdr: 1.2, off: ['vitamin-b1'] },
  riboflavina: {
    nome: 'Vitamina B2 (riboflavina)',
    unidade: 'mg',
    vdr: 1.2,
    off: ['vitamin-b2'],
  },
  niacina: {
    nome: 'Vitamina B3 (niacina)',
    unidade: 'mg',
    vdr: 15,
    off: ['vitamin-pp', 'vitamin-b3'],
  },
  vitamina_b6: { nome: 'Vitamina B6', unidade: 'mg', vdr: 1.3, off: ['vitamin-b6'] },
  folato: { nome: 'Folato (B9)', unidade: 'µg', vdr: 400, off: ['vitamin-b9', 'folates'] },
  vitamina_b12: { nome: 'Vitamina B12', unidade: 'µg', vdr: 2.4, off: ['vitamin-b12'] },
  biotina: { nome: 'Biotina (B7)', unidade: 'µg', vdr: 30, off: ['biotin', 'vitamin-b7'] },
  acido_pantotenico: {
    nome: 'Ácido pantotênico (B5)',
    unidade: 'mg',
    vdr: 5,
    off: ['pantothenic-acid', 'vitamin-b5'],
  },
  calcio: { nome: 'Cálcio', unidade: 'mg', vdr: 1000, off: ['calcium'] },
  ferro: { nome: 'Ferro', unidade: 'mg', vdr: 14, off: ['iron'] },
  magnesio: { nome: 'Magnésio', unidade: 'mg', vdr: 420, off: ['magnesium'] },
  zinco: { nome: 'Zinco', unidade: 'mg', vdr: 11, off: ['zinc'] },
  potassio: { nome: 'Potássio', unidade: 'mg', vdr: 3500, off: ['potassium'] },
  fosforo: { nome: 'Fósforo', unidade: 'mg', vdr: 700, off: ['phosphorus'] },
  selenio: { nome: 'Selênio', unidade: 'µg', vdr: 60, off: ['selenium'] },
  cobre: { nome: 'Cobre', unidade: 'µg', vdr: 900, off: ['copper'] },
  manganes: { nome: 'Manganês', unidade: 'mg', vdr: 3, off: ['manganese'] },
  iodo: { nome: 'Iodo', unidade: 'µg', vdr: 150, off: ['iodine'] },
  cromo: { nome: 'Cromo', unidade: 'µg', vdr: 35, off: ['chromium'] },
  molibdenio: { nome: 'Molibdênio', unidade: 'µg', vdr: 45, off: ['molybdenum'] },
};

/** Quantidade de cada micronutriente por 100 g/ml, na unidade do catálogo (mg ou µg). */
export type QuantidadesMicro = Partial<Record<MicronutrientId, number>>;

/**
 * Acima disso (em 100 g) o valor é tratado como erro de cadastro (ex.: miligramas digitados como
 * gramas). Nenhum alimento comum passa de 20 vezes o VDR em 100 g.
 */
const MAXIMO_VEZES_VDR = 20;

/** Valores do Open Food Facts, que guarda tudo em gramas por 100 g (`calcium_100g: 0.12`). */
export function microsDoOff(n: Record<string, unknown>): QuantidadesMicro {
  const micros: QuantidadesMicro = {};
  for (const [id, def] of Object.entries(MICRONUTRIENTES) as [MicronutrientId, Definicao][]) {
    const gramas = def.off.map((k) => numero(n[`${k}_100g`])).find((v) => v !== undefined);
    if (gramas === undefined) continue;
    const valor = gramas * (def.unidade === 'mg' ? 1_000 : 1_000_000);
    if (valor > 0 && valor <= def.vdr * MAXIMO_VEZES_VDR) micros[id] = arredondar(valor);
  }
  return micros;
}

/** Lista para o app, do maior %VD para o menor. */
export function paraLista(micros: QuantidadesMicro): Micronutrient[] {
  return (Object.entries(micros) as [MicronutrientId, number][])
    .map(([id, quantidade]) => {
      const { nome, unidade, vdr } = MICRONUTRIENTES[id];
      return { id, nome, quantidade, unidade, vdr };
    })
    .sort((a, b) => b.quantidade / b.vdr - a.quantidade / a.vdr);
}

export function numero(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Duas casas abaixo de 1, uma abaixo de 10, inteiro a partir daí. */
export function arredondar(v: number): number {
  const casas = v < 1 ? 100 : v < 10 ? 10 : 1;
  return Math.round(v * casas) / casas;
}
