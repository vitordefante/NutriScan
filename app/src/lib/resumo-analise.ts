import type { AnalysisHighlights } from '@nutriscan/shared';

/**
 * Frase curta com os principais motivos da nota, para o cartão do resultado.
 * Ex.: "Ultraprocessado e alto em açúcar adicionado."
 */
export function resumoDosDestaques(destaques: AnalysisHighlights): string {
  const partes: string[] = [];
  const grupo = destaques.nova?.grupo;
  if (grupo === 4 || grupo === 3) partes.push(destaques.nova!.nome.toLocaleLowerCase('pt-BR'));
  for (const aviso of destaques.lupa) partes.push(aviso.titulo.toLocaleLowerCase('pt-BR'));

  if (partes.length === 0) {
    return grupo === 1 ? 'Alimento in natura, sem avisos no rótulo.' : 'Sem avisos no rótulo.';
  }
  const frase = juntarComE(partes);
  return `${frase.charAt(0).toLocaleUpperCase('pt-BR')}${frase.slice(1)}.`;
}

/** ["a", "b", "c"] → "a, b e c". */
function juntarComE(partes: string[]): string {
  if (partes.length === 1) return partes[0]!;
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
}
