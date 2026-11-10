import Fastify, { type FastifyServerOptions } from 'fastify';

import { type HealthDeps, healthRoutes } from './modules/health/health.routes.js';

/**
 * Dependências externas da API, injetadas para que os testes possam usar versões falsas.
 * Cada módulo declara as suas (ex.: HealthDeps) e elas são combinadas aqui com `&`.
 */
export type AppDeps = HealthDeps;

/**
 * Monta a aplicação sem abrir porta.
 * O server.ts chama isso com as dependências reais; os testes, com dependências falsas.
 */
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.register(healthRoutes, deps);

  return app;
}
