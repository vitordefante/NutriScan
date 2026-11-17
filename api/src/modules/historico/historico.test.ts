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

  /** Envia os itens e devolve a lista da conta (como o app faz: POST e depois GET). */
  async function enviarELer(
    app: ReturnType<typeof buildApp>,
    auth: Record<string, string>,
    itens: unknown[],
  ) {
    const envio = await app.inject({
      method: 'POST',
      url: '/historico',
      headers: auth,
      payload: { itens },
    });
    const lista = await app.inject({ method: 'GET', url: '/historico', headers: auth });
    return { envio, lista: lista.json<HistoryItem[]>() };
  }

  it('guarda os scans (204) e a lista da conta vem do mais recente ao mais antigo', async () => {
    const { app, auth } = await comConta();
    const { envio, lista } = await enviarELer(app, auth, [
      item('7891150072046', '2026-11-14T10:00:00.000Z'),
      item('7891000379691', '2026-11-14T12:00:00.000Z', null),
    ]);

    expect(envio.statusCode).toBe(204);
    expect(lista.map((i) => i.barcode)).toEqual(['7891000379691', '7891150072046']);
  });

  it('de cada produto vale o scan mais recente (um envio atrasado não apaga o novo)', async () => {
    const { app, auth } = await comConta();
    await enviarELer(app, auth, [item('7891150072046', '2026-11-14T12:00:00.000Z', 40)]);
    const { lista } = await enviarELer(app, auth, [
      item('7891150072046', '2026-11-13T09:00:00.000Z', 10),
    ]);

    expect(lista).toEqual([item('7891150072046', '2026-11-14T12:00:00.000Z', 40)]);
  });

  it('cada conta só vê o próprio histórico', async () => {
    const { app, auth } = await comConta('ana@exemplo.com');
    const outra = await entrarComo(app, 'bia@exemplo.com');
    await enviarELer(app, auth, [item('7891150072046', '2026-11-14T10:00:00.000Z')]);

    const r = await app.inject({ method: 'GET', url: '/historico', headers: outra.auth });
    expect(r.json()).toEqual([]);
  });

  it('um item inválido fica de fora sozinho; os outros são guardados', async () => {
    const { app, auth } = await comConta();
    const { envio, lista } = await enviarELer(app, auth, [
      item('123', '2026-11-14T10:00:00Z'), // código inválido
      item('7891150072046', 'ontem'), // data inválida
      { ...item('7891000379691', '2026-11-14T10:00:00Z'), imagemUrl: 'http://x.com/a.jpg' },
      { ...item('7891095031115', '2026-11-14T10:00:00Z'), nome: 'x'.repeat(500) },
      item('7896004004679', '2026-11-14T11:00:00.000Z'), // o único válido
    ]);

    expect(envio.statusCode).toBe(204);
    expect(lista.map((i) => i.barcode)).toEqual(['7896004004679']);
  });

  it('envio sem a lista de itens: 400', async () => {
    const { app, auth } = await comConta();
    const r = await app.inject({ method: 'POST', url: '/historico', headers: auth, payload: {} });
    expect(r.statusCode).toBe(400);
  });
});
