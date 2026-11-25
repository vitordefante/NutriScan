import type {
  DailyNutrition,
  LogEntry,
  LogNutrition,
  Macronutrients,
  MicronutrientId,
  NutritionFacts,
} from '@nutriscan/shared';

import { arredondar, MICRONUTRIENTES, type QuantidadesMicro } from './micronutrientes.js';

/** Quanto se pode registrar de uma vez (g ou ml): acima disso é engano de digitação. */
export const MAXIMO_CONSUMO = 5000;

/**
 * O que um consumo de `quantidade` g/ml deu, para guardar no registro. Sem quantidade, vale uma
 * porção do rótulo; sem porção, 100 g/ml.
 */
export function nutricaoConsumida(n: NutritionFacts, quantidade?: number): LogNutrition {
  const q = quantidade ?? n.porcao ?? 100;
  const fator = q / 100;
  const vezes = <T extends object>(o: T) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, arredondar((v as number) * fator)]),
    ) as T;
  return {
    // Uma casa: 1½ porção de 25 g são 37,5 g (arredondar() daria 38 e "1,5 porções · 38 g").
    quantidade: Math.round(q * 10) / 10,
    unidade: n.unidade,
    ...(n.porcao !== undefined && { porcao: n.porcao }),
    macros: vezes(n.por100),
    micros: vezes(paraMapa(n.micronutrientes)),
    estimados: vezes(paraMapa(n.tipicos?.itens ?? [])),
  };
}

function paraMapa(lista: readonly { id: MicronutrientId; quantidade: number }[]): QuantidadesMicro {
  return Object.fromEntries(lista.map((m) => [m.id, m.quantidade]));
}

/** kcal pelos macros (Atwater: 4/4/9), só com os três conhecidos. */
function kcalDosMacros({ carboidratos, proteinas, gorduras }: Macronutrients): number | undefined {
  if (carboidratos === undefined || proteinas === undefined || gorduras === undefined) {
    return undefined;
  }
  return 4 * carboidratos + 4 * proteinas + 9 * gorduras;
}

/** Fuso dos dias do resumo: o app é feito para o Brasil (o servidor roda em UTC). */
const FUSO = 'America/Sao_Paulo';
const diaDe = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO });

/**
 * Média diária do que foi registrado: soma os registros com tabela e divide pelos dias (no
 * horário de Brasília) em que houve algum. Dividir pelo período inteiro (7 ou 30) faria parecer
 * que a pessoa comeu pouco nos dias em que só esqueceu de registrar.
 */
export function resumirNutricao(registros: readonly LogEntry[]): DailyNutrition | null {
  const comTabela = registros.flatMap((r) =>
    r.tipo === 'alimento' && r.nutricao ? [{ ...r.nutricao, em: r.registradoEm }] : [],
  );
  if (comTabela.length === 0) return null;
  const dias = new Set(comTabela.map((r) => diaDe.format(new Date(r.em)))).size;

  const macros: Record<string, number> = {};
  for (const r of comTabela) {
    for (const [k, v] of Object.entries(r.macros)) {
      if (k !== 'energiaKcal') macros[k] = (macros[k] ?? 0) + v;
    }
    // Sem a energia no rótulo, a dos macros: senão os gramas do registro entram no dia e as
    // calorias dele não.
    const kcal = r.macros.energiaKcal ?? kcalDosMacros(r.macros);
    if (kcal !== undefined) macros.energiaKcal = (macros.energiaKcal ?? 0) + kcal;
  }

  const micros = new Map<MicronutrientId, { total: number; estimado: boolean }>();
  const somar = (q: QuantidadesMicro, estimado: boolean) => {
    for (const [id, v] of Object.entries(q) as [MicronutrientId, number][]) {
      const atual = micros.get(id) ?? { total: 0, estimado: false };
      micros.set(id, { total: atual.total + v, estimado: atual.estimado || estimado });
    }
  };
  for (const r of comTabela) {
    somar(r.micros, false);
    somar(r.estimados, true);
  }

  return {
    registros: comTabela.length,
    diasComRegistro: dias,
    porDia: Object.fromEntries(
      Object.entries(macros).map(([k, v]) => [k, arredondar(v / dias)]),
    ) as Macronutrients,
    micros: [...micros]
      .map(([id, { total, estimado }]) => {
        const { nome, unidade, vdr } = MICRONUTRIENTES[id];
        return { id, nome, unidade, vdr, quantidade: arredondar(total / dias), estimado };
      })
      .sort((a, b) => b.quantidade / b.vdr - a.quantidade / a.vdr),
  };
}
