import { and, asc, eq, max, or } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { ehUuid } from '../../db/conversoes.js';
import {
  contasProdutor,
  convitesProdutor,
  fotosProdutor,
  itensCatalogo,
  produtores,
  propostasItem,
  usuarios,
} from '../../db/schema.js';
import type { FotoGuardada, LinhaItem, LinhaProposta } from '../produtores/catalogo.js';
import type { FotoPreparada } from '../produtores/fotos.js';

export type ProdutorDaConta = { id: string; nome: string };

export type ResultadoVinculo =
  ProdutorDaConta | 'convite_invalido' | 'produtor_ja_vinculado' | 'conta_ja_vinculada';

/** Dados de uma proposta nova (a situação começa "em análise"). */
export type NovaProposta = Omit<LinhaProposta, 'id' | 'situacao' | 'motivo'>;

/** O que as rotas (o produtor, pelo app) usam. Tudo filtrado pelo produtor da conta. */
export type RepositorioContaProdutor = {
  produtorDaConta: (usuarioId: string) => Promise<ProdutorDaConta | null>;
  /** Usa o convite (se válido) e liga a conta ao produtor, numa transação. */
  vincular: (usuarioId: string, codigoHash: string, agora: Date) => Promise<ResultadoVinculo>;
  itens: (produtorId: string) => Promise<LinhaItem[]>;
  propostas: (produtorId: string) => Promise<LinhaProposta[]>;
  /** Grava uma foto enviada pelo app, ainda não pública. */
  salvarFoto: (produtorId: string, foto: FotoPreparada, agora: Date) => Promise<void>;
  /** Uma foto pública ou enviada por este produtor (as de outro, não publicadas, não). */
  foto: (
    produtorId: string,
    id: string,
  ) => Promise<(FotoGuardada & { bytes: Buffer; publica: boolean }) | null>;
  /** Grava a proposta; a mudança de um item substitui a anterior desse item. Devolve o id. */
  propor: (proposta: NovaProposta) => Promise<string>;
  /** false se o item não existe ou é de outro produtor. */
  mudarPreco: (
    produtorId: string,
    itemId: string,
    preco: { centavos: number; unidade: string } | null,
    agora: Date,
  ) => Promise<boolean>;
  removerItem: (produtorId: string, itemId: string) => Promise<boolean>;
  removerProposta: (produtorId: string, id: string) => Promise<boolean>;
};

export type PropostaParaRevisar = LinhaProposta & {
  produtorNome: string;
  /** O item como está publicado (só nas mudanças). */
  item: LinhaItem | null;
};

/** O que os scripts do autor usam (convites, contas e aprovação dos itens). */
export type AdminContaProdutor = {
  /** Troca o convite do produtor por um novo; false se o produtor não existe. */
  criarConvite: (produtorId: string, codigoHash: string, expiraEm: Date) => Promise<boolean>;
  contas: () => Promise<{ produtorId: string; nome: string; email: string; desde: Date }[]>;
  desvincular: (produtorId: string) => Promise<boolean>;
  propostasEmAnalise: () => Promise<PropostaParaRevisar[]>;
  fotoBytes: (id: string) => Promise<Buffer | null>;
  aprovar: (id: string, agora: Date) => Promise<boolean>;
  recusar: (id: string, motivo: string) => Promise<boolean>;
};

const comoItem = (l: typeof itensCatalogo.$inferSelect): LinhaItem => l;
const comoProposta = (l: typeof propostasItem.$inferSelect): LinhaProposta => ({
  ...l,
  situacao: l.situacao === 'recusada' ? 'recusada' : 'em_analise',
});

export function criarRepositorioContaProdutorPg(
  db: Database['db'],
): RepositorioContaProdutor & AdminContaProdutor {
  return {
    async produtorDaConta(usuarioId) {
      if (!ehUuid(usuarioId)) return null;
      const [linha] = await db
        .select({ id: produtores.id, dados: produtores.dados })
        .from(contasProdutor)
        .innerJoin(produtores, eq(produtores.id, contasProdutor.produtorId))
        .where(eq(contasProdutor.usuarioId, usuarioId));
      return linha ? { id: linha.id, nome: (linha.dados as { nome: string }).nome } : null;
    },

    async vincular(usuarioId, codigoHash, agora) {
      return db.transaction(async (tx): Promise<ResultadoVinculo> => {
        const [convite] = await tx
          .select()
          .from(convitesProdutor)
          .where(eq(convitesProdutor.codigoHash, codigoHash))
          .for('update');
        if (!convite || convite.expiraEm <= agora) return 'convite_invalido';

        const [daConta] = await tx
          .select()
          .from(contasProdutor)
          .where(eq(contasProdutor.usuarioId, usuarioId));
        if (daConta) {
          return daConta.produtorId === convite.produtorId
            ? 'produtor_ja_vinculado'
            : 'conta_ja_vinculada';
        }
        const [doProdutor] = await tx
          .select()
          .from(contasProdutor)
          .where(eq(contasProdutor.produtorId, convite.produtorId));
        if (doProdutor) return 'produtor_ja_vinculado';

        await tx.delete(convitesProdutor).where(eq(convitesProdutor.codigoHash, codigoHash));
        await tx
          .insert(contasProdutor)
          .values({ usuarioId, produtorId: convite.produtorId, criadoEm: agora });
        const [p] = await tx
          .select({ dados: produtores.dados })
          .from(produtores)
          .where(eq(produtores.id, convite.produtorId));
        return { id: convite.produtorId, nome: (p!.dados as { nome: string }).nome };
      });
    },

    async itens(produtorId) {
      const linhas = await db
        .select()
        .from(itensCatalogo)
        .where(eq(itensCatalogo.produtorId, produtorId))
        .orderBy(asc(itensCatalogo.ordem), asc(itensCatalogo.criadoEm));
      return linhas.map(comoItem);
    },

    async propostas(produtorId) {
      const linhas = await db
        .select()
        .from(propostasItem)
        .where(eq(propostasItem.produtorId, produtorId))
        .orderBy(asc(propostasItem.enviadaEm));
      return linhas.map(comoProposta);
    },

    async salvarFoto(produtorId, { id, bytes, largura, altura }, agora) {
      // Mesmo conteúdo = mesmo id: se a foto já existe (pública ou não), fica como está.
      await db
        .insert(fotosProdutor)
        .values({
          id,
          bytes,
          publica: false,
          enviadaPor: produtorId,
          largura,
          altura,
          criadoEm: agora,
        })
        .onConflictDoNothing({ target: fotosProdutor.id });
    },

    async foto(produtorId, id) {
      const [f] = await db
        .select()
        .from(fotosProdutor)
        .where(
          and(
            eq(fotosProdutor.id, id),
            or(eq(fotosProdutor.publica, true), eq(fotosProdutor.enviadaPor, produtorId)),
          ),
        );
      if (!f) return null;
      // As importadas não guardam o tamanho aqui (fica no `Producer`); 0 = desconhecido.
      return {
        id: f.id,
        bytes: f.bytes,
        publica: f.publica,
        largura: f.largura ?? 0,
        altura: f.altura ?? 0,
      };
    },

    async propor(proposta) {
      return db.transaction(async (tx) => {
        if (proposta.itemId) {
          await tx.delete(propostasItem).where(eq(propostasItem.itemId, proposta.itemId));
        }
        const [linha] = await tx
          .insert(propostasItem)
          .values({ ...proposta, situacao: 'em_analise' })
          .returning({ id: propostasItem.id });
        return linha!.id;
      });
    },

    async mudarPreco(produtorId, itemId, preco, agora) {
      if (!ehUuid(itemId)) return false;
      const r = await db
        .update(itensCatalogo)
        .set({
          precoCentavos: preco?.centavos ?? null,
          unidade: preco?.unidade ?? null,
          precoAtualizadoEm: preco ? agora : null,
        })
        .where(and(eq(itensCatalogo.id, itemId), eq(itensCatalogo.produtorId, produtorId)))
        .returning({ id: itensCatalogo.id });
      return r.length > 0;
    },

    async removerItem(produtorId, itemId) {
      if (!ehUuid(itemId)) return false;
      const r = await db
        .delete(itensCatalogo)
        .where(and(eq(itensCatalogo.id, itemId), eq(itensCatalogo.produtorId, produtorId)))
        .returning({ id: itensCatalogo.id });
      return r.length > 0;
    },

    async removerProposta(produtorId, id) {
      if (!ehUuid(id)) return false;
      const r = await db
        .delete(propostasItem)
        .where(and(eq(propostasItem.id, id), eq(propostasItem.produtorId, produtorId)))
        .returning({ id: propostasItem.id });
      return r.length > 0;
    },

    // --- Autor (scripts) ------------------------------------------------------------------

    async criarConvite(produtorId, codigoHash, expiraEm) {
      const [p] = await db
        .select({ id: produtores.id })
        .from(produtores)
        .where(eq(produtores.id, produtorId));
      if (!p) return false;
      await db.transaction(async (tx) => {
        await tx.delete(convitesProdutor).where(eq(convitesProdutor.produtorId, produtorId));
        await tx.insert(convitesProdutor).values({ codigoHash, produtorId, expiraEm });
      });
      return true;
    },

    async contas() {
      const linhas = await db
        .select({
          produtorId: contasProdutor.produtorId,
          dados: produtores.dados,
          email: usuarios.email,
          desde: contasProdutor.criadoEm,
        })
        .from(contasProdutor)
        .innerJoin(produtores, eq(produtores.id, contasProdutor.produtorId))
        .innerJoin(usuarios, eq(usuarios.id, contasProdutor.usuarioId))
        .orderBy(asc(contasProdutor.criadoEm));
      return linhas.map(({ dados, ...l }) => ({ ...l, nome: (dados as { nome: string }).nome }));
    },

    async desvincular(produtorId) {
      const r = await db
        .delete(contasProdutor)
        .where(eq(contasProdutor.produtorId, produtorId))
        .returning({ id: contasProdutor.produtorId });
      return r.length > 0;
    },

    async propostasEmAnalise() {
      const linhas = await db
        .select({ proposta: propostasItem, dados: produtores.dados, item: itensCatalogo })
        .from(propostasItem)
        .innerJoin(produtores, eq(produtores.id, propostasItem.produtorId))
        .leftJoin(itensCatalogo, eq(itensCatalogo.id, propostasItem.itemId))
        .where(eq(propostasItem.situacao, 'em_analise'))
        .orderBy(asc(propostasItem.enviadaEm));
      return linhas.map(({ proposta, dados, item }) => ({
        ...comoProposta(proposta),
        produtorNome: (dados as { nome: string }).nome,
        item: item ? comoItem(item) : null,
      }));
    },

    async fotoBytes(id) {
      const [f] = await db
        .select({ bytes: fotosProdutor.bytes })
        .from(fotosProdutor)
        .where(eq(fotosProdutor.id, id));
      return f?.bytes ?? null;
    },

    async aprovar(id, agora) {
      if (!ehUuid(id)) return false;
      return db.transaction(async (tx) => {
        const [p] = await tx
          .select()
          .from(propostasItem)
          .where(and(eq(propostasItem.id, id), eq(propostasItem.situacao, 'em_analise')))
          .for('update');
        if (!p) return false;

        if (p.itemId) {
          // Mudança: nome, descrição e foto (o preço o produtor já muda direto).
          await tx
            .update(itensCatalogo)
            .set({ nome: p.nome, descricao: p.descricao, foto: p.foto })
            .where(eq(itensCatalogo.id, p.itemId));
        } else {
          const [{ ultima } = { ultima: null }] = await tx
            .select({ ultima: max(itensCatalogo.ordem) })
            .from(itensCatalogo)
            .where(eq(itensCatalogo.produtorId, p.produtorId));
          await tx.insert(itensCatalogo).values({
            produtorId: p.produtorId,
            nome: p.nome,
            descricao: p.descricao,
            precoCentavos: p.precoCentavos,
            unidade: p.unidade,
            precoAtualizadoEm: p.precoCentavos !== null ? agora : null,
            foto: p.foto,
            ordem: (ultima ?? -1) + 1,
            criadoEm: agora,
          });
        }
        if (p.foto) {
          await tx
            .update(fotosProdutor)
            .set({ publica: true })
            .where(eq(fotosProdutor.id, p.foto.id));
        }
        await tx.delete(propostasItem).where(eq(propostasItem.id, id));
        return true;
      });
    },

    async recusar(id, motivo) {
      if (!ehUuid(id)) return false;
      const r = await db
        .update(propostasItem)
        .set({ situacao: 'recusada', motivo })
        .where(and(eq(propostasItem.id, id), eq(propostasItem.situacao, 'em_analise')))
        .returning({ id: propostasItem.id });
      return r.length > 0;
    },
  };
}
