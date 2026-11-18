import type { HistoryItem, LogEntry, Producer, ProducerRequest, User } from '@nutriscan/shared';

import type { AppDeps } from '../app.js';
import type { RepositorioContas } from '../modules/contas/contas.repository.js';
import { criarServicoContas } from '../modules/contas/contas.service.js';
import type { RepositorioHistorico } from '../modules/historico/historico.repository.js';
import type { RepositorioProdutores } from '../modules/produtores/produtores.repository.js';
import type { RepositorioRegistros } from '../modules/registros/registros.repository.js';
import { criarServicoRegistros } from '../modules/registros/registros.service.js';

/** Segredo de teste para os tokens (os testes nunca usam o do .env). */
export const SEGREDO_TESTE = 'segredo-de-teste-com-mais-de-32-caracteres';

/** Contas em memória. */
export function contasEmMemoria(): RepositorioContas {
  const porEmail = new Map<string, { usuario: User; senhaHash: string }>();
  let proximo = 1;
  return {
    async criar(email, senhaHash) {
      if (porEmail.has(email)) return null;
      // UUID válido no formato, para passar pelas mesmas regras do banco.
      const id = `00000000-0000-4000-8000-${String(proximo++).padStart(12, '0')}`;
      const usuario = { id, email };
      porEmail.set(email, { usuario, senhaHash });
      return usuario;
    },
    buscarPorEmail: async (email) => porEmail.get(email) ?? null,
    buscarPorId: async (id) =>
      [...porEmail.values()].find((c) => c.usuario.id === id)?.usuario ?? null,
    async excluir(id) {
      for (const [email, c] of porEmail) if (c.usuario.id === id) porEmail.delete(email);
    },
  };
}

/** Histórico em memória (mesma regra do banco: de cada produto, vale o scan mais recente). */
export function historicoEmMemoria(): RepositorioHistorico {
  const porUsuario = new Map<string, Map<string, HistoryItem>>();
  return {
    async listar(usuarioId, limite) {
      return [...(porUsuario.get(usuarioId)?.values() ?? [])]
        .sort((a, b) => Date.parse(b.escaneadoEm) - Date.parse(a.escaneadoEm))
        .slice(0, limite);
    },
    async salvar(usuarioId, itens) {
      const meus = porUsuario.get(usuarioId) ?? new Map<string, HistoryItem>();
      for (const i of itens) {
        const atual = meus.get(i.barcode);
        if (!atual || Date.parse(i.escaneadoEm) > Date.parse(atual.escaneadoEm)) {
          meus.set(i.barcode, i);
        }
      }
      porUsuario.set(usuarioId, meus);
    },
  };
}

/** Log em memória. */
export function registrosEmMemoria(): RepositorioRegistros {
  const todos: (LogEntry & { usuarioId: string })[] = [];
  let proximo = 1;
  return {
    async criar(usuarioId, r) {
      const registro = {
        id: `10000000-0000-4000-8000-${String(proximo++).padStart(12, '0')}`,
        ...r,
      };
      todos.push({ ...registro, usuarioId });
      return registro;
    },
    async listar(usuarioId, desde) {
      return todos
        .filter((r) => r.usuarioId === usuarioId && Date.parse(r.registradoEm) >= desde.getTime())
        .sort((a, b) => Date.parse(b.registradoEm) - Date.parse(a.registradoEm))
        .map(({ usuarioId: _, ...r }) => r);
    },
    async excluir(usuarioId, id) {
      const i = todos.findIndex((r) => r.id === id && r.usuarioId === usuarioId);
      if (i < 0) return false;
      todos.splice(i, 1);
      return true;
    },
  };
}

/** Produtores em memória; `pedidos` fica exposto para os testes conferirem o que foi gravado. */
export function produtoresEmMemoria(
  lista: Producer[] = [],
): RepositorioProdutores & { pedidos: ProducerRequest[] } {
  const pedidos: ProducerRequest[] = [];
  return {
    pedidos,
    listar: async () => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    buscar: async (id) => lista.find((p) => p.id === id) ?? null,
    async criarPedido(pedido) {
      pedidos.push(pedido);
      return `20000000-0000-4000-8000-${String(pedidos.length).padStart(12, '0')}`;
    },
  };
}

/**
 * Dependências completas para `buildApp` nos testes: tudo em memória, e cada teste troca só o
 * que interessa a ele.
 */
export function depsDeTeste(trocas: Partial<AppDeps> = {}): AppDeps {
  const produtos: AppDeps['produtos'] = trocas.produtos ?? {
    consultar: async () => null,
    enviarRotulo: async () => ({ ok: false, ilegiveis: [] }),
  };
  return {
    pingDb: async () => {},
    produtos,
    alternativas: { consultar: async () => null },
    contas: criarServicoContas(contasEmMemoria()),
    historico: historicoEmMemoria(),
    registros: criarServicoRegistros({ produtos, registros: registrosEmMemoria() }),
    produtores: produtoresEmMemoria(),
    jwtSecret: SEGREDO_TESTE,
    ...trocas,
  };
}
