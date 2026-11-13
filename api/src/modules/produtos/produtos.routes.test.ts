import type { ProductResult } from '@nutriscan/shared';
import { describe, expect, it, vi } from 'vitest';

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
  fonte: 'open_food_facts',
};

function app(
  consultar: ServicoProdutos['consultar'],
  enviarRotulo: ServicoProdutos['enviarRotulo'] = async () => ({ ok: true, resultado: RESULTADO }),
) {
  return buildApp({ pingDb: async () => {}, produtos: { consultar, enviarRotulo } });
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

describe('POST /produtos/:barcode/rotulo', () => {
  const linha = { texto: 'Ingredientes: açúcar', x: 0, y: 0, largura: 1, altura: 0.1 };
  const enviar = (a: ReturnType<typeof app>, payload: unknown, codigo = '7894900010398') =>
    a.inject({ method: 'POST', url: `/produtos/${codigo}/rotulo`, payload: payload as object });

  it('200 com a nova análise', async () => {
    const enviarRotulo = vi.fn<ServicoProdutos['enviarRotulo']>(async () => ({
      ok: true,
      resultado: RESULTADO,
    }));
    const r = await enviar(
      app(async () => null, enviarRotulo),
      {
        tipo: 'alimento',
        ingredientes: [linha],
      },
    );

    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(RESULTADO);
    expect(enviarRotulo).toHaveBeenCalledWith('7894900010398', {
      tipo: 'alimento',
      ingredientes: [linha],
    });
  });

  it.each([
    ['sem fotos', { tipo: 'alimento' }],
    ['tipo desconhecido', { tipo: 'remedio', ingredientes: [linha] }],
    ['linha sem posição', { tipo: 'alimento', ingredientes: [{ texto: 'x' }] }],
  ])('400 para envio inválido (%s)', async (_caso, corpo) => {
    const r = await enviar(
      app(async () => null),
      corpo,
    );
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ erro: 'rotulo_invalido' });
  });

  it('400 para código inválido', async () => {
    const r = await enviar(
      app(async () => null),
      { tipo: 'alimento', ingredientes: [linha] },
      '12',
    );
    expect(r.statusCode).toBe(400);
  });

  it('422 diz qual foto não pôde ser lida', async () => {
    const r = await enviar(
      app(
        async () => null,
        async () => ({ ok: false, ilegiveis: ['ingredientes', 'tabela'] }),
      ),
      { tipo: 'alimento', ingredientes: [linha], tabela: [linha] },
    );

    expect(r.statusCode).toBe(422);
    expect(r.json().mensagem).toContain(
      'Não consegui ler a lista de ingredientes e a tabela nutricional nas fotos.',
    );
  });
});
