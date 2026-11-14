import { z } from 'zod';

import { CAMPOS_OFF, type ProdutoOff, produtoOffSchema } from './open-food-facts.mapper.js';

/** A fonte não respondeu de forma utilizável (fora do ar, limite de requisições, demora). */
export class FonteIndisponivelError extends Error {
  constructor(motivo: string, options?: ErrorOptions & { fonte?: string }) {
    super(`${options?.fonte ?? 'Open Food Facts'} indisponível: ${motivo}`, options);
    this.name = 'FonteIndisponivelError';
  }
}

export type ClienteOff = {
  /** Produto pelo código de barras; null se a fonte não o conhece. Lança FonteIndisponivelError. */
  buscarProduto: (barcode: string) => Promise<ProdutoOff | null>;
};

/** Resultado de uma busca por categoria: os mais escaneados primeiro. */
export type ResultadoBusca = {
  /** Quantos produtos a base tem na categoria (a página traz no máximo `TAMANHO_PAGINA`). */
  total: number;
  produtos: ProdutoOff[];
};

export type ClienteBusca = {
  /** Produtos vendidos no Brasil de uma categoria (tag "en:…"). Lança FonteIndisponivelError. */
  buscarPorCategoria: (categoria: string) => Promise<ResultadoBusca>;
};

export const TAMANHO_PAGINA = 100;

type Opcoes = {
  baseUrl?: string;
  /** Nome da base, para as mensagens de erro e os logs. */
  nome?: string;
  timeoutMs?: number;
  /** Injetável para os testes. */
  fetch?: typeof fetch;
};

/**
 * O Open Beauty Facts (cosméticos) é do mesmo projeto e tem a mesma API do Open Food Facts —
 * só muda o endereço.
 */
export function criarClienteObf(
  opcoes: Omit<Opcoes, 'baseUrl' | 'nome'> = {},
): ClienteOff & ClienteBusca {
  return criarClienteOff({
    ...opcoes,
    baseUrl: 'https://world.openbeautyfacts.org',
    nome: 'Open Beauty Facts',
  });
}

/**
 * O OFF pede que todo cliente se identifique pelo User-Agent (nome/versão e contato).
 * Sem isso, as requisições podem ser bloqueadas.
 */
const USER_AGENT = 'NutriScan/0.1 (TCC; https://github.com/vitordefante/NutriScan)';

export function criarClienteOff({
  baseUrl = 'https://world.openfoodfacts.org',
  nome = 'Open Food Facts',
  timeoutMs = 8_000,
  fetch: fetchFn = fetch,
}: Opcoes = {}): ClienteOff & ClienteBusca {
  const indisponivel = (motivo: string, cause?: unknown) =>
    new FonteIndisponivelError(motivo, { cause, fonte: nome });

  /** GET com o User-Agent e o tempo limite; null quando a fonte responde 404. */
  async function pedirJson(url: string): Promise<unknown> {
    let resposta: Response;
    try {
      resposta = await fetchFn(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw indisponivel('falha de rede ou tempo esgotado', err);
    }

    // O OFF responde 404 com um JSON "product not found" para códigos desconhecidos.
    if (resposta.status === 404) return null;
    if (resposta.status === 429) throw indisponivel('limite de requisições (429)');
    if (!resposta.ok) throw indisponivel(`HTTP ${resposta.status}`);

    // Em manutenção (ou no limite de buscas), o OFF responde 200 com uma página HTML.
    try {
      return await resposta.json();
    } catch (err) {
      throw indisponivel('resposta não é JSON', err);
    }
  }

  return {
    async buscarProduto(barcode) {
      const corpo = await pedirJson(
        `${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}?fields=${CAMPOS_OFF}`,
      );
      if (corpo === null) return null;

      const status = (corpo as { status?: unknown }).status;
      if (status === 0) return null;

      const produto = produtoOffSchema.safeParse((corpo as { product?: unknown }).product);
      if (!produto.success) {
        throw indisponivel('formato de produto inesperado', produto.error);
      }
      // O OFF tem cadastros vazios (só o código, criados por leituras de apps): para o usuário,
      // é o mesmo que não encontrado.
      return estaVazio(produto.data) ? null : produto.data;
    },

    async buscarPorCategoria(categoria) {
      // O limite de buscas do OFF é baixo (~10 por minuto): quem chama guarda o resultado em cache.
      const params = new URLSearchParams({
        categories_tags: categoria,
        countries_tags: 'en:brazil',
        fields: CAMPOS_OFF,
        page_size: String(TAMANHO_PAGINA),
        sort_by: 'unique_scans_n',
      });
      const corpo = await pedirJson(`${baseUrl}/api/v2/search?${params}`);
      const pagina = buscaSchema.safeParse(corpo);
      if (!pagina.success) throw indisponivel('formato de busca inesperado', pagina.error);

      // Um cadastro malformado não derruba a busca inteira: só fica de fora.
      const produtos = pagina.data.products.flatMap((p) => {
        const r = produtoOffSchema.safeParse(p);
        return r.success && !estaVazio(r.data) ? [r.data] : [];
      });
      return { total: pagina.data.count, produtos };
    },
  };
}

const buscaSchema = z.object({
  count: z.coerce.number().int().nonnegative(),
  products: z.array(z.unknown()),
});

function estaVazio(p: ProdutoOff): boolean {
  return (
    !p.product_name?.trim() &&
    !p.product_name_pt?.trim() &&
    !p.ingredients_text_pt?.trim() &&
    !p.ingredients_text?.trim() &&
    !p.ingredients_text_en?.trim() &&
    (p.categories_tags ?? []).length === 0 &&
    Object.keys(p.nutriments ?? {}).length === 0
  );
}
