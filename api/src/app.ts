import Fastify, { type FastifyServerOptions } from 'fastify';

import { registrarAutenticacao } from './http/autenticacao.js';
import {
  type AlternativasDeps,
  alternativasRoutes,
} from './modules/alternativas/alternativas.routes.js';
import { type ContasDeps, contasRoutes } from './modules/contas/contas.routes.js';
import { type HealthDeps, healthRoutes } from './modules/health/health.routes.js';
import { type HistoricoDeps, historicoRoutes } from './modules/historico/historico.routes.js';
import { type ProdutosDeps, produtosRoutes } from './modules/produtos/produtos.routes.js';
import { type RegistrosDeps, registrosRoutes } from './modules/registros/registros.routes.js';

/**
 * Dependências externas da API, injetadas para que os testes possam usar versões falsas.
 * Cada módulo declara as suas (ex.: HealthDeps) e elas são combinadas aqui com `&`.
 */
export type AppDeps = HealthDeps &
  ProdutosDeps &
  AlternativasDeps &
  ContasDeps &
  HistoricoDeps &
  RegistrosDeps & {
    /** Segredo que assina os tokens de login. */
    jwtSecret: string;
  };

/**
 * Monta a aplicação sem abrir porta.
 * O server.ts chama isso com as dependências reais; os testes, com dependências falsas.
 */
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  // Antes das rotas: `exigirConta` e `gerarToken` precisam existir quando elas são registradas.
  registrarAutenticacao(app, deps.jwtSecret, async (id) => (await deps.contas.buscar(id)) !== null);

  app.register(healthRoutes, deps);
  app.register(produtosRoutes, deps);
  app.register(alternativasRoutes, deps);
  app.register(contasRoutes, deps);
  app.register(historicoRoutes, deps);
  app.register(registrosRoutes, deps);

  return app;
}
