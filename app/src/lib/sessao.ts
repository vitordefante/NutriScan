import type { AuthResult, User } from '@nutriscan/shared';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { ErroApi } from '@/services/api';
import * as apiConta from '@/services/api-conta';

/**
 * Sessão de login. O token fica no Keychain do iPhone (expo-secure-store), não em texto puro;
 * a tela lê a sessão por `useSessao` (store externo — compatível com o React Compiler).
 */
export type Sessao =
  | { status: 'carregando' }
  | { status: 'anonimo' }
  | { status: 'conectado'; usuario: User; token: string };

const CHAVE = 'nutriscan.sessao';

let atual: Sessao = { status: 'carregando' };
const ouvintes = new Set<() => void>();
/** Chamados ao sair da conta (ex.: apagar o histórico do aparelho). */
const aoSair = new Set<() => Promise<void>>();

function definir(sessao: Sessao) {
  atual = sessao;
  for (const avisar of ouvintes) avisar();
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

export function useSessao(): Sessao {
  return useSyncExternalStore(assinar, () => atual);
}

export function sessaoAtual(): Sessao {
  return atual;
}

/** Na abertura do app: recupera o login guardado (se houver). */
export async function carregarSessao(): Promise<void> {
  try {
    const guardado = await SecureStore.getItemAsync(CHAVE);
    const r = guardado ? (JSON.parse(guardado) as Partial<AuthResult>) : null;
    if (r?.token && r.usuario?.id && r.usuario.email) {
      definir({ status: 'conectado', token: r.token, usuario: r.usuario });
      return;
    }
  } catch {
    // Keychain indisponível ou conteúdo corrompido: segue sem login.
  }
  definir({ status: 'anonimo' });
}

async function guardar(r: AuthResult) {
  await SecureStore.setItemAsync(CHAVE, JSON.stringify(r));
  definir({ status: 'conectado', token: r.token, usuario: r.usuario });
}

export async function entrarNaConta(email: string, senha: string): Promise<void> {
  await guardar(await apiConta.entrar(email, senha));
}

export async function criarConta(email: string, senha: string): Promise<void> {
  await guardar(await apiConta.cadastrar(email, senha));
}

/**
 * "Sair" tocado pelo usuário: encerra a sessão e apaga do aparelho os dados ligados à conta
 * (o histórico — pode ser um celular compartilhado).
 */
export async function sair(): Promise<void> {
  await esquecerLogin();
  for (const limpar of aoSair) await limpar().catch(() => {});
}

/**
 * O token deixou de valer (venceu, ou a conta foi excluída em outro aparelho): volta a ser
 * anônimo SEM apagar nada — scans ainda não enviados continuam no aparelho e sobem no próximo
 * login.
 */
async function esquecerLogin(): Promise<void> {
  await SecureStore.deleteItemAsync(CHAVE).catch(() => {});
  definir({ status: 'anonimo' });
}

/** Apaga a conta na API (com histórico e log) e sai. */
export async function excluirMinhaConta(): Promise<void> {
  await comConta((token) => apiConta.excluirConta(token));
  await sair();
}

/** Registra algo para fazer ao sair (ex.: apagar dados do aparelho ligados à conta). */
export function quandoSair(limpar: () => Promise<void>): void {
  aoSair.add(limpar);
}

/**
 * Chama a API com o token da sessão. Sem login, ou com o token vencido/recusado, lança
 * ErroApi('nao_autenticado') — e, no segundo caso, esquece o login guardado (sem apagar dados).
 */
export async function comConta<T>(chamar: (token: string) => Promise<T>): Promise<T> {
  if (atual.status !== 'conectado') {
    throw new ErroApi('nao_autenticado', 'Entre na sua conta para continuar.');
  }
  try {
    return await chamar(atual.token);
  } catch (err) {
    if (err instanceof ErroApi && err.tipo === 'nao_autenticado') await esquecerLogin();
    throw err;
  }
}
