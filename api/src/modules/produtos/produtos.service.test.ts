import { describe, expect, it, vi } from 'vitest';

import { type ClienteOff, FonteIndisponivelError } from './open-food-facts.client.js';
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

function montar({
  off: buscaOff,
  obf: buscaObf = async () => null,
  cache,
}: {
  off: Busca;
  obf?: Busca;
  cache: CacheProdutos;
}) {
  const buscarProduto = vi.fn(buscaOff);
  const buscarObf = vi.fn(buscaObf);
  const log = { warn: vi.fn() };
  const servico = criarServicoProdutos({
    off: { buscarProduto },
    obf: { buscarProduto: buscarObf },
    cache,
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

  it('alimento encontrado no Open Food Facts não consulta o Open Beauty Facts', async () => {
    const { servico, buscarObf } = montar({ off: async () => COLA, cache: cacheEmMemoria() });

    expect((await servico.consultar(COLA.code))?.produto.tipo).toBe('alimento');
    expect(buscarObf).not.toHaveBeenCalled();
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
