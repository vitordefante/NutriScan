import { subtipoDasCategorias } from '../produtos/subtipo.js';

/**
 * Categorias largas demais para comparar produtos: um achocolatado não deve ter café solúvel
 * como "alternativa", nem uma maionese, ketchup. A busca nunca sobe até elas.
 */
const AMPLAS = new Set([
  'en:foods',
  'en:groceries',
  'en:meals',
  'en:plant-based-foods-and-beverages',
  'en:plant-based-foods',
  'en:fruits-and-vegetables-based-foods',
  'en:beverages-and-beverages-preparations',
  'en:beverages',
  'en:beverage-preparations',
  'en:instant-beverages',
  'en:hot-beverages',
  'en:sweetened-beverages',
  'en:unsweetened-beverages',
  'en:artificially-sweetened-beverages',
  'en:carbonated-drinks',
  'en:snacks',
  'en:sweet-snacks',
  'en:salty-snacks',
  'en:appetizers',
  'en:breakfasts',
  'en:desserts',
  'en:dairies',
  'en:fermented-foods',
  'en:fermented-milk-products',
  'en:meats-and-their-products',
  'en:seafood',
  'en:cereals-and-potatoes',
  'en:cereals-and-their-products',
  'en:condiments',
  'en:sauces',
  'en:spreads',
  'en:sweet-spreads',
  'en:fats',
  'en:sweeteners',
  'en:confectioneries',
  'en:cocoa-and-its-products',
  'en:canned-foods',
  'en:frozen-foods',
  'en:dried-products',
  'en:farming-products',
  'en:dietary-supplements',
  'en:bodybuilding-supplements',
  'en:non-food-products',
  // Cosméticos (Open Beauty Facts)
  'en:hair',
  'en:hygiene',
  'en:body',
  'en:face',
  'en:make-up',
]);

/** Quantos níveis a busca sobe a partir da categoria mais específica. */
const NIVEIS = 3;

/**
 * Categorias em que procurar alternativas, da mais específica para a mais geral.
 *
 * As tags do Open Food Facts vêm da mais geral para a mais específica (ex.: "en:sauces",
 * "en:mayonnaises"). Ficam de fora as tags em outra língua ("pt:…", texto livre dos
 * colaboradores — a busca por elas quase não acha nada) e as categorias amplas.
 */
export function categoriasParaComparar(categorias: readonly string[]): string[] {
  return categorias
    .filter((c) => c.startsWith('en:') && !AMPLAS.has(c))
    .reverse()
    .slice(0, NIVEIS);
}

/** Nome da categoria para exibição (ex.: "Maionese"), se ela estiver no dicionário. */
export function nomeDaCategoria(categoria: string): string | undefined {
  return subtipoDasCategorias([categoria]);
}
