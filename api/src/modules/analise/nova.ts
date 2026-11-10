import type { DadosAlimento, GrupoNova } from './dados-alimento.js';
import { limparIngredientes, normalizar, temIngredientes } from './texto.js';

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
  [
    'edulcorante',
    /edulcorante|adocante|sucralose|aspartame|acessulfame|ciclamato|sacarina|esteviosideo|\bstevia\b/,
  ],
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

/** Ingredientes culinários (NOVA 2) quando vendidos sozinhos. */
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
const NOVA_POR_CATEGORIA: [categorias: string[], grupo: GrupoNova][] = [
  [
    [
      'en:sausages',
      'en:frankfurter-sausages',
      'en:mortadella',
      'en:hams',
      'en:cold-cuts',
      'en:prepared-meats',
    ],
    4,
  ],
  [['en:sodas', 'en:soft-drinks', 'en:energy-drinks', 'en:artificially-sweetened-beverages'], 4],
  [
    [
      'en:ice-creams',
      'en:frozen-desserts',
      'en:filled-biscuits',
      'en:sandwich-biscuits',
      'en:candies',
      'en:chocolate-candies',
    ],
    4,
  ],
  [
    [
      'en:instant-noodles',
      'en:meals',
      'en:frozen-ready-made-meals',
      'en:lasagnas',
      'en:breakfast-cereals',
      'en:margarines',
      'en:mayonnaises',
      'en:plant-based-milk-alternatives',
    ],
    4,
  ],
  [['en:cheeses', 'en:breads', 'en:canned-vegetables'], 3],
  [['en:pulses', 'en:legumes', 'en:rolled-oats', 'en:rices', 'en:eggs'], 1],
];

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
export function classificarNova(dados: DadosAlimento): ClassificacaoNova | null {
  if (temIngredientes(dados)) return classificarPorIngredientes(dados);

  if (dados.novaInformada) return { grupo: dados.novaInformada, origem: 'fonte', marcadores: [] };

  const porCategoria = NOVA_POR_CATEGORIA.find(([cats]) =>
    cats.some((c) => dados.categorias.includes(c)),
  );
  if (porCategoria) return { grupo: porCategoria[1], origem: 'categoria', marcadores: [] };

  const nome = normalizar(dados.nome);
  const porNome = NOVA_POR_NOME.find(([padrao]) => padrao.test(nome));
  if (porNome) return { grupo: porNome[1], origem: 'nome', marcadores: [] };

  return null;
}

function classificarPorIngredientes(dados: DadosAlimento): ClassificacaoNova {
  const texto = limparIngredientes(dados.ingredientes);

  const marcadores = MARCADORES.filter(([, padrao]) => padrao.test(texto)).map(([nome]) => nome);
  if (marcadores.length > 0) return { grupo: 4, origem: 'ingredientes', marcadores };

  const itens = texto.split(/,|\be\b/).filter((item) => item.trim() !== '');
  const culinario = dados.categorias.some((c) => CATEGORIAS_CULINARIAS.includes(c));
  if (culinario && itens.length <= 2) return { grupo: 2, origem: 'ingredientes', marcadores: [] };

  if (ADICOES_CULINARIAS.test(texto)) return { grupo: 3, origem: 'ingredientes', marcadores: [] };

  return { grupo: 1, origem: 'ingredientes', marcadores: [] };
}
