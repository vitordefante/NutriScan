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

/** Linhas do OCR feito no aparelho. Limites folgados para um rótulo, apertados para abuso. */
const linhasSchema = z
  .array(
    z.object({
      texto: z.string().max(500),
      x: z.number().min(-0.1).max(1.1),
      y: z.number().min(-0.1).max(1.1),
      largura: z.number().min(0).max(1.1),
      altura: z.number().min(0).max(1.1),
    }),
  )
  .max(800);

const envioSchema = z
  .object({
    tipo: z.enum(['alimento', 'cosmetico']),
    nome: z.string().trim().max(120).optional(),
    ingredientes: linhasSchema.optional(),
    tabela: linhasSchema.optional(),
  })
  .refine((e) => e.ingredientes || e.tabela, 'Envie ao menos uma foto.');

const NOME_FOTO = { ingredientes: 'a lista de ingredientes', tabela: 'a tabela nutricional' };

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
            erro(
              'produto_nao_encontrado',
              'Produto não encontrado no Open Food Facts nem no Open Beauty Facts.',
            ),
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

  app.post('/produtos/:barcode/rotulo', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .code(400)
        .send(erro('codigo_invalido', 'O código de barras deve ter de 8 a 14 dígitos.'));
    }
    const envio = envioSchema.safeParse(request.body);
    if (!envio.success) {
      return reply.code(400).send(erro('rotulo_invalido', 'Envio do rótulo em formato inválido.'));
    }

    const r = await produtos.enviarRotulo(params.data.barcode, envio.data);
    if (!r.ok) {
      const fotos = r.ilegiveis.map((f) => NOME_FOTO[f]).join(' e ');
      return reply
        .code(422)
        .send(
          erro(
            'rotulo_ilegivel',
            `Não consegui ler ${fotos} na${r.ilegiveis.length > 1 ? 's fotos' : ' foto'}. Tente de novo, com o rótulo reto e bem iluminado.`,
          ),
        );
    }
    return r.resultado;
  });
};

const erro = (codigo: ApiError['erro'], mensagem: string): ApiError => ({ erro: codigo, mensagem });
