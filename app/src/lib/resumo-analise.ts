import type { Alert, AnalysisHighlights } from '@nutriscan/shared';

/**
 * Frase curta com os principais motivos da nota, para o cartão do resultado.
 * Ex.: "Ultraprocessado e alto em açúcar adicionado."
 *
 * `dadosCompletos` = false (nota parcial): sem avisos encontrados não quer dizer "sem avisos" —
 * pode ter faltado justamente o dado que geraria um. A frase não afirma o que não sabe.
 */
export function resumoDosDestaques(destaques: AnalysisHighlights, dadosCompletos: boolean): string {
  const partes: string[] = [];
  const grupo = destaques.nova?.grupo;
  if (grupo === 4 || grupo === 3) partes.push(destaques.nova!.nome.toLocaleLowerCase('pt-BR'));
  for (const aviso of destaques.lupa) partes.push(aviso.titulo.toLocaleLowerCase('pt-BR'));

  if (partes.length === 0) {
    if (!dadosCompletos) return 'Nenhum aviso nos dados disponíveis.';
    return grupo === 1 ? 'Alimento in natura, sem avisos no rótulo.' : 'Sem avisos no rótulo.';
  }
  const frase = juntarComE(partes);
  return `${frase.charAt(0).toLocaleUpperCase('pt-BR')}${frase.slice(1)}.`;
}

/**
 * Resumo de um cosmético: os grupos de ingredientes de atenção mais graves (a API já os manda do
 * nível alto para o baixo). Ex.: "Lilial, isotiazolinonas (MIT/MCI) e mais 3 grupos."
 */
export function resumoDosAlertasCosmetico(alertas: Alert[], dadosCompletos: boolean): string {
  if (alertas.length === 0) {
    return dadosCompletos
      ? 'Nenhum ingrediente de atenção na lista.'
      : 'Nenhum ingrediente de atenção nos dados disponíveis.';
  }
  const principais = alertas.slice(0, 2).map((a, i) => (i === 0 ? a.titulo : minuscula(a.titulo)));
  const resto = alertas.length - principais.length;
  if (resto === 0) return `${juntarComE(principais)}.`;
  return `${principais.join(', ')} e mais ${resto} ${resto === 1 ? 'grupo' : 'grupos'}.`;
}

/** Primeira letra minúscula, preservando siglas ("PFAS", "BHA"). */
function minuscula(texto: string): string {
  return /^[A-Z]{2}/.test(texto)
    ? texto
    : texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1);
}

/** ["a", "b", "c"] → "a, b e c". */
function juntarComE(partes: string[]): string {
  if (partes.length === 1) return partes[0]!;
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}
