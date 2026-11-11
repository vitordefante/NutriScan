import type { Alimento } from './alimento.js';
import type { GrupoNova } from './dados-alimento.js';
import { ADOCANTES, normalizar } from './texto.js';

export type ClassificacaoNova = {
  grupo: GrupoNova;
  /** De onde veio a classificação; "categoria" e "nome" são estimativas. */
  origem: 'ingredientes' | 'fonte' | 'categoria' | 'nome';
  /** Marcadores de ultraprocessamento encontrados (só quando origem = "ingredientes" e grupo 4). */
  marcadores: string[];
};

/**
 * Marcadores de ultraprocessamento (NOVA 4): aditivos com função cosmética e ingredientes de
 * uso exclusivamente industrial. Baseado em Monteiro et al. e no Guia Alimentar (MS, 2014).
 */
const MARCADORES: [nome: string, padrao: RegExp][] = [
  ['aromatizante', /aromatizante|\baromas?\b/],
  ['corante', /corante/],
  ['emulsificante', /emulsificante|emulsionante/],
  ['espessante', /espessante/],
  ['estabilizante', /estabilizante/],
  ['gelificante', /gelificante/],
  ['realçador de sabor', /realcador/],
  ['edulcorante', ADOCANTES],
  ['glaceante', /glaceante/],
  ['espumante', /\bespumante/],
  ['xarope de glicose/milho/frutose', /xarope de (glicose|glucose|milho|frutose|acucar)/],
  ['açúcar invertido', /acucar invertido/],
  ['maltodextrina', /maltodextrina/],
  ['dextrose', /dextrose/],
  ['lactose', /\blactose\b/],
  ['soro de leite', /soro (de|do) leite/],
  ['caseinato', /caseinato/],
  [
    'proteína isolada/hidrolisada/texturizada',
    /proteina (isolada|hidrolisada|texturizada)|isolado proteico|proteina de soja/,
  ],
  // Glúten como ingrediente da lista (item próprio), não em frases como "contém glúten".
  ['glúten adicionado', /(^|[,(;:]\s*)gluten( de trigo)?\s*([,).;]|$)/],
  ['amido modificado', /amido modificado/],
  ['gordura hidrogenada/interesterificada', /hidrogenad|interesterificad/],
  ['gordura vegetal', /gordura vegetal/],
];

/**
 * Ingredientes culinários (NOVA 2). Podem levar sal ou aditivos simples — sal iodado com
 * antiumectante, manteiga com sal — e continuam sendo NOVA 2.
 */
const CATEGORIAS_CULINARIAS = [
  'en:vegetable-oils',
  'en:olive-oils',
  'en:honeys',
  'en:sugars',
  'en:salts',
  'en:butters',
  'en:vinegars',
  'en:starches',
];

/** Sal, açúcar, óleo etc. adicionados a um alimento: NOVA 3 (processado). */
const ADICOES_CULINARIAS =
  /\bsal\b|acucar|oleo|azeite|manteiga|vinagre|conserva(nte|dor)|\bmel\b|cloreto de sodio/;

/** Estimativa por categoria, para cadastros sem lista de ingredientes. */
const NOVA_POR_CATEGORIA: Record<string, GrupoNova> = {
  'en:sausages': 4,
  'en:frankfurter-sausages': 4,
  'en:mortadella': 4,
  'en:hams': 4,
  'en:cold-cuts': 4,
  'en:prepared-meats': 4,
  'en:sodas': 4,
  'en:soft-drinks': 4,
  'en:energy-drinks': 4,
  'en:artificially-sweetened-beverages': 4,
  'en:ice-creams': 4,
  'en:frozen-desserts': 4,
  'en:filled-biscuits': 4,
  'en:sandwich-biscuits': 4,
  'en:candies': 4,
  'en:chocolate-candies': 4,
  'en:instant-noodles': 4,
  'en:meals': 4,
  'en:frozen-ready-made-meals': 4,
  'en:lasagnas': 4,
  'en:breakfast-cereals': 4,
  'en:margarines': 4,
  'en:mayonnaises': 4,
  'en:plant-based-milk-alternatives': 4,
  'en:cheeses': 3,
  'en:breads': 3,
  'en:canned-vegetables': 3,
  'en:pulses': 1,
  'en:legumes': 1,
  'en:rolled-oats': 1,
  'en:rices': 1,
  'en:eggs': 1,
  'en:waters': 1,
};

/** Estimativa pelo nome, para cadastros sem ingredientes e sem categoria (comum no Brasil). */
const NOVA_POR_NOME: [padrao: RegExp, grupo: GrupoNova][] = [
  [
    /salsicha|mortadela|presunto|salame|peito de peru|nugget|empanado|hamburguer|linguica|apresuntado/,
    4,
  ],
  [
    /refrigerante|sorvete|lasanha|biscoito recheado|bolacha recheada|salgadinho|macarrao instantaneo|lamen|achocolatado|cereal matinal|margarina|maionese|gelatina|suco em po|refresco em po/,
    4,
  ],
];

/**
 * Classifica o grau de processamento. Ordem de preferência (docs/metodologia-nota.md, 3.1):
 * ingredientes → NOVA informada → categoria → nome. Retorna null se nada permitir classificar.
 */
export function classificarNova(alimento: Alimento): ClassificacaoNova | null {
  if (alimento.temIngredientes) return classificarPorIngredientes(alimento);

  if (alimento.novaInformada) {
    return { grupo: alimento.novaInformada, origem: 'fonte', marcadores: [] };
  }

  // As tags do OFF vão da mais geral à mais específica ("cereais matinais" → "aveia em flocos"):
  // vale a mais específica que tiver estimativa.
  for (const categoria of [...alimento.categorias].reverse()) {
    const grupo = NOVA_POR_CATEGORIA[categoria];
    if (grupo) return { grupo, origem: 'categoria', marcadores: [] };
  }

  const nome = normalizar(alimento.nome);
  const porNome = NOVA_POR_NOME.find(([padrao]) => padrao.test(nome));
  if (porNome) return { grupo: porNome[1], origem: 'nome', marcadores: [] };

  return null;
}

function classificarPorIngredientes(alimento: Alimento): ClassificacaoNova {
  const texto = alimento.textoIngredientes;

  const marcadores = MARCADORES.filter(([, padrao]) => padrao.test(texto)).map(([nome]) => nome);
  if (marcadores.length > 0) return { grupo: 4, origem: 'ingredientes', marcadores };

  if (alimento.categorias.some((c) => CATEGORIAS_CULINARIAS.includes(c))) {
    return { grupo: 2, origem: 'ingredientes', marcadores: [] };
  }

  if (ADICOES_CULINARIAS.test(texto)) return { grupo: 3, origem: 'ingredientes', marcadores: [] };

  return { grupo: 1, origem: 'ingredientes', marcadores: [] };
}
