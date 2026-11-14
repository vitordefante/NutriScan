import type { FastifyPluginAsync } from 'fastify';

import { FonteIndisponivelError } from '../produtos/open-food-facts.client.js';
import { erro, paramsBarcode } from '../../http/respostas.js';
import type { ServicoAlternativas } from './alternativas.service.js';

export type AlternativasDeps = {
  alternativas: ServicoAlternativas;
};

export const alternativasRoutes: FastifyPluginAsync<AlternativasDeps> = async (
  app,
  { alternativas },
) => {
  app.get('/produtos/:barcode/alternativas', async (request, reply) => {
    const params = paramsBarcode.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send(erro('codigo_invalido', 'O código de barras deve ter de 8 a 14 dígitos.'));
    }

    try {
      const resultado = await alternativas.consultar(params.data.barcode);
      if (!resultado) {
        return reply
          .code(404)
          .send(
            erro(
              'produto_nao_encontrado',
              'Produto não encontrado no Open Food Facts nem no Open Beauty Facts.',
            ),
          );
      }
      return resultado;
    } catch (err) {
      if (err instanceof FonteIndisponivelError) {
        request.log.error({ err }, 'Busca de alternativas indisponível e fora do cache');
        return reply
          .code(503)
          .send(
            erro(
              'fonte_indisponivel',
              'A busca de alternativas está fora do ar. Tente de novo em instantes.',
            ),
          );
      }
      throw err;
    }
  });
};
