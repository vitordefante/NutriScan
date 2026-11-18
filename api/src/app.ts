import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { registrarAutenticacao } from './http/autenticacao.js';
import { erro } from './http/respostas.js';
import {
  type AlternativasDeps,
  alternativasRoutes,
} from './modules/alternativas/alternativas.routes.js';
import { type ContasDeps, contasRoutes } from './modules/contas/contas.routes.js';
import { type HealthDeps, healthRoutes } from './modules/health/health.routes.js';
import { type HistoricoDeps, historicoRoutes } from './modules/historico/historico.routes.js';
import { type ProdutoresDeps, produtoresRoutes } from './modules/produtores/produtores.routes.js';
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
  RegistrosDeps &
  ProdutoresDeps & {
    /** Segredo que assina os tokens de login. */
    jwtSecret: string;
  };

/**
 * Monta a aplicação sem abrir porta.
 * O server.ts chama isso com as dependências reais; os testes, com dependências falsas.
 */
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  // Limite de pedidos só nas rotas que pedem (login e cadastro: cada um roda um argon2).
  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, contexto) => ({
      statusCode: 429,
      ...erro(
        'muitas_tentativas',
        `Muitas tentativas seguidas. Espere ${Math.ceil(contexto.ttl / 1000)} segundos e tente de novo.`,
      ),
    }),
  });

  // Antes das rotas: `exigirConta` e `gerarToken` precisam existir quando elas são registradas.
  registrarAutenticacao(app, deps.jwtSecret, async (id) => (await deps.contas.buscar(id)) !== null);

  app.register(healthRoutes, deps);
  app.register(produtosRoutes, deps);
  app.register(alternativasRoutes, deps);
  app.register(contasRoutes, deps);
  app.register(historicoRoutes, deps);
  app.register(registrosRoutes, deps);
  app.register(produtoresRoutes, deps);

  return app;
}
