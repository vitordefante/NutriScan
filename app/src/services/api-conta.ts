import type { AuthResult, ExposureSummary, HistoryItem, LogEntry, User } from '@nutriscan/shared';

import { chamarApi } from './api';

/** POST /contas — cria a conta e já entra. Erros: email_em_uso, dados_invalidos. */
export function cadastrar(email: string, senha: string): Promise<AuthResult> {
  return chamarApi('/contas', { metodo: 'POST', corpo: { email, senha } });
}

/** POST /contas/entrar. Erro: credenciais_invalidas. */
export function entrar(email: string, senha: string): Promise<AuthResult> {
  return chamarApi('/contas/entrar', { metodo: 'POST', corpo: { email, senha } });
}

/** GET /contas/eu — confere se o token ainda vale (nao_autenticado se não). */
export function buscarEu(token: string): Promise<User> {
  return chamarApi('/contas/eu', { token });
}

/** DELETE /contas/eu — apaga a conta, o histórico e o log na API. */
export function excluirConta(token: string): Promise<void> {
  return chamarApi('/contas/eu', { metodo: 'DELETE', token });
}

/** POST /historico — envia os scans do aparelho e recebe o histórico da conta já juntado. */
export function sincronizarHistorico(token: string, itens: HistoryItem[]): Promise<HistoryItem[]> {
  return chamarApi('/historico', { metodo: 'POST', corpo: { itens }, token });
}

/** DELETE /historico. */
export function limparHistoricoDaConta(token: string): Promise<void> {
  return chamarApi('/historico', { metodo: 'DELETE', token });
}

/** POST /registros — registra o consumo/uso agora. */
export function registrar(token: string, barcode: string): Promise<LogEntry> {
  return chamarApi('/registros', { metodo: 'POST', corpo: { barcode }, token });
}

/** GET /registros — os registros dos últimos `dias` dias. */
export function listarRegistros(
  token: string,
  dias: number,
  signal?: AbortSignal,
): Promise<LogEntry[]> {
  return chamarApi(`/registros?dias=${dias}`, { token, signal });
}

/** GET /registros/resumo — o resumo dos últimos `dias` dias. */
export function buscarResumo(
  token: string,
  dias: number,
  signal?: AbortSignal,
): Promise<ExposureSummary> {
  return chamarApi(`/registros/resumo?dias=${dias}`, { token, signal });
}

/** DELETE /registros/:id. */
export function excluirRegistro(token: string, id: string): Promise<void> {
  return chamarApi(`/registros/${encodeURIComponent(id)}`, { metodo: 'DELETE', token });
}
