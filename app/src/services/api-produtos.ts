import type { AlternativesResult, LabelSubmission, ProductResult } from '@nutriscan/shared';

import { chamarApi } from './api';

/**
 * Alternativas: com a categoria fora do cache, a API faz até três buscas no Open Food Facts
 * (que podem levar ~8 s cada). A tela não fica presa: a seção carrega à parte.
 */
const TEMPO_LIMITE_ALTERNATIVAS_MS = 30_000;

/** GET /produtos/:barcode — lança ErroApi com o tipo do problema. */
export function buscarProduto(barcode: string, signal?: AbortSignal): Promise<ProductResult> {
  return chamarApi(`/produtos/${encodeURIComponent(barcode)}`, { signal });
}

/** GET /produtos/:barcode/alternativas — produtos da mesma categoria com nota maior. */
export function buscarAlternativas(
  barcode: string,
  signal?: AbortSignal,
): Promise<AlternativesResult> {
  return chamarApi(`/produtos/${encodeURIComponent(barcode)}/alternativas`, {
    signal,
    tempoLimiteMs: TEMPO_LIMITE_ALTERNATIVAS_MS,
  });
}

/**
 * POST /produtos/:barcode/rotulo — envia o texto lido nas fotos do rótulo (as fotos não saem do
 * aparelho) e recebe a nova análise. Erro "rotulo_ilegivel": a mensagem diz qual foto refazer.
 */
export function enviarRotulo(barcode: string, envio: LabelSubmission): Promise<ProductResult> {
  return chamarApi(`/produtos/${encodeURIComponent(barcode)}/rotulo`, {
    metodo: 'POST',
    corpo: envio,
  });
}
