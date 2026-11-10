import type { HealthStatus } from '@nutriscan/shared';
import type { FastifyPluginAsync } from 'fastify';

export type HealthDeps = {
  pingDb: () => Promise<void>;
};

export const healthRoutes: FastifyPluginAsync<HealthDeps> = async (app, { pingDb }) => {
  app.get('/health', async (request, reply) => {
    try {
      await pingDb();
      const body: HealthStatus = { status: 'ok', db: 'ok' };
      return body;
    } catch (err) {
      // request.log inclui o reqId, ligando este erro à requisição que falhou.
      request.log.error({ err }, 'Falha ao acessar o banco de dados');
      const body: HealthStatus = { status: 'degradado', db: 'erro' };
      return reply.code(503).send(body);
    }
  });
};
