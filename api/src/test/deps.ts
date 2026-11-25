import type { HistoryItem, LogEntry, Producer, ProducerRequest, User } from '@nutriscan/shared';

import type { AppDeps } from '../app.js';
import type {
  ProdutorDaConta,
  RepositorioContaProdutor,
} from '../modules/conta-produtor/conta-produtor.repository.js';
import { criarServicoContaProdutor } from '../modules/conta-produtor/conta-produtor.service.js';
import type { FotoGuardada, LinhaItem, LinhaProposta } from '../modules/produtores/catalogo.js';
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
  fotos: ReadonlyMap<string, Buffer> = new Map(),
): RepositorioProdutores & { pedidos: ProducerRequest[] } {
  const pedidos: ProducerRequest[] = [];
  return {
    pedidos,
    foto: async (id) => fotos.get(id) ?? null,
    listar: async () => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    buscar: async (id) => lista.find((p) => p.id === id) ?? null,
    async criarPedido(pedido) {
      pedidos.push(pedido);
      return `20000000-0000-4000-8000-${String(pedidos.length).padStart(12, '0')}`;
    },
  };
}

/** Estado da conta de produtor em memória (os testes montam e conferem por aqui). */
export type EstadoContaProdutor = {
  produtores: ProdutorDaConta[];
  /** usuarioId → produtorId */
  contas: Map<string, string>;
  /** hash do código → convite */
  convites: Map<string, { produtorId: string; expiraEm: Date }>;
  itens: LinhaItem[];
  propostas: LinhaProposta[];
  fotos: Map<string, FotoGuardada & { bytes: Buffer; publica: boolean; enviadaPor: string | null }>;
};

/** Conta de produtor em memória, com as mesmas regras do repositório do Postgres. */
export function contaProdutorEmMemoria(
  e: EstadoContaProdutor = {
    produtores: [],
    contas: new Map(),
    convites: new Map(),
    itens: [],
    propostas: [],
    fotos: new Map(),
  },
): RepositorioContaProdutor & { estado: EstadoContaProdutor } {
  let proximo = 1;
  const novoId = () => `30000000-0000-4000-8000-${String(proximo++).padStart(12, '0')}`;
  const produtorDaConta = async (usuarioId: string) => {
    const id = e.contas.get(usuarioId);
    return e.produtores.find((p) => p.id === id) ?? null;
  };
  return {
    estado: e,
    produtorDaConta,
    async vincular(usuarioId, codigoHash, agora) {
      const convite = e.convites.get(codigoHash);
      if (!convite || convite.expiraEm <= agora) return 'convite_invalido';
      const daConta = e.contas.get(usuarioId);
      if (daConta) {
        return daConta === convite.produtorId ? 'produtor_ja_vinculado' : 'conta_ja_vinculada';
      }
      if ([...e.contas.values()].includes(convite.produtorId)) return 'produtor_ja_vinculado';
      e.convites.delete(codigoHash);
      e.contas.set(usuarioId, convite.produtorId);
      return (await produtorDaConta(usuarioId))!;
    },
    itens: async (produtorId) =>
      e.itens.filter((i) => i.produtorId === produtorId).sort((a, b) => a.ordem - b.ordem),
    propostas: async (produtorId) => e.propostas.filter((p) => p.produtorId === produtorId),
    async salvarFoto(produtorId, { id, bytes, largura, altura }) {
      if (!e.fotos.has(id)) {
        e.fotos.set(id, { id, bytes, largura, altura, publica: false, enviadaPor: produtorId });
      }
    },
    async foto(produtorId, id) {
      const f = e.fotos.get(id);
      if (!f || !(f.publica || f.enviadaPor === produtorId)) return null;
      const { enviadaPor, ...resto } = f;
      return { ...resto, propria: enviadaPor === produtorId };
    },
    async propor(proposta, substitui) {
      if (substitui) {
        const antes = e.propostas.length;
        e.propostas = e.propostas.filter(
          (p) => !(p.id === substitui && p.produtorId === proposta.produtorId && !p.itemId),
        );
        if (e.propostas.length === antes) return null;
      }
      if (proposta.itemId) e.propostas = e.propostas.filter((p) => p.itemId !== proposta.itemId);
      const id = novoId();
      e.propostas.push({ ...proposta, id, situacao: 'em_analise', motivo: null });
      return id;
    },
    async mudarPreco(produtorId, itemId, preco, agora) {
      const item = e.itens.find((i) => i.id === itemId && i.produtorId === produtorId);
      if (!item) return false;
      item.precoCentavos = preco?.centavos ?? null;
      item.unidade = preco?.unidade ?? null;
      item.precoAtualizadoEm = preco ? agora : null;
      return true;
    },
    async removerItem(produtorId, itemId) {
      const antes = e.itens.length;
      e.itens = e.itens.filter((i) => !(i.id === itemId && i.produtorId === produtorId));
      if (e.itens.length === antes) return false;
      e.propostas = e.propostas.filter((p) => p.itemId !== itemId);
      return true;
    },
    async removerProposta(produtorId, id) {
      const antes = e.propostas.length;
      e.propostas = e.propostas.filter((p) => !(p.id === id && p.produtorId === produtorId));
      return e.propostas.length < antes;
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
    contaProdutor: criarServicoContaProdutor(contaProdutorEmMemoria()),
    jwtSecret: SEGREDO_TESTE,
    ...trocas,
  };
}
