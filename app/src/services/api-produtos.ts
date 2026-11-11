import type { ApiError, ProductResult } from '@nutriscan/shared';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? urlDaApiEmDesenvolvimento();

/**
 * Sem EXPO_PUBLIC_API_URL, usa o mesmo computador que serve o app (o Metro): o celular já
 * consegue falar com ele, e o IP muda sozinho quando o Mac troca de rede Wi-Fi.
 * Ex.: hostUri "192.168.0.10:8081" → "http://192.168.0.10:3333".
 */
function urlDaApiEmDesenvolvimento(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:3333`;
}
const TEMPO_LIMITE_MS = 15_000;

export type TipoErroProduto = ApiError['erro'] | 'sem_conexao' | 'inesperado';

export class ErroProduto extends Error {
  constructor(
    readonly tipo: TipoErroProduto,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroProduto';
  }
}

/** GET /produtos/:barcode — lança ErroProduto com o tipo do problema. */
export async function buscarProduto(barcode: string, signal?: AbortSignal): Promise<ProductResult> {
  // Um controlador próprio junta o cancelamento da tela com o tempo limite.
  const controle = new AbortController();
  const cancelar = () => controle.abort();
  signal?.addEventListener('abort', cancelar);
  const tempo = setTimeout(cancelar, TEMPO_LIMITE_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}/produtos/${encodeURIComponent(barcode)}`, {
      signal: controle.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // cancelado pela tela (ex.: usuário saiu): não é erro de rede
    throw new ErroProduto('sem_conexao', 'Não foi possível falar com o servidor.');
  } finally {
    clearTimeout(tempo);
    signal?.removeEventListener('abort', cancelar);
  }

  if (resposta.ok) return (await resposta.json()) as ProductResult;

  const corpo = (await resposta.json().catch(() => null)) as Partial<ApiError> | null;
  if (corpo?.erro) throw new ErroProduto(corpo.erro, corpo.mensagem ?? '');
  throw new ErroProduto('inesperado', `Resposta inesperada do servidor (${resposta.status}).`);
}
