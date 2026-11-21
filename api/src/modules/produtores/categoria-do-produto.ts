import type { Product, ProducerCategory } from '@nutriscan/shared';

/**
 * Que tipo de produtor local vende algo que substitui o produto escaneado (ovos → produtores de
 * ovos). Categorias do Open Food Facts / Open Beauty Facts; a primeira regra que bate vale, e as
 * mais específicas vêm antes (queijo é laticínio mesmo estando também em "en:fermented-foods").
 */
const REGRAS: readonly (readonly [ProducerCategory, readonly string[]])[] = [
  ['ovos', ['en:eggs', 'en:chicken-eggs']],
  ['mel', ['en:honeys', 'en:bee-products']],
  ['pescados', ['en:fishes', 'en:seafood', 'en:fish-and-seafood']],
  ['carnes', ['en:meats', 'en:poultries', 'en:sausages', 'en:hams']],
  ['laticinios', ['en:cheeses', 'en:milks', 'en:yogurts', 'en:butters', 'en:creams', 'en:dairies']],
  // Antes de frutas: geleia também pode vir marcada como fruta.
  ['artesanais', ['en:breads', 'en:jams', 'en:coffees', 'en:cakes']],
  ['frutas', ['en:fresh-fruits', 'en:fruits']],
  ['hortalicas', ['en:fresh-vegetables', 'en:vegetables', 'en:leafy-vegetables']],
  [
    'graos',
    ['en:rices', 'en:beans', 'en:dried-legumes', 'en:pulses', 'en:flours', 'en:cereal-grains'],
  ],
];

const COSMETICOS = ['en:soaps', 'en:bar-soaps', 'en:liquid-soaps', 'en:body-oils', 'en:lip-balms'];

export function categoriaDoProduto({
  tipo,
  categorias,
}: Pick<Product, 'tipo' | 'categorias'>): ProducerCategory | null {
  const tem = (tags: readonly string[]) => tags.some((t) => categorias.includes(t));
  if (tipo === 'cosmetico') return tem(COSMETICOS) ? 'cosmeticos' : null;
  return REGRAS.find(([, tags]) => tem(tags))?.[0] ?? null;
}
