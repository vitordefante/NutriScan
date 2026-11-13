import { normalizar } from '../analise/texto.js';

export type Ingrediente = {
  /** Como aparece no rótulo, só com espaços arrumados (ex.: "Methylparaben"). */
  original: string;
  /**
   * Formas normalizadas para comparar com os grupos: o item inteiro, o item sem o que está entre
   * parênteses, o conteúdo dos parênteses e cada parte separada por "/"
   * (ex.: "Parfum (Fragrance)" → "parfum (fragrance)", "parfum", "fragrance").
   */
  formas: string[];
};

/** Cabeçalhos que vêm grudados no primeiro ingrediente ("Ingredientes: Aqua, ..."). */
const CABECALHO = /^(?:ingredients?|ingredientes?|composicao|composition|inci)\s*:\s*/;

/**
 * Divide a lista de ingredientes de um cosmético em itens.
 * Separadores usuais: vírgula, ponto-e-vírgula, "•", "·", " - " e quebras de linha. Vírgulas
 * dentro de nomes químicos ("1,3-diol") não são separadores.
 */
export function lerIngredientes(texto: string | undefined): Ingrediente[] {
  if (!texto?.trim()) return [];
  const itens = decodificarHtml(texto)
    .replace(/(\d),(\d)/g, '$1\u0000$2') // protege "1,3" e "0,5"
    // ". " seguido de palavra também separa: corta textos de rótulo grudados no fim
    // ("Parfum. www.nivea.com.br Produzido por…") sem quebrar abreviações como "Vit. E".
    .split(/[,;•·\n\r]|\s-\s|\.\s+(?=[A-Za-z]{3,})/)
    .map((parte) =>
      parte
        .replace(/\u0000/g, ',')
        .replace(/\s+/g, ' ')
        .replace(/^["'\s]+|["'.*\s]+$/g, '') // aspas soltas, ponto final, asterisco de rodapé
        .trim(),
    )
    .filter(Boolean);

  const ingredientes: Ingrediente[] = [];
  for (const [i, item] of itens.entries()) {
    const original = i === 0 ? item.replace(/^(?:ingredients?|ingredientes?)\s*:\s*/i, '') : item;
    const formas = formasDe(original);
    if (formas.length > 0) ingredientes.push({ original, formas });
  }
  return ingredientes;
}

/** O Open Beauty Facts às vezes traz entidades HTML no texto ("&quot;", "&amp;"). */
function decodificarHtml(texto: string): string {
  return texto
    .replace(/&quot;?/g, '"')
    .replace(/&amp;?/g, '&')
    .replace(/&#39;?|&apos;?/g, "'")
    .replace(/&nbsp;?/g, ' ');
}

/**
 * Lista curta e sem água costuma ser só os ingredientes "de destaque" da embalagem
 * (ex.: "Óleo de Coco, Água de Coco, Óleo de Abacate"), não a composição INCI completa.
 */
export function listaPareceIncompleta(ingredientes: Ingrediente[]): boolean {
  const temAgua = ingredientes.some((ing) =>
    ing.formas.some((f) => /^(?:aqua|water|agua|eau)$/.test(f)),
  );
  return ingredientes.length < 8 && !temAgua;
}

function formasDe(item: string): string[] {
  const base = normalizar(item)
    .replace(CABECALHO, '')
    .replace(/[.*]+$/, '') // "Fragrance*" (asterisco de nota de rodapé), ponto final
    .trim();
  if (!/[a-z]{2,}/.test(base)) return [];

  const semParenteses = base.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();
  const dentro = [...base.matchAll(/[([](.*?)[)\]]/g)].map((m) => m[1]!.trim());
  const candidatos = [base, semParenteses, ...dentro].flatMap((f) => [f, ...f.split('/')]);
  return [...new Set(candidatos.map((f) => f.trim()).filter((f) => /[a-z]{2,}/.test(f)))];
}
