import { describe, expect, it } from 'vitest';

import { criarClienteOff, FonteIndisponivelError } from './open-food-facts.client.js';

/** fetch falso que devolve sempre a mesma resposta e guarda a última requisição. */
function fetchFalso(resposta: Response | Error) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    chamadas.push({ url, ...(init && { init }) });
    if (resposta instanceof Error) throw resposta;
    return resposta;
  }) as typeof fetch;
  return { fn, chamadas };
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

describe('criarClienteOff', () => {
  it('busca o produto pelo código, pedindo só os campos usados e com User-Agent', async () => {
    const { fn, chamadas } = fetchFalso(
      json({ status: 1, product: { code: '7894900010398', product_name: 'Refrigerante' } }),
    );

    const produto = await criarClienteOff({ fetch: fn }).buscarProduto('7894900010398');

    expect(produto).toMatchObject({ code: '7894900010398', product_name: 'Refrigerante' });
    expect(chamadas[0]?.url).toMatch(/\/api\/v2\/product\/7894900010398\?fields=code,/);
    expect(new Headers(chamadas[0]?.init?.headers).get('User-Agent')).toMatch(/^NutriScan\//);
  });

  it.each([
    ['status 0 no corpo', json({ status: 0, status_verbose: 'product not found' })],
    ['HTTP 404', json({ status: 0 }, 404)],
    ['cadastro vazio, só com o código', json({ status: 1, product: { code: '7890000000000' } })],
  ])('retorna null quando o produto não existe (%s)', async (_caso, resposta) => {
    const { fn } = fetchFalso(resposta);
    expect(await criarClienteOff({ fetch: fn }).buscarProduto('123')).toBeNull();
  });

  it.each([
    ['limite de requisições', json({}, 429)],
    ['erro do servidor', json({}, 503)],
    ['página HTML de manutenção', new Response('<html>Page temporarily unavailable</html>')],
    ['produto em formato inesperado', json({ status: 1, product: { code: 123 } })],
    ['falha de rede', new TypeError('fetch failed')],
  ])('lança FonteIndisponivelError: %s', async (_caso, resposta) => {
    const { fn } = fetchFalso(resposta);
    await expect(criarClienteOff({ fetch: fn }).buscarProduto('123')).rejects.toBeInstanceOf(
      FonteIndisponivelError,
    );
  });
});
