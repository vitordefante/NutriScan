import type { Product } from '@nutriscan/shared';
import { z } from 'zod';

import type {
  DadosAlimento,
  GrupoNova,
  LetraNutriScore,
  Nutrientes,
} from '../analise/dados-alimento.js';

/**
 * Formato (parcial) de um produto da API v2 do Open Food Facts.
 * Os dados são colaborativos: qualquer campo pode faltar ou vir com tipo inesperado,
 * por isso o schema é tolerante e a conversão abaixo descarta o que não fizer sentido.
 */
export const produtoOffSchema = z.object({
  code: z.string(),
  product_name: z.string().optional(),
  product_name_pt: z.string().optional(),
  brands: z.string().optional(),
  quantity: z.string().optional(),
  image_front_url: z.string().optional(),
  categories_tags: z.array(z.string()).optional(),
  labels_tags: z.array(z.string()).optional(),
  additives_tags: z.array(z.string()).optional(),
  ingredients_text_pt: z.string().optional(),
  nova_group: z.union([z.number(), z.string()]).optional(),
  nutriscore_grade: z.string().optional(),
  nutriments: z.record(z.string(), z.unknown()).optional(),
});

export type ProdutoOff = z.infer<typeof produtoOffSchema>;

/** Campos pedidos à API do OFF (o resto da resposta não é usado). */
export const CAMPOS_OFF = Object.keys(produtoOffSchema.shape).join(',');

export function nomeDoProduto(p: ProdutoOff): string {
  return (p.product_name_pt || p.product_name || '').trim() || 'Produto sem nome';
}

/** Dados do produto para exibição no app. */
export function paraProduto(p: ProdutoOff): Product {
  const marca = p.brands?.split(',')[0]?.trim();
  return {
    barcode: p.code,
    tipo: 'alimento',
    nome: nomeDoProduto(p),
    ...(marca && { marca }),
    ...(p.image_front_url && { imagemUrl: p.image_front_url }),
    categorias: p.categories_tags ?? [],
    ...(p.ingredients_text_pt && { ingredientes: p.ingredients_text_pt }),
  };
}

/** Entrada do motor de nota. */
export function paraDadosAlimento(p: ProdutoOff): DadosAlimento {
  const nova = Number(p.nova_group);
  const letra = p.nutriscore_grade?.toUpperCase();
  return {
    nome: nomeDoProduto(p),
    ...(p.quantity && { quantidade: p.quantity }),
    categorias: p.categories_tags ?? [],
    selos: p.labels_tags ?? [],
    // Só a lista em português: os marcadores de ultraprocessamento são termos em português.
    ...(p.ingredients_text_pt?.trim() && { ingredientes: p.ingredients_text_pt }),
    aditivos: (p.additives_tags ?? []).map((t) => t.replace(/^en:/, '').toLowerCase()),
    ...([1, 2, 3, 4].includes(nova) && { novaInformada: nova as GrupoNova }),
    ...(letra &&
      'ABCDE'.includes(letra) &&
      letra.length === 1 && { nutriScoreInformado: letra as LetraNutriScore }),
    nutrientes: paraNutrientes(p.nutriments ?? {}),
  };
}

function paraNutrientes(n: Record<string, unknown>): Nutrientes {
  const num = (chave: string): number | undefined => {
    const v = typeof n[chave] === 'string' ? Number(n[chave]) : n[chave];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  const kj = num('energy-kj_100g') ?? num('energy_100g');
  const sal = num('salt_100g');
  const sodioG = num('sodium_100g') ?? (sal !== undefined ? sal / 2.5 : undefined);
  const campos: Nutrientes = {
    energiaKcal: num('energy-kcal_100g') ?? (kj !== undefined ? kj / 4.184 : undefined),
    acucares: num('sugars_100g'),
    acucaresAdicionados: num('added-sugars_100g'),
    gorduraSaturada: num('saturated-fat_100g'),
    sodioMg: sodioG !== undefined ? sodioG * 1000 : undefined,
    fibras: num('fiber_100g'),
    proteinas: num('proteins_100g'),
    frutasLegumesPct:
      num('fruits-vegetables-legumes-estimate-from-ingredients_100g') ??
      num('fruits-vegetables-nuts-estimate-from-ingredients_100g'),
  };
  // Remove as chaves sem valor (deixa o objeto mais limpo de ler nos testes e no cache).
  return Object.fromEntries(
    Object.entries(campos).filter(([, v]) => v !== undefined),
  ) as Nutrientes;
}
