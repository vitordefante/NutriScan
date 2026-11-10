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

/** Cache em memória, com uma entrada inicial opcional. */
function cacheEmMemoria(
  inicial?: [string, EntradaCache],
): CacheProdutos & { mapa: Map<string, EntradaCache> } {
  const mapa = new Map<string, EntradaCache>(inicial ? [inicial] : []);
  return {
    mapa,
    buscar: async (barcode) => mapa.get(barcode) ?? null,
    salvar: async (barcode, dados, atualizadoEm) => {
      mapa.set(barcode, { dados, atualizadoEm });
    },
  };
}

function montar({ off, cache }: { off: ClienteOff['buscarProduto']; cache: CacheProdutos }) {
  const buscarProduto = vi.fn(off);
  const log = { warn: vi.fn() };
  const servico = criarServicoProdutos({ off: { buscarProduto }, cache, log, agora: () => AGORA });
  return { servico, buscarProduto, log };
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
    expect(cache.mapa.get(COLA.code)).toEqual({ dados: COLA, atualizadoEm: AGORA });
  });

  it('usa o cache válido sem consultar a fonte', async () => {
    const cache = cacheEmMemoria([COLA.code, { dados: COLA, atualizadoEm: diasAtras(29) }]);
    const { servico, buscarProduto } = montar({ off: async () => null, cache });

    expect((await servico.consultar(COLA.code))?.produto.barcode).toBe(COLA.code);
    expect(buscarProduto).not.toHaveBeenCalled();
  });

  it('consulta a fonte de novo quando o cache venceu', async () => {
    const cache = cacheEmMemoria([COLA.code, { dados: COLA, atualizadoEm: diasAtras(31) }]);
    const { servico, buscarProduto } = montar({ off: async () => COLA, cache });

    await servico.consultar(COLA.code);

    expect(buscarProduto).toHaveBeenCalledOnce();
    expect(cache.mapa.get(COLA.code)?.atualizadoEm).toEqual(AGORA);
  });

  it('guarda "não encontrado" no cache por 1 dia', async () => {
    const cache = cacheEmMemoria();
    const { servico, buscarProduto } = montar({ off: async () => null, cache });

    expect(await servico.consultar('7890000000000')).toBeNull();
    expect(await servico.consultar('7890000000000')).toBeNull();
    expect(buscarProduto).toHaveBeenCalledOnce();
  });

  it('com a fonte fora do ar, usa a cópia antiga do cache marcada como desatualizada', async () => {
    const cache = cacheEmMemoria([COLA.code, { dados: COLA, atualizadoEm: diasAtras(90) }]);
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
