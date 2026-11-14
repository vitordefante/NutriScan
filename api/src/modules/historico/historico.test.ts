import type { AuthResult, HistoryItem } from '@nutriscan/shared';
import { describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { depsDeTeste } from '../../test/deps.js';

const item = (barcode: string, escaneadoEm: string, nota: number | null = 28): HistoryItem => ({
  barcode,
  tipo: 'alimento',
  nome: `Produto ${barcode}`,
  nota,
  faixa: nota === null ? null : 'ruim',
  escaneadoEm,
});

async function comConta(email = 'ana@exemplo.com') {
  const app = buildApp(depsDeTeste());
  return { app, ...(await entrarComo(app, email)) };
}

async function entrarComo(app: ReturnType<typeof buildApp>, email: string) {
  const r = await app.inject({
    method: 'POST',
    url: '/contas',
    payload: { email, senha: 'senha-forte-123' },
  });
  const { token } = r.json<AuthResult>();
  return { auth: { authorization: `Bearer ${token}` } };
}

describe('histórico', () => {
  it('exige conta', async () => {
    const r = await buildApp(depsDeTeste()).inject({ method: 'GET', url: '/historico' });
    expect(r.statusCode).toBe(401);
  });

  it('sincroniza: guarda os scans e devolve a lista da conta, do mais recente ao mais antigo', async () => {
    const { app, auth } = await comConta();
    const r = await app.inject({
      method: 'POST',
      url: '/historico',
      headers: auth,
      payload: {
        itens: [
          item('7891150072046', '2026-11-14T10:00:00.000Z'),
          item('7891000379691', '2026-11-14T12:00:00.000Z', null),
        ],
      },
    });

    expect(r.statusCode).toBe(200);
    expect(r.json<HistoryItem[]>().map((i) => i.barcode)).toEqual([
      '7891000379691',
      '7891150072046',
    ]);
  });

  it('de cada produto vale o scan mais recente (um envio atrasado não apaga o novo)', async () => {
    const { app, auth } = await comConta();
    const enviar = (itens: HistoryItem[]) =>
      app.inject({ method: 'POST', url: '/historico', headers: auth, payload: { itens } });

    await enviar([item('7891150072046', '2026-11-14T12:00:00.000Z', 40)]);
    const r = await enviar([item('7891150072046', '2026-11-13T09:00:00.000Z', 10)]);

    expect(r.json<HistoryItem[]>()).toEqual([
      item('7891150072046', '2026-11-14T12:00:00.000Z', 40),
    ]);
  });

  it('cada conta só vê o próprio histórico', async () => {
    const { app, auth } = await comConta('ana@exemplo.com');
    const outra = await entrarComo(app, 'bia@exemplo.com');
    await app.inject({
      method: 'POST',
      url: '/historico',
      headers: auth,
      payload: { itens: [item('7891150072046', '2026-11-14T10:00:00.000Z')] },
    });

    const r = await app.inject({ method: 'GET', url: '/historico', headers: outra.auth });
    expect(r.json()).toEqual([]);
  });

  it.each([
    ['código inválido', { itens: [{ ...item('123', '2026-11-14T10:00:00Z') }] }],
    ['data inválida', { itens: [{ ...item('7891150072046', 'ontem') }] }],
    [
      'imagem sem https',
      {
        itens: [
          { ...item('7891150072046', '2026-11-14T10:00:00Z'), imagemUrl: 'http://x.com/a.jpg' },
        ],
      },
    ],
    ['sem itens', {}],
  ])('envio com %s: 400', async (_caso, payload) => {
    const { app, auth } = await comConta();
    const r = await app.inject({ method: 'POST', url: '/historico', headers: auth, payload });
    expect(r.statusCode).toBe(400);
  });

  it('limpar apaga o histórico da conta', async () => {
    const { app, auth } = await comConta();
    await app.inject({
      method: 'POST',
      url: '/historico',
      headers: auth,
      payload: { itens: [item('7891150072046', '2026-11-14T10:00:00.000Z')] },
    });

    const r = await app.inject({ method: 'DELETE', url: '/historico', headers: auth });
    expect(r.statusCode).toBe(204);
    const lista = await app.inject({ method: 'GET', url: '/historico', headers: auth });
    expect(lista.json()).toEqual([]);
  });
});
