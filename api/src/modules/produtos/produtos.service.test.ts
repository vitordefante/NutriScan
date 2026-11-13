import { describe, expect, it, vi } from 'vitest';

import { type ClienteOff, FonteIndisponivelError } from './open-food-facts.client.js';
import type { LabelLine } from '@nutriscan/shared';

import type { RotuloLido } from '../rotulo/leitura.js';
import type { RepositorioRotulos } from '../rotulo/rotulos.repository.js';
import type { ProdutoOff } from './open-food-facts.mapper.js';
import { type CacheProdutos, criarServicoProdutos, type EntradaCache } from './produtos.service.js';

const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-11-10T12:00:00Z');
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * DIA);

const COLA: ProdutoOff = {
  code: '7894900010398',
  product_name: 'Refrigerante de Cola',
  quantity: '220 mL',
  ingredients_text_pt:
    'Água gaseificada, açúcar, extrato de noz de cola, cafeína, corante caramelo IV',
  nutriments: {
    'energy-kcal_100g': 44,
    sugars_100g: 11,
    'saturated-fat_100g': 0,
    sodium_100g: 0.005,
  },
};

const SHAMPOO: ProdutoOff = {
  code: '7891150102613',
  product_name: 'Shampoo de teste',
  categories_tags: ['en:shampoos'],
  ingredients_text:
    'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Parfum, Sodium Chloride, Glycerin, Citric Acid, Methylparaben',
};

const off = (dados: ProdutoOff | null): EntradaCache => ({
  fonte: 'open_food_facts',
  dados,
  atualizadoEm: AGORA,
});

/** Cache em memória, com uma entrada inicial opcional. */
function cacheEmMemoria(
  inicial?: [string, EntradaCache],
): CacheProdutos & { mapa: Map<string, EntradaCache> } {
  const mapa = new Map<string, EntradaCache>(inicial ? [inicial] : []);
  return {
    mapa,
    buscar: async (barcode) => mapa.get(barcode) ?? null,
    salvar: async (barcode, resultado, atualizadoEm) => {
      mapa.set(barcode, { ...resultado, atualizadoEm });
    },
  };
}

type Busca = ClienteOff['buscarProduto'];

function rotulosEmMemoria(): RepositorioRotulos & { mapa: Map<string, RotuloLido> } {
  const mapa = new Map<string, RotuloLido>();
  return {
    mapa,
    buscar: async (barcode) => mapa.get(barcode) ?? null,
    salvar: async (barcode, lido) => {
      mapa.set(barcode, lido);
    },
  };
}

function montar({
  off: buscaOff,
  obf: buscaObf = async () => null,
  cache,
  rotulos = rotulosEmMemoria(),
}: {
  off: Busca;
  obf?: Busca;
  cache: CacheProdutos;
  rotulos?: RepositorioRotulos;
}) {
  const buscarProduto = vi.fn(buscaOff);
  const buscarObf = vi.fn(buscaObf);
  const log = { warn: vi.fn() };
  const servico = criarServicoProdutos({
    off: { buscarProduto },
    obf: { buscarProduto: buscarObf },
    cache,
    rotulos,
    log,
    agora: () => AGORA,
  });
  return { servico, buscarProduto, buscarObf, log };
}

const foraDoAr = async (): Promise<ProdutoOff | null> => {
  throw new FonteIndisponivelError('teste');
};

describe('ServicoProdutos.consultar', () => {
  it('busca na fonte, analisa e grava no cache', async () => {
    const cache = cacheEmMemoria();
    const { servico } = montar({ off: async () => COLA, cache });

    const r = await servico.consultar(COLA.code);

    expect(r?.produto.nome).toBe('Refrigerante de Cola');
    expect(r?.analise.status).toBe('completa');
    expect(r?.desatualizado).toBe(false);
    expect(cache.mapa.get(COLA.code)).toEqual(off(COLA));
  });

  it('usa o cache válido sem consultar a fonte', async () => {
    const cache = cacheEmMemoria([COLA.code, { ...off(COLA), atualizadoEm: diasAtras(29) }]);
    const { servico, buscarProduto } = montar({ off: async () => null, cache });

    expect((await servico.consultar(COLA.code))?.produto.barcode).toBe(COLA.code);
    expect(buscarProduto).not.toHaveBeenCalled();
  });

  it('consulta a fonte de novo quando o cache venceu', async () => {
    const cache = cacheEmMemoria([COLA.code, { ...off(COLA), atualizadoEm: diasAtras(31) }]);
    const { servico, buscarProduto } = montar({ off: async () => COLA, cache });

    await servico.consultar(COLA.code);

    expect(buscarProduto).toHaveBeenCalledOnce();
    expect(cache.mapa.get(COLA.code)?.atualizadoEm).toEqual(AGORA);
  });

  it('guarda "não encontrado" (nas duas fontes) no cache por 1 dia', async () => {
    const cache = cacheEmMemoria();
    const { servico, buscarProduto, buscarObf } = montar({ off: async () => null, cache });

    expect(await servico.consultar('7890000000000')).toBeNull();
    expect(await servico.consultar('7890000000000')).toBeNull();
    expect(buscarProduto).toHaveBeenCalledOnce();
    expect(buscarObf).toHaveBeenCalledOnce();
  });

  it('alimento com dados no Open Food Facts ganha do Open Beauty Facts', async () => {
    const { servico } = montar({
      off: async () => COLA,
      obf: async () => ({ ...SHAMPOO, code: COLA.code }),
      cache: cacheEmMemoria(),
    });

    expect((await servico.consultar(COLA.code))?.produto.tipo).toBe('alimento');
  });

  it('cadastro do OFF só com nome perde para o Open Beauty Facts', async () => {
    const soNome: ProdutoOff = { code: SHAMPOO.code, product_name: 'Shampoo' };
    const { servico } = montar({
      off: async () => soNome,
      obf: async () => SHAMPOO,
      cache: cacheEmMemoria(),
    });

    expect((await servico.consultar(SHAMPOO.code))?.produto.tipo).toBe('cosmetico');
  });

  it('cadastro do OFF só com nome é usado se o OBF não conhece o código', async () => {
    const soNome: ProdutoOff = { code: '7890000000001', product_name: 'Óleo de rícino' };
    const { servico } = montar({ off: async () => soNome, cache: cacheEmMemoria() });

    const r = await servico.consultar(soNome.code);
    expect(r?.produto.tipo).toBe('alimento');
    expect(r?.analise.status).toBe('dados_insuficientes');
  });

  it('com o OFF fora do ar, o cosmético ainda é encontrado no Open Beauty Facts', async () => {
    const { servico } = montar({
      off: foraDoAr,
      obf: async () => SHAMPOO,
      cache: cacheEmMemoria(),
    });

    expect((await servico.consultar(SHAMPOO.code))?.produto.tipo).toBe('cosmetico');
  });

  it('código fora do Open Food Facts é buscado no Open Beauty Facts e analisado como cosmético', async () => {
    const cache = cacheEmMemoria();
    const { servico } = montar({ off: async () => null, obf: async () => SHAMPOO, cache });

    const r = await servico.consultar(SHAMPOO.code);

    expect(r?.produto.tipo).toBe('cosmetico');
    expect(r?.produto.subtipo).toBe('Shampoo');
    expect(r?.analise.alertas.map((a) => a.titulo)).toContain('Fragrância não revelada');
    expect(cache.mapa.get(SHAMPOO.code)?.fonte).toBe('open_beauty_facts');
  });

  it('cosmético em cache é analisado como cosmético', async () => {
    const cache = cacheEmMemoria([
      SHAMPOO.code,
      { fonte: 'open_beauty_facts', dados: SHAMPOO, atualizadoEm: diasAtras(1) },
    ]);
    const { servico, buscarProduto } = montar({ off: async () => null, cache });

    expect((await servico.consultar(SHAMPOO.code))?.produto.tipo).toBe('cosmetico');
    expect(buscarProduto).not.toHaveBeenCalled();
  });

  it('OFF diz "não encontrado" mas o OBF está fora do ar: erro de fonte, não "não encontrado"', async () => {
    const { servico } = montar({ off: async () => null, obf: foraDoAr, cache: cacheEmMemoria() });
    await expect(servico.consultar(SHAMPOO.code)).rejects.toBeInstanceOf(FonteIndisponivelError);
  });

  it('com a fonte fora do ar, usa a cópia antiga do cache marcada como desatualizada', async () => {
    const cache = cacheEmMemoria([COLA.code, { ...off(COLA), atualizadoEm: diasAtras(90) }]);
    const { servico, log } = montar({ off: foraDoAr, cache });

    const r = await servico.consultar(COLA.code);

    expect(r?.desatualizado).toBe(true);
    expect(log.warn).toHaveBeenCalled();
  });

  it('com a fonte fora do ar e sem cache, repassa o erro', async () => {
    const { servico } = montar({ off: foraDoAr, cache: cacheEmMemoria() });
    await expect(servico.consultar(COLA.code)).rejects.toBeInstanceOf(FonteIndisponivelError);
  });

  it('se o banco falhar, continua funcionando pela fonte', async () => {
    const cacheQuebrado: CacheProdutos = {
      buscar: async () => {
        throw new Error('banco fora do ar');
      },
      salvar: async () => {
        throw new Error('banco fora do ar');
      },
    };
    const { servico, log } = montar({ off: async () => COLA, cache: cacheQuebrado });

    expect((await servico.consultar(COLA.code))?.produto.barcode).toBe(COLA.code);
    expect(log.warn).toHaveBeenCalledTimes(2);
  });
});

/** Linhas do OCR de uma foto (um parágrafo por linha, uma embaixo da outra). */
const fotoTexto = (...textos: string[]): LabelLine[] =>
  textos.map((texto, i) => ({ texto, x: 0.05, y: 0.1 + i * 0.05, largura: 0.9, altura: 0.04 }));

const FOTO_INGREDIENTES = fotoTexto(
  'Ingredientes: farinha de trigo, açúcar, gordura vegetal,',
  'aromatizante e corante tartrazina.',
  'ALÉRGICOS: CONTÉM TRIGO.',
);
const FOTO_TABELA = fotoTexto(
  'Porção de 30 g (3 biscoitos)',
  '100 g 30 g %VD*',
  'Valor energético (kcal) 480 144 7',
  'Açúcares adicionados (g) 30 9 18',
  'Gorduras saturadas (g) 9,5 2,9 14',
  'Sódio (mg) 310 93 5',
);

describe('ServicoProdutos.enviarRotulo (base própria)', () => {
  it('produto desconhecido: monta e analisa só pela foto, com o nome digitado', async () => {
    const { servico } = montar({ off: async () => null, cache: cacheEmMemoria() });

    const r = await servico.enviarRotulo('7890000000001', {
      tipo: 'alimento',
      nome: 'Biscoito da padaria',
      ingredientes: FOTO_INGREDIENTES,
      tabela: FOTO_TABELA,
    });

    if (!r.ok) throw new Error('esperava leitura');
    expect(r.resultado.fonte).toBe('foto');
    expect(r.resultado.produto.nome).toBe('Biscoito da padaria');
    const { analise } = r.resultado;
    if (analise.status === 'dados_insuficientes') throw new Error('esperava nota');
    expect(analise.destaques.nova?.grupo).toBe(4);
    expect(analise.destaques.lupa.map((l) => l.nutriente)).toEqual(
      expect.arrayContaining(['acucar_adicionado', 'gordura_saturada']),
    );
    expect(analise.alertas.map((a) => a.id)).toContain('aditivo-corantes-azoicos');
  });

  it('o próximo scan do mesmo código já encontra o produto (sem nova foto)', async () => {
    const { servico } = montar({ off: async () => null, cache: cacheEmMemoria() });
    await servico.enviarRotulo('7890000000001', {
      tipo: 'alimento',
      ingredientes: FOTO_INGREDIENTES,
    });

    const r = await servico.consultar('7890000000001');
    expect(r?.fonte).toBe('foto');
    expect(r?.produto.nome).toBe('Produto sem nome');
  });

  it('cadastro do OFF sem ingredientes: mantém nome e marca, usa a lista da foto', async () => {
    const semLista: ProdutoOff = {
      code: '7890000000002',
      product_name: 'Biscoito X',
      brands: 'Marca Y',
    };
    const { servico } = montar({ off: async () => semLista, cache: cacheEmMemoria() });

    const r = await servico.enviarRotulo(semLista.code, {
      tipo: 'alimento',
      ingredientes: FOTO_INGREDIENTES,
    });

    if (!r.ok) throw new Error('esperava leitura');
    expect(r.resultado.produto).toMatchObject({ nome: 'Biscoito X', marca: 'Marca Y' });
    expect(r.resultado.produto.ingredientes).toContain('farinha de trigo');
  });

  it('foto ilegível: diz qual foto e não guarda nada', async () => {
    const rotulos = rotulosEmMemoria();
    const { servico } = montar({ off: async () => null, cache: cacheEmMemoria(), rotulos });

    const r = await servico.enviarRotulo('7890000000003', {
      tipo: 'alimento',
      ingredientes: FOTO_INGREDIENTES,
      tabela: fotoTexto('borrado'),
    });

    expect(r).toEqual({ ok: false, ilegiveis: ['tabela'] });
    expect(rotulos.mapa.size).toBe(0);
  });

  it('novo envio só com a tabela mantém a lista enviada antes', async () => {
    const rotulos = rotulosEmMemoria();
    const { servico } = montar({ off: async () => null, cache: cacheEmMemoria(), rotulos });

    await servico.enviarRotulo('7890000000004', {
      tipo: 'alimento',
      ingredientes: FOTO_INGREDIENTES,
    });
    await servico.enviarRotulo('7890000000004', { tipo: 'alimento', tabela: FOTO_TABELA });

    const lido = rotulos.mapa.get('7890000000004');
    expect(lido?.ingredientes).toContain('farinha de trigo');
    expect(lido?.nutrientes?.sodioMg).toBe(310);
  });

  it('com as bases fora do ar, o produto lido por foto continua respondendo', async () => {
    const rotulos = rotulosEmMemoria();
    rotulos.mapa.set('7890000000005', {
      tipo: 'cosmetico',
      nome: 'Creme',
      ingredientes: 'Aqua, Parfum',
    });
    const { servico } = montar({ off: foraDoAr, obf: foraDoAr, cache: cacheEmMemoria(), rotulos });

    const r = await servico.consultar('7890000000005');

    expect(r?.fonte).toBe('foto');
    expect(r?.produto.tipo).toBe('cosmetico');
    expect(r?.desatualizado).toBe(true);
  });
});
