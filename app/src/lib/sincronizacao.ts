import { ErroApi } from '@/services/api';
import * as apiConta from '@/services/api-conta';

import { aplicarSincronizacao, limparHistoricoLocal, pendentes } from './historico-local';
import { comConta, quandoSair, sessaoAtual } from './sessao';

/**
 * Sincronização do histórico do aparelho com o da conta (sem login, não faz nada). Falhas (sem
 * internet, API fora) são silenciosas: os scans continuam pendentes e vão na próxima vez.
 *
 * - `enviarPendentes`: só sobe o que falta (ao abrir um produto — barato).
 * - `sincronizarHistorico`: sobe o que falta e baixa o histórico da conta (ao abrir o app, ao
 *   entrar na conta e ao abrir a aba Histórico).
 *
 * Cada execução é de UMA conta: se a sessão mudar no meio (saiu, entrou com outra), o resultado
 * é descartado — o histórico de uma conta nunca volta para o aparelho depois do "Sair".
 */

type Execucao = { usuario: string; promessa: Promise<void> };
let emAndamento: Execucao | null = null;

function usuarioAtual(): string | null {
  const s = sessaoAtual();
  return s.status === 'conectado' ? s.usuario.id : null;
}

async function executar(usuario: string, baixar: boolean): Promise<void> {
  const enviados = await pendentes();
  if (enviados.length > 0) {
    await comConta((token) => apiConta.enviarHistorico(token, enviados));
  }
  const daConta = baixar ? await comConta((token) => apiConta.baixarHistorico(token)) : [];
  if (usuarioAtual() !== usuario) return; // a sessão mudou no meio: descarta
  await aplicarSincronizacao(enviados, daConta);
}

function rodar(baixar: boolean): Promise<void> {
  const usuario = usuarioAtual();
  if (!usuario) return Promise.resolve();
  // Uma de cada vez. Se a que está rodando é de outra conta (ou só envia e agora é preciso
  // baixar), esta roda depois dela.
  const anterior = emAndamento;
  if (anterior && anterior.usuario === usuario && !baixar) return anterior.promessa;
  const promessa = (anterior?.promessa ?? Promise.resolve())
    .then(() => executar(usuario, baixar))
    .catch((err: unknown) => {
      if (!(err instanceof ErroApi)) console.warn('Falha ao sincronizar o histórico', err);
    })
    .finally(() => {
      if (emAndamento?.promessa === promessa) emAndamento = null;
    });
  emAndamento = { usuario, promessa };
  return promessa;
}

export const enviarPendentes = () => rodar(false);
export const sincronizarHistorico = () => rodar(true);

// Ao sair da conta, o histórico dela não fica no aparelho (pode ser um celular compartilhado).
quandoSair(limparHistoricoLocal);
