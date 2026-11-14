import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { erro, paramsBarcode } from '../../http/respostas.js';
import { FonteIndisponivelError } from '../produtos/open-food-facts.client.js';
import type { ServicoRegistros } from './registros.service.js';

export type RegistrosDeps = {
  registros: ServicoRegistros;
};

/** Período em dias (padrão: 7; até 1 ano). */
const periodoSchema = z.object({ dias: z.coerce.number().int().min(1).max(365).default(7) });

export const registrosRoutes: FastifyPluginAsync<RegistrosDeps> = async (app, { registros }) => {
  app.addHook('preHandler', app.exigirConta);

  /** Registra um consumo (alimento) ou uso (cosmético) agora. */
  app.post('/registros', async (request, reply) => {
    const corpo = paramsBarcode.safeParse(request.body);
    if (!corpo.success) {
      return reply
        .code(400)
        .send(erro('codigo_invalido', 'O código de barras deve ter de 8 a 14 dígitos.'));
    }
    try {
      const registro = await registros.registrar(request.user.sub, corpo.data.barcode);
      if (!registro) {
        return reply
          .code(404)
          .send(erro('produto_nao_encontrado', 'Produto não encontrado para registrar.'));
      }
      return reply.code(201).send(registro);
    } catch (err) {
      if (err instanceof FonteIndisponivelError) {
        return reply
          .code(503)
          .send(erro('fonte_indisponivel', 'A base de produtos está fora do ar. Tente de novo.'));
      }
      throw err;
    }
  });

  app.get('/registros', async (request, reply) => {
    const periodo = periodoSchema.safeParse(request.query);
    if (!periodo.success) {
      return reply.code(400).send(erro('dados_invalidos', 'Período inválido (1 a 365 dias).'));
    }
    return registros.listar(request.user.sub, periodo.data.dias);
  });

  app.get('/registros/resumo', async (request, reply) => {
    const periodo = periodoSchema.safeParse(request.query);
    if (!periodo.success) {
      return reply.code(400).send(erro('dados_invalidos', 'Período inválido (1 a 365 dias).'));
    }
    return registros.resumo(request.user.sub, periodo.data.dias);
  });

  app.delete('/registros/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await registros.excluir(request.user.sub, id))) {
      return reply
        .code(404)
        .send(erro('registro_nao_encontrado', 'Esse registro não existe (ou já foi apagado).'));
    }
    return reply.code(204).send();
  });
};
