import type { HistoryItem } from '@nutriscan/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { erro } from '../../http/respostas.js';
import type { RepositorioHistorico } from './historico.repository.js';

export type HistoricoDeps = {
  historico: RepositorioHistorico;
};

/** Quantos itens a lista devolve (e quantos um envio pode trazer). */
export const LIMITE_HISTORICO = 200;

const itemSchema = z.object({
  barcode: z.string().regex(/^\d{8,14}$/),
  tipo: z.enum(['alimento', 'cosmetico']),
  nome: z.string().trim().min(1).max(200),
  marca: z.string().trim().max(120).optional(),
  imagemUrl: z
    .url({ protocol: /^https$/ })
    .max(500)
    .optional(),
  nota: z.number().int().min(0).max(100).nullable(),
  faixa: z.enum(['excelente', 'bom', 'regular', 'ruim', 'pessimo']).nullable(),
  escaneadoEm: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<HistoryItem>;

const envioSchema = z.object({ itens: z.array(itemSchema).max(LIMITE_HISTORICO) });

export const historicoRoutes: FastifyPluginAsync<HistoricoDeps> = async (app, { historico }) => {
  app.addHook('preHandler', app.exigirConta);

  app.get('/historico', async (request) => historico.listar(request.user.sub, LIMITE_HISTORICO));

  /**
   * Sincronização: guarda os scans feitos no aparelho e devolve o histórico da conta já
   * juntado (inclui os de outros aparelhos) — uma chamada só.
   */
  app.post('/historico', async (request, reply) => {
    const corpo = envioSchema.safeParse(request.body);
    if (!corpo.success) {
      return reply.code(400).send(erro('dados_invalidos', 'Histórico em formato inválido.'));
    }
    await historico.salvar(request.user.sub, corpo.data.itens);
    return historico.listar(request.user.sub, LIMITE_HISTORICO);
  });

  app.delete('/historico', async (request, reply) => {
    await historico.limpar(request.user.sub);
    return reply.code(204).send();
  });
};
