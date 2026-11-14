import type { ExposureSummary, FrontLabelNutrient, LogEntry } from '@nutriscan/shared';

/** Quantos alertas de cada tipo o resumo lista. */
export const MAIS_FREQUENTES = 5;

/**
 * Resumo do que o usuário consumiu/usou no período (os registros já filtrados pelo período):
 * nota média, quantos ultraprocessados, "alto em" e alertas mais frequentes. Tudo vem da análise
 * guardada em cada registro, então o resumo usa os mesmos critérios da nota.
 */
export function resumir(registros: readonly LogEntry[], dias: number): ExposureSummary {
  const alimentos = registros.filter((r) => r.tipo === 'alimento');
  const cosmeticos = registros.filter((r) => r.tipo === 'cosmetico');
  const notas = registros.flatMap((r) => (r.nota === null ? [] : [r.nota]));
  const comNova = alimentos.filter((r) => r.nova !== null);

  return {
    dias,
    registros: registros.length,
    alimentos: alimentos.length,
    cosmeticos: cosmeticos.length,
    notaMedia: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null,
    comNova: comNova.length,
    ultraprocessados: comNova.filter((r) => r.nova === 4).length,
    altoEm: contar(alimentos.flatMap((r) => r.altoEm)).map(([nutriente, vezes]) => ({
      nutriente: nutriente as FrontLabelNutrient,
      vezes,
    })),
    aditivos: maisFrequentes(alimentos),
    ingredientesAtencao: maisFrequentes(cosmeticos),
  };
}

function maisFrequentes(registros: readonly LogEntry[]) {
  return contar(registros.flatMap((r) => r.alertas))
    .slice(0, MAIS_FREQUENTES)
    .map(([titulo, vezes]) => ({ titulo, vezes }));
}

/** [valor, vezes], do mais frequente para o menos; no empate, ordem alfabética. */
function contar(valores: readonly string[]): [string, number][] {
  const contagem = new Map<string, number>();
  for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  return [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
}
