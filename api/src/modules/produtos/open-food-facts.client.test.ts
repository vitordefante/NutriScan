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
    ['produto sem código de barras', json({ status: 1, product: { product_name: 'X' } })],
    ['falha de rede', new TypeError('fetch failed')],
  ])('lança FonteIndisponivelError: %s', async (_caso, resposta) => {
    const { fn } = fetchFalso(resposta);
    await expect(criarClienteOff({ fetch: fn }).buscarProduto('123')).rejects.toBeInstanceOf(
      FonteIndisponivelError,
    );
  });
});

describe('buscarPorCategoria', () => {
  it('busca produtos do Brasil na categoria, os mais escaneados primeiro', async () => {
    const { fn, chamadas } = fetchFalso(
      json({ count: 44, products: [{ code: '1', product_name: 'Maionese A' }] }),
    );

    const r = await criarClienteOff({ fetch: fn }).buscarPorCategoria('en:mayonnaises');

    expect(r).toEqual({ total: 44, produtos: [{ code: '1', product_name: 'Maionese A' }] });
    const url = new URL(chamadas[0]!.url);
    expect(url.pathname).toBe('/api/v2/search');
    expect(url.searchParams.get('categories_tags')).toBe('en:mayonnaises');
    expect(url.searchParams.get('countries_tags')).toBe('en:brazil');
    expect(url.searchParams.get('sort_by')).toBe('unique_scans_n');
    expect(url.searchParams.get('fields')).toMatch(/^code,/);
  });

  it('deixa de fora cadastros malformados ou vazios, sem derrubar a busca', async () => {
    const { fn } = fetchFalso(
      json({
        count: 3,
        products: [
          { product_name: 'Sem código' },
          { code: '2' },
          { code: '3', product_name: 'Ok' },
        ],
      }),
    );

    const r = await criarClienteOff({ fetch: fn }).buscarPorCategoria('en:mayonnaises');

    expect(r.produtos.map((p) => p.code)).toEqual(['3']);
  });

  it.each([
    ['limite de buscas', json({}, 429)],
    ['página HTML', new Response('<html>Too many requests</html>')],
    ['formato inesperado', json({ produtos: [] })],
  ])('lança FonteIndisponivelError: %s', async (_caso, resposta) => {
    const { fn } = fetchFalso(resposta);
    await expect(
      criarClienteOff({ fetch: fn }).buscarPorCategoria('en:mayonnaises'),
    ).rejects.toBeInstanceOf(FonteIndisponivelError);
  });
});
