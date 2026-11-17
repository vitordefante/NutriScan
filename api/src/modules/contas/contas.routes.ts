import type { AuthResult } from '@nutriscan/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { erro } from '../../http/respostas.js';
import type { ServicoContas } from './contas.service.js';

export type ContasDeps = {
  contas: ServicoContas;
};

const credenciaisSchema = z.object({
  // O teclado do celular costuma deixar espaço no fim e maiúscula no começo.
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Mínimo de 8 (recomendação do NIST); máximo só para não aceitar textos gigantes.
  senha: z.string().min(8).max(200),
});

/**
 * Por endereço: 10 tentativas por minuto. Para uma pessoa digitando é folgado; para quem tenta
 * adivinhar senhas (ou sobrecarregar a API com argon2), não.
 */
const LIMITE = { rateLimit: { max: 10, timeWindow: '1 minute' } };

export const contasRoutes: FastifyPluginAsync<ContasDeps> = async (app, { contas }) => {
  /** Cria a conta e já devolve o token (o usuário entra direto). */
  app.post('/contas', { config: LIMITE }, async (request, reply) => {
    const corpo = credenciaisSchema.safeParse(request.body);
    if (!corpo.success) {
      return reply
        .code(400)
        .send(
          erro('dados_invalidos', 'Informe um e-mail válido e uma senha com 8 caracteres ou mais.'),
        );
    }
    const r = await contas.cadastrar(corpo.data.email, corpo.data.senha);
    if (r === 'email_em_uso') {
      return reply
        .code(409)
        .send(erro('email_em_uso', 'Já existe uma conta com esse e-mail. Tente entrar.'));
    }
    const resposta: AuthResult = { token: app.gerarToken(r.id), usuario: r };
    return reply.code(201).send(resposta);
  });

  app.post('/contas/entrar', { config: LIMITE }, async (request, reply) => {
    const corpo = credenciaisSchema.safeParse(request.body);
    const usuario = corpo.success ? await contas.entrar(corpo.data.email, corpo.data.senha) : null;
    if (!usuario) {
      return reply.code(401).send(erro('credenciais_invalidas', 'E-mail ou senha incorretos.'));
    }
    const resposta: AuthResult = { token: app.gerarToken(usuario.id), usuario };
    return resposta;
  });

  app.get('/contas/eu', { preHandler: app.exigirConta }, async (request) => {
    // exigirConta já garantiu que a conta existe.
    return (await contas.buscar(request.user.sub))!;
  });

  /** Exclui a conta com o histórico e o log (LGPD: o titular pode pedir a eliminação). */
  app.delete('/contas/eu', { preHandler: app.exigirConta }, async (request, reply) => {
    await contas.excluir(request.user.sub);
    return reply.code(204).send();
  });
};
