import type { AuthResult, HistoryItem, LogEntry, LogPeriod } from '@nutriscan/shared';

import { chamarApi } from './api';

/** POST /contas — cria a conta e já entra. Erros: email_em_uso, dados_invalidos. */
export function cadastrar(email: string, senha: string): Promise<AuthResult> {
  return chamarApi('/contas', { metodo: 'POST', corpo: { email, senha } });
}

/** POST /contas/entrar. Erro: credenciais_invalidas. */
export function entrar(email: string, senha: string): Promise<AuthResult> {
  return chamarApi('/contas/entrar', { metodo: 'POST', corpo: { email, senha } });
}

/** DELETE /contas/eu — apaga a conta, o histórico e o log na API. */
export function excluirConta(token: string): Promise<void> {
  return chamarApi('/contas/eu', { metodo: 'DELETE', token });
}

/** POST /historico — envia os scans feitos no aparelho (itens inválidos a API descarta). */
export function enviarHistorico(token: string, itens: HistoryItem[]): Promise<void> {
  return chamarApi('/historico', { metodo: 'POST', corpo: { itens }, token });
}

/** GET /historico — o histórico da conta (inclui o de outros aparelhos). */
export function baixarHistorico(token: string): Promise<HistoryItem[]> {
  return chamarApi('/historico', { token });
}

/** POST /registros — registra o consumo/uso agora (`quantidade` em g/ml; sem ela, uma porção). */
export function registrar(token: string, barcode: string, quantidade?: number): Promise<LogEntry> {
  return chamarApi('/registros', {
    metodo: 'POST',
    corpo: { barcode, ...(quantidade !== undefined && { quantidade }) },
    token,
  });
}

/** GET /registros — o resumo e os registros dos últimos `dias` dias. */
export function buscarPeriodo(
  token: string,
  dias: number,
  signal?: AbortSignal,
): Promise<LogPeriod> {
  return chamarApi(`/registros?dias=${dias}`, { token, signal });
}

/** DELETE /registros/:id. */
export function excluirRegistro(token: string, id: string): Promise<void> {
  return chamarApi(`/registros/${encodeURIComponent(id)}`, { metodo: 'DELETE', token });
}
