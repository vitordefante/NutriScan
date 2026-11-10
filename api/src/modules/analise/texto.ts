import type { DadosAlimento } from './dados-alimento.js';

/** Minúsculas e sem acentos, para comparar textos de rótulo ("Açúcar" → "acucar"). */
export function normalizar(texto: string | undefined): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Prepara a lista de ingredientes para busca de termos, removendo o que NÃO é ingrediente:
 * avisos de alérgicos e frases como "sem glúten" / "não contém lactose" (senão "glúten" e
 * "lactose" seriam lidos como ingredientes adicionados).
 */
export function limparIngredientes(texto: string | undefined): string {
  let t = normalizar(texto);
  t = t.split(/alergicos|alergenicos|pode conter/)[0] ?? '';
  t = t.replace(
    /\b(sem|nao contem|contem) (gluten|lactose|conservantes?|corantes?|aditivos|acucar adicionado|adicao de acucar)\b/g,
    '',
  );
  return t;
}

/** true se a lista de ingredientes tem conteúdo de verdade (não só frases como "sem glúten"). */
export function temIngredientes(dados: DadosAlimento): boolean {
  // Basta uma palavra: "Mel" e "Sal" são listas de ingredientes válidas.
  return /[a-z]{2,}/.test(limparIngredientes(dados.ingredientes));
}

/** Ingredientes que indicam açúcar adicionado. */
export const INGREDIENTES_ACUCAR =
  /acucar|xarope|\bmel\b|dextrose|maltodextrina|glicose|glucose|frutose|melado|melaco/;

const POS = ['en:beverage-preparations', 'en:instant-beverages', 'en:cocoa-and-chocolate-powders'];

/**
 * Bebida (avaliada por 100 ml) ou alimento sólido (por 100 g)?
 * A quantidade da embalagem é o sinal mais confiável; depois, a categoria "en:beverages",
 * exceto pós para preparo (achocolatado em pó é avaliado como sólido).
 * Atenção: a tag "en:plant-based-foods-and-beverages" NÃO indica bebida.
 */
export function ehBebida(dados: DadosAlimento): boolean {
  const q = normalizar(dados.quantidade);
  if (/\d\s*(ml|l|litros?)\b/.test(q)) return true;
  if (/\d\s*(g|kg)\b/.test(q)) return false;
  return (
    dados.categorias.includes('en:beverages') && !dados.categorias.some((c) => POS.includes(c))
  );
}
