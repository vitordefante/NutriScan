import Fastify, { type FastifyServerOptions } from 'fastify';

import { healthRoutes } from './modules/health/health.routes.js';

/** Dependências externas da API. Injetadas para que os testes possam usar versões falsas. */
export type AppDeps = {
  pingDb: () => Promise<void>;
};

/**
 * Monta a aplicação sem abrir porta.
 * O server.ts chama isso com as dependências reais; os testes, com dependências falsas.
 */
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.register(healthRoutes, { pingDb: deps.pingDb });

  return app;
}
