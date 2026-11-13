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
export function criarClienteObf(opcoes: Omit<Opcoes, 'baseUrl' | 'nome'> = {}): ClienteOff {
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
}: Opcoes = {}): ClienteOff {
  const indisponivel = (motivo: string, cause?: unknown) =>
    new FonteIndisponivelError(motivo, { cause, fonte: nome });

  return {
    async buscarProduto(barcode) {
      const url = `${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}?fields=${CAMPOS_OFF}`;

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

      // Em manutenção, o OFF responde 200 com uma página HTML em vez de JSON.
      let corpo: unknown;
      try {
        corpo = await resposta.json();
      } catch (err) {
        throw indisponivel('resposta não é JSON', err);
      }

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
  };
}

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
