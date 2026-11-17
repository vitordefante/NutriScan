import type { ScoreBand } from '@nutriscan/shared';

/**
 * UUID no formato que o Postgres aceita (8-4-4-4-12 hexadecimais). Um id fora dele nem vai ao
 * banco: o Postgres recusaria com erro (e a resposta viraria 500 em vez de 404).
 */
export const ehUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const FAIXAS: readonly ScoreBand[] = ['excelente', 'bom', 'regular', 'ruim', 'pessimo'];

/** Faixa guardada como texto no banco → ScoreBand (null se vazia ou desconhecida). */
export const paraFaixa = (texto: string | null): ScoreBand | null =>
  FAIXAS.find((f) => f === texto) ?? null;
