import type { ProductKind } from '@nutriscan/shared';

import type { NomeIconePixel } from '@/components/ui/icone-pixel';

/**
 * Regras de ícone por categoria do Open Food Facts, na ordem em que são testadas em cada tag.
 * A ordem importa: "chocolate" contém "cola", "en:chicken-eggs" contém "chicken" e
 * "en:peanut-butters" contém "butter". No OFF, "en:legumes" são leguminosas (feijão, lentilha).
 */
const REGRAS: [RegExp, NomeIconePixel][] = [
  [
    /chocolate|cocoa|cacau|cand(y|ies)|confection|biscuit|cookie|wafer|cake|dessert|sweet-snack|ice-cream|jam|doce/,
    'doce',
  ],
  [/fish|seafood|sardine|tuna|salmon|shrimp|pescad|peixe/, 'pescados'],
  [/\beggs?\b|ovos?\b/, 'ovos'],
  [/meat|sausage|ham\b|bacon|chicken|beef|pork|poultr|carne|frango/, 'carnes'],
  [/honey|bee-product|propolis|\bmel\b/, 'mel'],
  [/peanut|amendoim/, 'graos'],
  [/dair|milk|chees|yog(h)?urt|butter|cream|kefir|leite|queijo|requeij|iogurte/, 'laticinios'],
  [
    /beverage|drink|soda|cola|juice|nectar|waters?\b|coffee|\btea|suco|refrigerante|bebida/,
    'bebida',
  ],
  [/fruit|fruta/, 'frutas'],
  [/vegetable|salad|tomato|hortali|verdura/, 'hortalicas'],
  [
    /cereal|rice|bean|legume|lentil|chickpea|oat|pasta|noodle|flour|grain|granola|seed|nut|arroz|feij|gr[aã]o|aveia/,
    'graos',
  ],
  [/bread|p[aã]es?\b/, 'artesanais'],
];

/**
 * Ícone pixel do produto para o quadrado sem foto (e enquanto a foto carrega): pela categoria
 * mais específica que alguma regra reconhece; sem nenhuma, talheres (alimento) ou o frasco
 * (cosmético).
 */
export function iconeDoProduto(
  tipo: ProductKind,
  categorias: readonly string[] = [],
): NomeIconePixel {
  if (tipo === 'cosmetico') return 'cosmeticos';
  // As tags vêm da mais geral para a mais específica.
  for (const tag of [...categorias].reverse()) {
    const texto = tag.toLocaleLowerCase('pt-BR');
    const regra = REGRAS.find(([padrao]) => padrao.test(texto));
    if (regra) return regra[1];
  }
  return 'talheres';
}
