import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { erro } from './respostas.js';

/** O token de login guarda só o id do usuário (`sub`). */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler das rotas que exigem conta: responde 401 sem um token válido. */
    exigirConta: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Token de login para o usuário (vale 30 dias). */
    gerarToken: (usuarioId: string) => string;
  }
}

/** Por quanto tempo o login vale no aparelho. */
const VALIDADE_TOKEN = '30d';

/**
 * Registra o JWT e os decoradores `exigirConta` e `gerarToken` na raiz da aplicação (todos os
 * módulos de rotas enxergam). `usuarioExiste` barra tokens de contas já excluídas.
 */
export function registrarAutenticacao(
  app: FastifyInstance,
  segredo: string,
  usuarioExiste: (id: string) => Promise<boolean>,
) {
  app.register(fastifyJwt, { secret: segredo, sign: { expiresIn: VALIDADE_TOKEN } });

  app.decorate('gerarToken', (usuarioId: string) => app.jwt.sign({ sub: usuarioId }));

  app.decorate('exigirConta', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      if (await usuarioExiste(request.user.sub)) return;
    } catch {
      // token ausente, inválido ou vencido: cai na resposta abaixo
    }
    await reply.code(401).send(erro('nao_autenticado', 'Entre na sua conta para continuar.'));
  });
}
