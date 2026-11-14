import * as apiConta from '@/services/api-conta';

import { aplicarSincronizacao, limparHistoricoLocal, pendentes } from './historico-local';
import { comConta, quandoSair, sessaoAtual } from './sessao';

/**
 * Sincroniza o histórico do aparelho com o da conta (sem login, não faz nada). Falhas (sem
 * internet, API fora) são silenciosas: os scans continuam marcados como pendentes e vão na
 * próxima vez. Chamadas ao mesmo tempo dividem uma sincronização só.
 */
let emAndamento: Promise<void> | null = null;

export function sincronizarHistorico(): Promise<void> {
  if (sessaoAtual().status !== 'conectado') return Promise.resolve();
  emAndamento ??= (async () => {
    const enviados = await pendentes();
    const daConta = await comConta((token) => apiConta.sincronizarHistorico(token, enviados));
    await aplicarSincronizacao(enviados, daConta);
  })()
    .catch(() => {})
    .finally(() => {
      emAndamento = null;
    });
  return emAndamento;
}

// Ao sair da conta, o histórico dela não fica no aparelho (pode ser um celular compartilhado).
quandoSair(limparHistoricoLocal);
