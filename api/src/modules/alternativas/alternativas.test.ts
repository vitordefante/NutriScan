import type { Analysis, ProductResult } from '@nutriscan/shared';
import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';
import { faixaDaNota } from '../analise/nota.js';
import {
  type ClienteBusca,
  FonteIndisponivelError,
  type ResultadoBusca,
} from '../produtos/open-food-facts.client.js';
import { montarResultado } from '../produtos/montar.js';
import type { ProdutoOff } from '../produtos/open-food-facts.mapper.js';
import type { FonteProduto, ServicoProdutos } from '../produtos/produtos.service.js';
import type { RotuloLido } from '../rotulo/leitura.js';
import type { RepositorioRotulos } from '../rotulo/rotulos.repository.js';
import { criarServicoAlternativas, type ServicoAlternativas } from './alternativas.service.js';
import type { BuscaEmCache, CacheBuscas } from './buscas.repository.js';
import { categoriasParaComparar, nomeDaCategoria } from './categorias.js';
import { escolherAlternativas, LIMITE_ALTERNATIVAS, type Referencia } from './escolha.js';
import { cadastrosSuspeitos } from './plausibilidade.js';

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-11-14T12:00:00Z');

describe('categoriasParaComparar', () => {
  it('da mais específica para a mais geral, sem tags em outra língua nem categorias amplas', () => {
    expect(
      categoriasParaComparar([
        'en:beverages-and-beverages-preparations',
        'en:cocoa-and-its-products',
        'en:beverage-preparations',
        'en:instant-beverages',
        'en:cocoa-and-chocolate-powders',
        'pt:achocolatado',
        'en:instant-chocolate-powders',
      ]),
    ).toEqual(['en:instant-chocolate-powders', 'en:cocoa-and-chocolate-powders']);
  });

  it('sobe no máximo três níveis', () => {
    expect(categoriasParaComparar(['en:a', 'en:b', 'en:c', 'en:d'])).toEqual([
      'en:d',
      'en:c',
      'en:b',
    ]);
  });

  it('sem categoria específica, não há com o que comparar', () => {
    expect(categoriasParaComparar(['en:condiments', 'en:sauces', 'pt:molhos'])).toEqual([]);
  });

  it('nome para exibição só quando a categoria está no dicionário', () => {
    expect(nomeDaCategoria('en:mayonnaises')).toBe('Maionese');
    expect(nomeDaCategoria('en:something-rare')).toBeUndefined();
  });
});

/** Resultado já analisado, montado à mão para testar só as regras de escolha. */
function resultado(
  barcode: string,
  nome: string,
  nota: number,
  opcoes: { marca?: string; status?: Analysis['status'] } = {},
): ProductResult {
  const base = {
    nota,
    faixa: faixaDaNota(nota),
    itens: [],
    alertas: [],
    destaques: {
      nova: { grupo: 3 as const, nome: 'Processado', motivo: '' },
      nutriScore: { letra: 'B' as const },
      lupa: [],
    },
  };
  const status = opcoes.status ?? 'completa';
  const analise: Analysis =
    status === 'completa'
      ? { status, ...base }
      : status === 'parcial'
        ? { status, ...base, faltando: ['tabela nutricional'] }
        : { status, faltando: ['tabela nutricional'], alertas: [] };
  return {
    produto: {
      barcode,
      tipo: 'alimento',
      nome,
      ...(opcoes.marca && { marca: opcoes.marca }),
      categorias: [],
    },
    analise,
    desatualizado: false,
    fonte: 'open_food_facts',
    rotuloPorFoto: false,
  };
}

const REFERENCIA: Referencia = {
  barcode: '100',
  nome: "Maionese Hellmann's",
  marca: "Hellmann's",
  categorias: ['en:sauces', 'en:mayonnaises'],
  nota: 28,
};

describe('escolherAlternativas', () => {
  it('só produtos com nota pelo menos 5 pontos maior, da maior para a menor', () => {
    const { alternativas, comparados } = escolherAlternativas(REFERENCIA, [
      resultado('1', 'Maionese A', 32),
      resultado('2', 'Maionese B', 33),
      resultado('3', 'Maionese C', 60),
      resultado('4', 'Maionese D', 10),
    ]);

    expect(alternativas.map((a) => [a.barcode, a.nota])).toEqual([
      ['3', 60],
      ['2', 33],
    ]);
    expect(comparados).toBe(4);
  });

  it('ignora análises parciais (a nota é só um teto) e sem nota', () => {
    const { alternativas, comparados } = escolherAlternativas(REFERENCIA, [
      resultado('1', 'Maionese A', 90, { status: 'parcial' }),
      resultado('2', 'Maionese B', 0, { status: 'dados_insuficientes' }),
      resultado('3', 'Maionese C', 50),
    ]);

    expect(alternativas.map((a) => a.barcode)).toEqual(['3']);
    expect(comparados).toBe(1);
  });

  it('não sugere o próprio produto, nem cadastros repetidos dele com outro código', () => {
    const { alternativas } = escolherAlternativas(REFERENCIA, [
      resultado('100', "Maionese Hellmann's", 90, { marca: "Hellmann's" }),
      resultado('101', 'Maionese', 80, { marca: "Hellmann's" }),
      resultado('102', "Maionese Hellmann's 500 g", 70, { marca: "Hellmann's" }),
      resultado('103', 'Maionese de Azeite', 60, { marca: "Hellmann's" }),
    ]);

    expect(alternativas.map((a) => a.barcode)).toEqual(['103']);
  });

  it('mesma marca e mesmo nome de linha = mesmo produto (Nescau e "Nescau Refil")', () => {
    const nescau: Referencia = {
      barcode: '200',
      nome: 'Nescau',
      marca: 'Nestlé',
      categorias: ['en:cocoa-and-chocolate-powders', 'en:instant-chocolate-powders'],
      nota: 23,
    };
    const { alternativas } = escolherAlternativas(nescau, [
      resultado('201', 'Achocolatado em pó Nescau 550g Refil', 43, { marca: 'Nestlé' }),
      resultado('202', 'Toddy Original 750g', 50, { marca: 'Toddy' }),
      resultado('203', 'Toddy', 48, { marca: 'Toddy' }),
      resultado('204', 'Toddy Light', 60, { marca: 'Toddy' }),
      resultado('205', 'Cacau em pó', 90, { marca: 'Nestlé' }),
    ]);

    expect(alternativas.map((a) => a.nome)).toEqual([
      'Cacau em pó',
      'Toddy Light',
      'Toddy Original 750g',
    ]);
  });

  it('cacau 100% da mesma marca do achocolatado é outro produto (é a alternativa!)', () => {
    const achocolatado: Referencia = {
      barcode: '300',
      nome: 'Achocolatado em pó',
      marca: 'Garoto',
      categorias: ['en:cocoa-and-chocolate-powders', 'en:instant-chocolate-powders'],
      nota: 23,
    };
    const { alternativas } = escolherAlternativas(achocolatado, [
      resultado('301', 'Cacau em pó 100%', 90, { marca: 'Garoto' }),
      resultado('302', 'Chocolate em pó 70%', 70, { marca: 'Garoto' }),
      resultado('303', 'Chocolate em pó 50%', 60, { marca: 'Garoto' }),
      resultado('304', 'Achocolatado em pó 400 g', 80, { marca: 'Garoto' }),
    ]);
    expect(alternativas.map((a) => a.barcode)).toEqual(['301', '302', '303']);
  });

  it('a mesma marca escrita de outro jeito ainda é a mesma marca', () => {
    const { alternativas } = escolherAlternativas(
      { ...REFERENCIA, nome: 'Maionese', marca: 'Hellmans' },
      [
        resultado('1', 'Maionese', 43, { marca: "Hellmann's" }),
        resultado('2', 'MAIONESE HELLMANNS', 40, { marca: "Hellmann's" }),
        resultado('3', 'Maionese', 41, { marca: 'Heinz' }),
      ],
    );
    expect(alternativas.map((a) => a.barcode)).toEqual(['3']);
  });

  it('marcas curtas que diferem numa letra são marcas diferentes', () => {
    const { alternativas } = escolherAlternativas(
      { ...REFERENCIA, nome: 'Maionese', marca: 'Vitao' },
      [resultado('1', 'Maionese', 60, { marca: 'Vital' })],
    );
    expect(alternativas.map((a) => a.barcode)).toEqual(['1']);
  });

  it('mostra um só cadastro de cada produto (o de nota maior)', () => {
    const { alternativas, comparados } = escolherAlternativas(REFERENCIA, [
      resultado('1', 'Cacau em Pó 200g', 95, { marca: 'Vitao' }),
      resultado('2', 'Cacau em pó', 90, { marca: 'VITAO' }),
      resultado('3', 'Produto sem nome', 99),
    ]);

    expect(alternativas.map((a) => a.barcode)).toEqual(['1']);
    expect(comparados).toBe(1);
  });

  it('no empate de nota, mantém a ordem da base (os mais escaneados primeiro)', () => {
    const { alternativas } = escolherAlternativas(REFERENCIA, [
      resultado('1', 'A', 50),
      resultado('2', 'B', 60),
      resultado('3', 'C', 50),
    ]);
    expect(alternativas.map((a) => a.barcode)).toEqual(['2', '1', '3']);
  });

  it(`no máximo ${LIMITE_ALTERNATIVAS} alternativas`, () => {
    const candidatos = Array.from({ length: 9 }, (_, i) => resultado(String(i), `P${i}`, 50 + i));
    expect(escolherAlternativas(REFERENCIA, candidatos).alternativas).toHaveLength(
      LIMITE_ALTERNATIVAS,
    );
  });

  it('produto sem nota: lista os mais bem avaliados da categoria', () => {
    const { alternativas } = escolherAlternativas({ ...REFERENCIA, nota: null }, [
      resultado('1', 'A', 12),
      resultado('2', 'B', 40),
    ]);
    expect(alternativas.map((a) => a.barcode)).toEqual(['2', '1']);
  });

  it('resume os pilares da nota de cada alternativa', () => {
    const [alternativa] = escolherAlternativas(REFERENCIA, [
      resultado('1', 'Maionese caseira', 60, { marca: 'Sítio' }),
    ]).alternativas;
    expect(alternativa).toEqual({
      barcode: '1',
      tipo: 'alimento',
      nome: 'Maionese caseira',
      marca: 'Sítio',
      nota: 60,
      faixa: 'bom',
      nova: 3,
      nutriScore: 'B',
      lupa: 0,
      alertas: 0,
    });
  });
});

describe('cadastrosSuspeitos', () => {
  // Energia (kcal/100 g) das maioneses vendidas no Brasil, como estavam no OFF em 14/11/2026.
  const MAIONESES = [
    39, 40, 80, 92, 133, 142, 155, 167, 175, 175, 175, 181, 196, 283, 283, 292, 295, 300, 300, 300,
    304, 304, 304, 307, 308, 308, 308, 317, 317, 333, 475, 475, 534, 592, 625, 633, 633, 633, 667,
    745,
  ];
  const cadastros = MAIONESES.map((energiaKcal, i) => ({ barcode: String(i), energiaKcal }));

  it('energia abaixo de 1/3 da mediana: provável porção digitada como 100 g', () => {
    // Mediana = 302 kcal → limite ≈ 101 kcal.
    expect([...cadastrosSuspeitos(cadastros)]).toEqual(['0', '1', '2', '3']);
  });

  it('uma versão light de verdade continua valendo', () => {
    expect(cadastrosSuspeitos(cadastros).has('4')).toBe(false); // 133 kcal
  });

  it('com a porção informada, confirma: porção digitada como 100 g × valor baixo de verdade', () => {
    const comPorcao = [
      ...cadastros,
      { barcode: 'notco', energiaKcal: 39, porcaoG: 12 }, // 39 × 100 ÷ 12 = 325: erro de porção
      { barcode: 'light', energiaKcal: 60, porcaoG: 30 }, // 60 × 100 ÷ 30 = 200: erro de porção
      { barcode: 'real', energiaKcal: 70, porcaoG: 85 }, // 70 × 100 ÷ 85 = 82: valor real
      { barcode: 'cem', energiaKcal: 70, porcaoG: 100 }, // porção de 100 g: valor real
    ];
    const suspeitos = cadastrosSuspeitos(comPorcao);
    expect(suspeitos.has('notco')).toBe(true);
    expect(suspeitos.has('light')).toBe(true);
    expect(suspeitos.has('real')).toBe(false);
    expect(suspeitos.has('cem')).toBe(false);
  });

  it('0 kcal é real (chá, refrigerante zero), não erro de porção', () => {
    const chas = [0, 2, 30, 35, 40, 42, 45].map((energiaKcal, i) => ({
      barcode: String(i),
      energiaKcal,
    }));
    expect([...cadastrosSuspeitos(chas)]).toEqual(['1']); // só o de 2 kcal, sem porção
  });

  it('com poucos produtos (ou sem tabela), ninguém é descartado', () => {
    expect(cadastrosSuspeitos(cadastros.slice(0, 4)).size).toBe(0);
    expect(cadastrosSuspeitos([{ barcode: '1' }, { barcode: '2' }]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Serviço: produtos de verdade (formato do Open Food Facts) passando pelo motor da nota.

const tabela = (kcal: number, acucares: number, gordSat: number, sodioG: number) => ({
  'energy-kcal_100g': kcal,
  sugars_100g: acucares,
  'saturated-fat_100g': gordSat,
  sodium_100g: sodioG,
});

/** Achocolatado ultraprocessado (o produto escaneado). */
const ACHOCOLATADO: ProdutoOff = {
  code: '7891000379691',
  product_name: 'Achocolatado em pó',
  brands: 'Chocomax',
  categories_tags: ['en:cocoa-and-chocolate-powders', 'en:instant-chocolate-powders'],
  ingredients_text_pt:
    'Açúcar, cacau em pó, maltodextrina, minerais, emulsificante lecitina de soja, aromatizante',
  nutriments: tabela(380, 78, 1.5, 0.05),
};

/** Outro achocolatado, tão ruim quanto: não é alternativa. */
const OUTRO_ACHOCOLATADO: ProdutoOff = {
  ...ACHOCOLATADO,
  code: '7894321711263',
  product_name: 'Achocolatado Y',
  brands: 'Docelar',
};

/** Cacau 100%: in natura, sem açúcar — está na categoria de cima. */
const CACAU: ProdutoOff = {
  code: '7896000000017',
  product_name: 'Cacau em pó 100%',
  brands: 'Terracacau',
  categories_tags: ['en:cocoa-and-chocolate-powders'],
  ingredients_text_pt: 'Cacau em pó',
  nutriments: { ...tabela(320, 1, 8, 0.02), fiber_100g: 30, proteins_100g: 20 },
};

/** Sem tabela nutricional na base, mas com a tabela lida por foto no app. */
const CACAU_SEM_TABELA: ProdutoOff = {
  code: '7896000000024',
  product_name: 'Cacau alcalino',
  brands: 'Sítio Verde',
  categories_tags: ['en:cocoa-and-chocolate-powders'],
  ingredients_text_pt: 'Cacau em pó alcalino',
};

const busca = (...produtos: ProdutoOff[]): ResultadoBusca => ({ total: produtos.length, produtos });

function cacheEmMemoria(inicial: [string, BuscaEmCache][] = []) {
  const mapa = new Map<string, BuscaEmCache>(inicial);
  const cache: CacheBuscas = {
    buscar: async (_fonte, categoria) => mapa.get(categoria) ?? null,
    salvar: async (_fonte, categoria, resultado, atualizadoEm) => {
      mapa.set(categoria, { ...resultado, atualizadoEm });
    },
  };
  return { cache, mapa };
}

function rotulosEmMemoria(inicial: [string, RotuloLido][] = []): RepositorioRotulos {
  const mapa = new Map(inicial);
  return {
    buscar: async (b) => mapa.get(b) ?? null,
    buscarVarios: async (bs) =>
      new Map(bs.flatMap((b) => (mapa.has(b) ? [[b, mapa.get(b)!] as const] : []))),
    salvar: async () => {},
  };
}

/** Serviço de produtos falso: devolve o produto escaneado já analisado pelo motor real. */
function produtosCom(produto: ProdutoOff | null): ServicoProdutos {
  return {
    consultar: async () =>
      produto && montarResultado({ fonte: 'open_food_facts', dados: produto }, false),
    enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
  };
}

async function montar({
  produto = ACHOCOLATADO,
  categorias,
  cache = cacheEmMemoria().cache,
  rotulos = rotulosEmMemoria(),
}: {
  produto?: ProdutoOff | null;
  categorias: Record<string, ResultadoBusca | Error>;
  cache?: CacheBuscas;
  rotulos?: RepositorioRotulos;
}) {
  const buscarPorCategoria = vi.fn<ClienteBusca['buscarPorCategoria']>(async (categoria) => {
    const r = categorias[categoria];
    if (!r) return busca();
    if (r instanceof Error) throw r;
    return r;
  });
  const naoUsar = vi.fn<ClienteBusca['buscarPorCategoria']>();
  const log = { warn: vi.fn() };
  const servico = criarServicoAlternativas({
    produtos: produtosCom(produto),
    busca: {
      open_food_facts: { buscarPorCategoria },
      open_beauty_facts: { buscarPorCategoria: naoUsar },
    } satisfies Record<FonteProduto, ClienteBusca>,
    cache,
    rotulos,
    log,
    agora: () => AGORA,
  });
  return { servico, buscarPorCategoria, naoUsar, log };
}

describe('ServicoAlternativas', () => {
  it('categoria específica sem nada melhor: sobe um nível e acha o cacau 100%', async () => {
    const { servico, buscarPorCategoria } = await montar({
      categorias: {
        'en:instant-chocolate-powders': busca(ACHOCOLATADO, OUTRO_ACHOCOLATADO),
        'en:cocoa-and-chocolate-powders': busca(ACHOCOLATADO, OUTRO_ACHOCOLATADO, CACAU),
      },
    });

    const r = await servico.consultar(ACHOCOLATADO.code);

    expect(buscarPorCategoria.mock.calls.map(([c]) => c)).toEqual([
      'en:instant-chocolate-powders',
      'en:cocoa-and-chocolate-powders',
    ]);
    expect(r).toMatchObject({
      status: 'ok',
      categoria: 'Cacau e chocolate em pó',
      comparados: 2,
      alternativas: [{ barcode: CACAU.code, nome: 'Cacau em pó 100%', nova: 1 }],
    });
    if (r?.status !== 'ok') throw new Error('esperava status ok');
    expect(r.referencia).toBeLessThan(r.alternativas[0]!.nota);
  });

  it('sempre olha a categoria de cima, mas não a terceira se já achou alternativas', async () => {
    const { servico, buscarPorCategoria } = await montar({
      produto: { ...ACHOCOLATADO, categories_tags: ['en:a', ...ACHOCOLATADO.categories_tags!] },
      categorias: {
        'en:instant-chocolate-powders': busca(ACHOCOLATADO, OUTRO_ACHOCOLATADO),
        'en:cocoa-and-chocolate-powders': busca(CACAU),
      },
    });

    await servico.consultar(ACHOCOLATADO.code);

    expect(buscarPorCategoria).toHaveBeenCalledTimes(2);
  });

  it('nada nas duas primeiras: tenta a terceira', async () => {
    const { servico, buscarPorCategoria } = await montar({
      produto: { ...ACHOCOLATADO, categories_tags: ['en:a', ...ACHOCOLATADO.categories_tags!] },
      categorias: { 'en:a': busca(CACAU) },
    });

    const r = await servico.consultar(ACHOCOLATADO.code);

    expect(buscarPorCategoria.mock.calls.map(([c]) => c)).toEqual([
      'en:instant-chocolate-powders',
      'en:cocoa-and-chocolate-powders',
      'en:a',
    ]);
    expect(r).toMatchObject({ alternativas: [{ barcode: CACAU.code }] });
  });

  it('a tabela lida por foto (base própria) completa o candidato', async () => {
    const categorias = { 'en:instant-chocolate-powders': busca(ACHOCOLATADO, CACAU_SEM_TABELA) };
    const semFoto = await (await montar({ categorias })).servico.consultar(ACHOCOLATADO.code);
    const comFoto = await (
      await montar({
        categorias,
        rotulos: rotulosEmMemoria([
          [
            CACAU_SEM_TABELA.code,
            {
              tipo: 'alimento',
              nutrientes: {
                energiaKcal: 330,
                acucares: 1,
                gorduraSaturada: 7,
                sodioMg: 20,
                fibras: 28,
                proteinas: 19,
              },
              unidade: 'g',
            },
          ],
        ]),
      })
    ).servico.consultar(ACHOCOLATADO.code);

    expect(semFoto).toMatchObject({ alternativas: [] });
    expect(comFoto).toMatchObject({ alternativas: [{ barcode: CACAU_SEM_TABELA.code }] });
  });

  it('usa a busca em cache por uma semana', async () => {
    const seisDias = new Date(AGORA.getTime() - 6 * DIA);
    const { cache } = cacheEmMemoria([
      ['en:instant-chocolate-powders', { ...busca(CACAU), atualizadoEm: seisDias }],
      ['en:cocoa-and-chocolate-powders', { ...busca(), atualizadoEm: seisDias }],
    ]);
    const { servico, buscarPorCategoria } = await montar({ categorias: {}, cache });

    const r = await servico.consultar(ACHOCOLATADO.code);

    expect(buscarPorCategoria).not.toHaveBeenCalled();
    expect(r).toMatchObject({ alternativas: [{ barcode: CACAU.code }] });
  });

  it('busca vencida: consulta de novo e grava no cache', async () => {
    const { cache, mapa } = cacheEmMemoria([
      [
        'en:instant-chocolate-powders',
        { ...busca(), atualizadoEm: new Date(AGORA.getTime() - 8 * DIA) },
      ],
    ]);
    const { servico } = await montar({
      categorias: { 'en:instant-chocolate-powders': busca(CACAU) },
      cache,
    });

    await servico.consultar(ACHOCOLATADO.code);

    expect(mapa.get('en:instant-chocolate-powders')).toEqual({
      ...busca(CACAU),
      atualizadoEm: AGORA,
    });
  });

  it('busca fora do ar: usa a cópia vencida do cache', async () => {
    const { cache } = cacheEmMemoria([
      [
        'en:instant-chocolate-powders',
        { ...busca(CACAU), atualizadoEm: new Date(AGORA.getTime() - 30 * DIA) },
      ],
    ]);
    const { servico, log } = await montar({
      categorias: { 'en:instant-chocolate-powders': new FonteIndisponivelError('teste') },
      cache,
    });

    expect(await servico.consultar(ACHOCOLATADO.code)).toMatchObject({
      alternativas: [{ barcode: CACAU.code }],
    });
    expect(log.warn).toHaveBeenCalled();
  });

  it('todas as buscas fora do ar e sem cache: repassa o erro', async () => {
    const { servico } = await montar({
      categorias: {
        'en:instant-chocolate-powders': new FonteIndisponivelError('teste'),
        'en:cocoa-and-chocolate-powders': new FonteIndisponivelError('teste'),
      },
    });
    await expect(servico.consultar(ACHOCOLATADO.code)).rejects.toBeInstanceOf(
      FonteIndisponivelError,
    );
  });

  it('a categoria específica fora do ar: responde com a de cima, marcada como incompleta', async () => {
    const { servico } = await montar({
      categorias: {
        'en:instant-chocolate-powders': new FonteIndisponivelError('teste'),
        'en:cocoa-and-chocolate-powders': busca(CACAU),
      },
    });

    expect(await servico.consultar(ACHOCOLATADO.code)).toMatchObject({
      incompleta: true,
      alternativas: [{ barcode: CACAU.code }],
    });
  });

  it('as duas primeiras buscas saem juntas (sem esperar uma pela outra)', async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((r) => (soltar = r));
    const iniciadas: string[] = [];
    const servico = criarServicoAlternativas({
      produtos: produtosCom(ACHOCOLATADO),
      busca: {
        open_food_facts: {
          buscarPorCategoria: async (c) => {
            iniciadas.push(c);
            await segura;
            return busca(CACAU);
          },
        },
        open_beauty_facts: { buscarPorCategoria: vi.fn() },
      },
      cache: cacheEmMemoria().cache,
      rotulos: rotulosEmMemoria(),
      log: { warn: vi.fn() },
      agora: () => AGORA,
    });

    const pedido = servico.consultar(ACHOCOLATADO.code);
    await vi.waitFor(() => expect(iniciadas).toHaveLength(2));
    soltar();
    await pedido;
  });

  it('o nível de cima fora do ar: responde com o que achou no anterior', async () => {
    const { servico } = await montar({
      categorias: {
        'en:instant-chocolate-powders': busca(ACHOCOLATADO, OUTRO_ACHOCOLATADO),
        'en:cocoa-and-chocolate-powders': new FonteIndisponivelError('teste'),
      },
    });

    expect(await servico.consultar(ACHOCOLATADO.code)).toMatchObject({
      status: 'ok',
      categoria: 'Achocolatado',
      comparados: 1,
      incompleta: true,
      alternativas: [],
    });
  });

  it('pedidos simultâneos da mesma categoria dividem uma busca só', async () => {
    const { servico, buscarPorCategoria } = await montar({
      categorias: { 'en:instant-chocolate-powders': busca(CACAU) },
    });

    await Promise.all([servico.consultar(ACHOCOLATADO.code), servico.consultar(ACHOCOLATADO.code)]);

    expect(buscarPorCategoria).toHaveBeenCalledTimes(2); // uma por categoria, não quatro
  });

  it('não sugere cadastro com valores fora do padrão da categoria', async () => {
    // Cacau com os valores de uma porção de 10 g no campo "por 100 g": nota inflada.
    const PORCAO_COMO_100G: ProdutoOff = {
      ...CACAU,
      code: '7896000000031',
      product_name: 'Cacau em pó Sítio',
      brands: 'Sítio',
      nutriments: { ...tabela(32, 0.1, 0.8, 0.002), fiber_100g: 3, proteins_100g: 2 },
    };
    const outros = Array.from({ length: 4 }, (_, i) => ({
      ...OUTRO_ACHOCOLATADO,
      code: `78900000000${i}`,
      product_name: `Achocolatado ${i}`,
      brands: `Fabricante ${i}`,
    }));
    const { servico } = await montar({
      categorias: {
        'en:instant-chocolate-powders': busca(ACHOCOLATADO, ...outros, PORCAO_COMO_100G, CACAU),
      },
    });

    const r = await servico.consultar(ACHOCOLATADO.code);

    expect(r).toMatchObject({ ignorados: 1, alternativas: [{ barcode: CACAU.code }] });
  });

  it('produto sem categoria: não busca nada', async () => {
    const { servico, buscarPorCategoria } = await montar({
      produto: { ...ACHOCOLATADO, categories_tags: [] },
      categorias: {},
    });

    expect(await servico.consultar(ACHOCOLATADO.code)).toEqual({ status: 'sem_categoria' });
    expect(buscarPorCategoria).not.toHaveBeenCalled();
  });

  it('produto que não existe: null', async () => {
    const { servico } = await montar({ produto: null, categorias: {} });
    expect(await servico.consultar('123')).toBeNull();
  });
});

describe('GET /produtos/:barcode/alternativas', () => {
  const app = (consultar: ServicoAlternativas['consultar']) =>
    buildApp({
      pingDb: async () => {},
      produtos: {
        consultar: async () => null,
        enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
      },
      alternativas: { consultar },
    });

  it('200 com as alternativas', async () => {
    const corpo = { status: 'sem_categoria' as const };
    const r = await app(async () => corpo).inject('/produtos/7891000379691/alternativas');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(corpo);
  });

  it('400 com código inválido', async () => {
    const r = await app(async () => null).inject('/produtos/abc/alternativas');
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ erro: 'codigo_invalido' });
  });

  it('404 quando o produto não existe', async () => {
    const r = await app(async () => null).inject('/produtos/7891000379691/alternativas');
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ erro: 'produto_nao_encontrado' });
  });

  it('503 quando a busca está fora do ar', async () => {
    const r = await app(async () => {
      throw new FonteIndisponivelError('teste');
    }).inject('/produtos/7891000379691/alternativas');
    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ erro: 'fonte_indisponivel' });
  });
});
