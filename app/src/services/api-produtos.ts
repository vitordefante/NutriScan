import type { ApiError, ProductResult } from '@nutriscan/shared';
import Constants from 'expo-constants';

/**
 * Endereço da API.
 * - Build release (demo, APK): EXPO_PUBLIC_API_URL é OBRIGATÓRIA — não há Metro para descobrir
 *   o endereço, e "localhost" no celular é o próprio celular.
 * - Desenvolvimento: sem a variável, usa o próprio Metro, que repassa /api/* para a API local
 *   (ver app/metro.config.js); funciona pela rede local ou pelo túnel do Expo.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? urlDaApiEmDesenvolvimento() : null);
const TEMPO_LIMITE_MS = 15_000;

/**
 *   rede local: hostUri "192.168.0.10:8081" → "http://192.168.0.10:8081/api"
 *   túnel:      hostUri "abc.exp.direct:80" → "https://abc.exp.direct/api" (o iOS exige HTTPS fora da rede local)
 */
function urlDaApiEmDesenvolvimento(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return 'http://localhost:3333';
  const host = hostUri.split(':')[0]!;
  const local = host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  return local ? `http://${hostUri}/api` : `https://${host}/api`;
}

export type TipoErroProduto =
  ApiError['erro'] | 'sem_conexao' | 'tempo_esgotado' | 'servidor_fora' | 'inesperado';

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
  if (!API_URL) {
    throw new ErroProduto('inesperado', 'EXPO_PUBLIC_API_URL não foi definida neste build.');
  }

  // Um controlador próprio junta o cancelamento da tela com o tempo limite. Ele vale até o
  // corpo da resposta terminar de chegar (não só os cabeçalhos).
  const controle = new AbortController();
  let esgotou = false;
  const cancelar = () => controle.abort();
  signal?.addEventListener('abort', cancelar);
  const tempo = setTimeout(() => {
    esgotou = true;
    controle.abort();
  }, TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`${API_URL}/produtos/${encodeURIComponent(barcode)}`, {
      signal: controle.signal,
    });
    if (resposta.ok) return (await resposta.json()) as ProductResult;

    const corpo = (await resposta.json().catch(() => null)) as Partial<ApiError> | null;
    if (corpo?.erro) throw new ErroProduto(corpo.erro, corpo.mensagem ?? '');
    // Sem corpo no formato da API: quem respondeu foi o caminho até ela (ex.: o Metro com a
    // API local parada, ou um proxy na nuvem).
    if (resposta.status >= 500) {
      throw new ErroProduto('servidor_fora', `Servidor respondeu ${resposta.status}.`);
    }
    throw new ErroProduto('inesperado', `Resposta inesperada do servidor (${resposta.status}).`);
  } catch (err) {
    if (err instanceof ErroProduto) throw err;
    if (signal?.aborted) throw err; // cancelado pela tela (ex.: usuário saiu): não é erro
    if (esgotou) throw new ErroProduto('tempo_esgotado', 'O servidor demorou demais.');
    throw new ErroProduto('sem_conexao', 'Não foi possível falar com o servidor.');
  } finally {
    clearTimeout(tempo);
    signal?.removeEventListener('abort', cancelar);
  }
}
