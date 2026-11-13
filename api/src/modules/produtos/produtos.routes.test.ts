import type { ProductResult } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { FonteIndisponivelError } from './open-food-facts.client.js';
import type { ServicoProdutos } from './produtos.service.js';

const RESULTADO: ProductResult = {
  produto: { barcode: '7894900010398', tipo: 'alimento', nome: 'Refrigerante', categorias: [] },
  analise: {
    status: 'completa',
    nota: 5,
    faixa: 'pessimo',
    itens: [],
    alertas: [],
    destaques: { nova: null, nutriScore: null, lupa: [] },
  },
  desatualizado: false,
};

function app(consultar: ServicoProdutos['consultar']) {
  return buildApp({ pingDb: async () => {}, produtos: { consultar } });
}

describe('GET /produtos/:barcode', () => {
  it('200 com produto e análise', async () => {
    const r = await app(async () => RESULTADO).inject({
      method: 'GET',
      url: '/produtos/7894900010398',
    });

    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(RESULTADO);
  });

  it.each(['123', 'abc12345', '789490001039812345'])(
    '400 para código inválido (%s)',
    async (codigo) => {
      const r = await app(async () => RESULTADO).inject({
        method: 'GET',
        url: `/produtos/${codigo}`,
      });

      expect(r.statusCode).toBe(400);
      expect(r.json()).toMatchObject({ erro: 'codigo_invalido' });
    },
  );

  it('404 quando o produto não existe', async () => {
    const r = await app(async () => null).inject({ method: 'GET', url: '/produtos/7890000000000' });

    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ erro: 'produto_nao_encontrado' });
  });

  it('503 quando a fonte está fora do ar', async () => {
    const r = await app(async () => {
      throw new FonteIndisponivelError('teste');
    }).inject({ method: 'GET', url: '/produtos/7894900010398' });

    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ erro: 'fonte_indisponivel' });
  });
});
