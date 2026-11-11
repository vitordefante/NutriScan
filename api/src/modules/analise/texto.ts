/**
 * Minúsculas e sem acentos, para comparar textos de rótulo ("Açúcar" → "acucar").
 * NFD separa a letra do acento; \p{M} remove as marcas de acento que sobram.
 */
export function normalizar(texto: string | undefined): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Frases de rótulo que NÃO são ingredientes ("sem glúten", "sem adição de açúcares",
 * "zero açúcar", "não contém lactose"). Se ficassem no texto, "glúten", "açúcar" e "lactose"
 * seriam lidos como ingredientes adicionados.
 */
const FRASES_NAO_INGREDIENTE = [
  /\b(?:sem|zero|isento de|livre de|nao contem)(?: adicao de)? (?:gluten|lactose|conservantes?|conservadores?|corantes?|aromatizantes?|adocantes?|edulcorantes?|aditivos|acucar(?:es)?(?: adicionados?)?)\b/g,
  /\bcontem (?:gluten|lactose)\b/g,
];

/** Lista de ingredientes normalizada, sem avisos de alérgicos e sem as frases acima. */
export function limparIngredientes(texto: string | undefined): string {
  let t = normalizar(texto).split(/alergicos|alergenicos|pode conter/)[0] ?? '';
  for (const frase of FRASES_NAO_INGREDIENTE) t = t.replace(frase, '');
  return t;
}

/** Ingredientes que indicam açúcar adicionado. */
export const INGREDIENTES_ACUCAR =
  /acucar|xarope|\bmel\b|dextrose|maltodextrina|glicose|glucose|frutose|melado|melaco/;

/**
 * Edulcorantes (adoçantes) como aparecem nos rótulos. Lista única, usada pela NOVA (marcador de
 * ultraprocessamento) e pelo Nutri-Score de bebidas (penalidade por adoçante).
 */
export const ADOCANTES =
  /edulcorante|adocante|sucralose|aspartame|acessulfame|ciclamato|sacarina|neotame|advantame|taumatina|esteviosideo|glicosideos? de esteviol|\bstevia\b/;

/** Códigos INS/E de edulcorantes não calóricos (polióis não entram). */
export const CODIGOS_ADOCANTES = [
  'e950',
  'e951',
  'e952',
  'e954',
  'e955',
  'e957',
  'e959',
  'e960',
  'e961',
  'e962',
  'e969',
];

/** Divide a lista nas vírgulas de primeiro nível: "a, b (c, d), e" → ["a", "b (c, d)", "e"]. */
export function itensPrincipais(texto: string): string[] {
  const itens: string[] = [];
  let nivel = 0;
  let atual = '';
  for (const ch of texto) {
    if (ch === '(' || ch === '[') nivel++;
    if (ch === ')' || ch === ']') nivel = Math.max(0, nivel - 1);
    if (ch === ',' && nivel === 0) {
      itens.push(atual.trim());
      atual = '';
    } else atual += ch;
  }
  if (atual.trim()) itens.push(atual.trim());
  return itens.filter(Boolean);
}
