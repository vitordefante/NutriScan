import type { ApiError } from '@nutriscan/shared';
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

export type TipoErroApi =
  ApiError['erro'] | 'sem_conexao' | 'tempo_esgotado' | 'servidor_fora' | 'inesperado';

/** Erro de uma chamada à API, com o tipo do problema (para a tela escolher a mensagem). */
export class ErroApi extends Error {
  constructor(
    readonly tipo: TipoErroApi,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'DELETE';
  /** Enviado como JSON. */
  corpo?: unknown;
  /** Token de login, para as rotas que exigem conta. */
  token?: string;
  signal?: AbortSignal;
  tempoLimiteMs?: number;
};

/**
 * Chama a API e devolve o JSON da resposta (undefined numa resposta 204, sem corpo).
 * Lança ErroApi com o tipo do problema; um cancelamento pela tela (signal) é repassado como está.
 */
export async function chamarApi<T>(
  caminho: string,
  { metodo = 'GET', corpo, token, signal, tempoLimiteMs = TEMPO_LIMITE_MS }: Opcoes = {},
): Promise<T> {
  if (!API_URL) {
    throw new ErroApi('inesperado', 'EXPO_PUBLIC_API_URL não foi definida neste build.');
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
  }, tempoLimiteMs);

  try {
    const resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(corpo !== undefined && { body: JSON.stringify(corpo) }),
      signal: controle.signal,
    });
    if (resposta.status === 204) return undefined as T;
    if (resposta.ok) return (await resposta.json()) as T;

    const doServidor = (await resposta.json().catch(() => null)) as Partial<ApiError> | null;
    if (doServidor?.erro) throw new ErroApi(doServidor.erro, doServidor.mensagem ?? '');
    // Sem corpo no formato da API: quem respondeu foi o caminho até ela (ex.: o Metro com a
    // API local parada, ou um proxy na nuvem).
    if (resposta.status >= 500) {
      throw new ErroApi('servidor_fora', `Servidor respondeu ${resposta.status}.`);
    }
    throw new ErroApi('inesperado', `Resposta inesperada do servidor (${resposta.status}).`);
  } catch (err) {
    if (err instanceof ErroApi) throw err;
    if (signal?.aborted) throw err; // cancelado pela tela (ex.: usuário saiu): não é erro
    if (esgotou) throw new ErroApi('tempo_esgotado', 'O servidor demorou demais.');
    throw new ErroApi('sem_conexao', 'Não foi possível falar com o servidor.');
  } finally {
    clearTimeout(tempo);
    signal?.removeEventListener('abort', cancelar);
  }
}
