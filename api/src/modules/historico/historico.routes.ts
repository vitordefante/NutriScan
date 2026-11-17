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

/**
 * O envio é validado item a item: um item ruim (nome gigante, código estranho vindo de um
 * cadastro do OFF) fica de fora sozinho. Se ele derrubasse o envio inteiro, o app mandaria o
 * mesmo item de novo a cada sincronização e o histórico nunca mais subiria.
 */
const envioSchema = z.object({ itens: z.array(z.unknown()).max(LIMITE_HISTORICO) });

export const historicoRoutes: FastifyPluginAsync<HistoricoDeps> = async (app, { historico }) => {
  app.addHook('preHandler', app.exigirConta);

  app.get('/historico', async (request) => historico.listar(request.user.sub, LIMITE_HISTORICO));

  /** Guarda os scans feitos no aparelho (a lista da conta vem pelo GET, quando o app precisa). */
  app.post('/historico', async (request, reply) => {
    const corpo = envioSchema.safeParse(request.body);
    if (!corpo.success) {
      return reply.code(400).send(erro('dados_invalidos', 'Histórico em formato inválido.'));
    }
    const validos = corpo.data.itens.flatMap((i) => {
      const r = itemSchema.safeParse(i);
      return r.success ? [r.data] : [];
    });
    await historico.salvar(request.user.sub, validos);
    return reply.code(204).send();
  });
};
