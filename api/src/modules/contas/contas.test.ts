import type { AuthResult } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { depsDeTeste } from '../../test/deps.js';

const CREDENCIAIS = { email: 'Ana@Exemplo.com ', senha: 'senha-forte-123' };

async function cadastrar(app: ReturnType<typeof buildApp>, corpo: object = CREDENCIAIS) {
  return app.inject({ method: 'POST', url: '/contas', payload: corpo });
}

describe('contas', () => {
  it('cadastro: 201 com token, e-mail guardado em minúsculas', async () => {
    const app = buildApp(depsDeTeste());
    const r = await cadastrar(app);

    expect(r.statusCode).toBe(201);
    const corpo = r.json<AuthResult>();
    expect(corpo.usuario.email).toBe('ana@exemplo.com');
    expect(corpo.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('cadastro com e-mail já usado (em outra grafia): 409', async () => {
    const app = buildApp(depsDeTeste());
    await cadastrar(app);
    const r = await cadastrar(app, { email: 'ana@exemplo.com', senha: 'outra-senha-123' });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ erro: 'email_em_uso' });
  });

  it.each([
    ['e-mail inválido', { email: 'ana', senha: 'senha-forte-123' }],
    ['senha curta', { email: 'ana@exemplo.com', senha: '1234567' }],
    ['sem corpo', undefined],
  ])('cadastro com %s: 400', async (_caso, corpo) => {
    const r = await buildApp(depsDeTeste()).inject({
      method: 'POST',
      url: '/contas',
      payload: corpo,
    });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ erro: 'dados_invalidos' });
  });

  it('entrar com a senha certa devolve token; a errada (ou e-mail sem conta), 401 igual', async () => {
    const app = buildApp(depsDeTeste());
    await cadastrar(app);
    const entrar = (email: string, senha: string) =>
      app.inject({ method: 'POST', url: '/contas/entrar', payload: { email, senha } });

    const certo = await entrar('ANA@exemplo.com', 'senha-forte-123');
    expect(certo.statusCode).toBe(200);
    expect(certo.json<AuthResult>().usuario.email).toBe('ana@exemplo.com');

    const senhaErrada = await entrar('ana@exemplo.com', 'senha-errada-123');
    const semConta = await entrar('bia@exemplo.com', 'senha-forte-123');
    expect(senhaErrada.statusCode).toBe(401);
    expect(semConta.json()).toEqual(senhaErrada.json()); // não revela qual dos dois errou
  });

  it('GET /contas/eu exige token válido', async () => {
    const app = buildApp(depsDeTeste());
    const { token, usuario } = (await cadastrar(app)).json<AuthResult>();

    const semToken = await app.inject({ method: 'GET', url: '/contas/eu' });
    const tokenFalso = await app.inject({
      method: 'GET',
      url: '/contas/eu',
      headers: { authorization: 'Bearer abc.def.ghi' },
    });
    const comToken = await app.inject({
      method: 'GET',
      url: '/contas/eu',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(semToken.statusCode).toBe(401);
    expect(semToken.json()).toMatchObject({ erro: 'nao_autenticado' });
    expect(tokenFalso.statusCode).toBe(401);
    expect(comToken.json()).toEqual(usuario);
  });

  it('token de outra instalação (outro segredo) não vale', async () => {
    const { token } = (await cadastrar(buildApp(depsDeTeste()))).json<AuthResult>();
    const outra = buildApp(depsDeTeste({ jwtSecret: 'outro-segredo-com-mais-de-32-caracteres!' }));
    const r = await outra.inject({
      method: 'GET',
      url: '/contas/eu',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(401);
  });

  it('excluir a conta: 204, e o token dela deixa de valer', async () => {
    const app = buildApp(depsDeTeste());
    const { token } = (await cadastrar(app)).json<AuthResult>();
    const auth = { authorization: `Bearer ${token}` };

    const r = await app.inject({ method: 'DELETE', url: '/contas/eu', headers: auth });
    expect(r.statusCode).toBe(204);
    const depois = await app.inject({ method: 'GET', url: '/contas/eu', headers: auth });
    expect(depois.statusCode).toBe(401);
  });
});
