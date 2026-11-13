import type { ApiError } from '@nutriscan/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { FonteIndisponivelError } from './open-food-facts.client.js';
import type { ServicoProdutos } from './produtos.service.js';

export type ProdutosDeps = {
  produtos: ServicoProdutos;
};

/** EAN-8, UPC-A (12), EAN-13 ou GTIN-14: só dígitos. */
const paramsSchema = z.object({ barcode: z.string().regex(/^\d{8,14}$/) });

export const produtosRoutes: FastifyPluginAsync<ProdutosDeps> = async (app, { produtos }) => {
  app.get('/produtos/:barcode', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send(erro('codigo_invalido', 'O código de barras deve ter de 8 a 14 dígitos.'));
    }

    try {
      const resultado = await produtos.consultar(params.data.barcode);
      if (!resultado) {
        return reply
          .code(404)
          .send(
            erro('produto_nao_encontrado', 'Produto não encontrado na base do Open Food Facts.'),
          );
      }
      return resultado;
    } catch (err) {
      if (err instanceof FonteIndisponivelError) {
        request.log.error({ err }, 'Fonte de produtos indisponível e produto fora do cache');
        return reply
          .code(503)
          .send(
            erro(
              'fonte_indisponivel',
              'A base de produtos está fora do ar. Tente de novo em instantes.',
            ),
          );
      }
      throw err;
    }
  });
};

const erro = (codigo: ApiError['erro'], mensagem: string): ApiError => ({ erro: codigo, mensagem });
