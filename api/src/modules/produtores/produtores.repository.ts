import type { Producer, ProducerItem, ProducerRequest } from '@nutriscan/shared';
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { ehUuid } from '../../db/conversoes.js';
import {
  contasProdutor,
  fotosProdutor,
  itensCatalogo,
  pedidosProdutor,
  produtores,
  propostasItem,
} from '../../db/schema.js';
import { comCatalogo, type LinhaItem, paraItemPublico } from './catalogo.js';

/** O que as rotas usam. */
export type RepositorioProdutores = {
  listar: () => Promise<Producer[]>;
  buscar: (id: string) => Promise<Producer | null>;
  /** O JPEG de uma foto publicada, ou null. */
  foto: (id: string) => Promise<Buffer | null>;
  /** Grava um pedido pendente e devolve o id. */
  criarPedido: (pedido: ProducerRequest) => Promise<string>;
};

export type Pedido = { id: string; dados: ProducerRequest; status: string; criadoEm: Date };

/** O que os scripts do autor usam (importar, aprovar e recusar pedidos). */
export type AdminProdutores = {
  /**
   * Substitui todos os produtores pelos da lista (quem saiu do arquivo sai do mapa), grava as
   * fotos id → JPEG e troca o catálogo de quem está em `catalogos` — menos de quem tem conta no
   * app (esses cuidam do catálogo pelo app; os ids voltam em `ignorados`). Foto que nenhum
   * produtor, item ou proposta usa é apagada.
   */
  substituir: (
    lista: readonly Producer[],
    fotos?: ReadonlyMap<string, Buffer>,
    catalogos?: ReadonlyMap<string, readonly ProducerItem[]>,
  ) => Promise<{ ignorados: string[] }>;
  pedidosPendentes: () => Promise<Pedido[]>;
  /** false se o pedido não existe. */
  aprovarPedido: (id: string) => Promise<boolean>;
  recusarPedido: (id: string) => Promise<boolean>;
};

// Os dados vêm do script de importação, que já validou cada produtor.
const comoProdutor = (dados: unknown) => dados as Producer;

/** Itens publicados por produtor, na ordem de exibição. */
async function catalogosDe(db: Database['db'], ids: readonly string[]) {
  const porProdutor = new Map<string, ProducerItem[]>();
  if (ids.length === 0) return porProdutor;
  const linhas = await db
    .select()
    .from(itensCatalogo)
    .where(inArray(itensCatalogo.produtorId, [...ids]))
    .orderBy(asc(itensCatalogo.ordem), asc(itensCatalogo.criadoEm));
  for (const l of linhas) {
    const lista = porProdutor.get(l.produtorId) ?? [];
    lista.push(paraItemPublico(l as LinhaItem));
    porProdutor.set(l.produtorId, lista);
  }
  return porProdutor;
}

export function criarRepositorioProdutoresPg(
  db: Database['db'],
): RepositorioProdutores & AdminProdutores {
  return {
    async listar() {
      // Ordena no JS: o nome está dentro do JSON, e o localeCompare segue a ordem do português.
      const linhas = await db.select().from(produtores);
      const catalogos = await catalogosDe(
        db,
        linhas.map((l) => l.id),
      );
      return linhas
        .map((l) => comCatalogo(comoProdutor(l.dados), catalogos.get(l.id) ?? []))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    async buscar(id) {
      const [linha] = await db.select().from(produtores).where(eq(produtores.id, id));
      if (!linha) return null;
      const catalogos = await catalogosDe(db, [id]);
      return comCatalogo(comoProdutor(linha.dados), catalogos.get(id) ?? []);
    },

    async foto(id) {
      // Só as publicadas: a foto que o produtor mandou pelo app espera a aprovação.
      const [linha] = await db
        .select({ bytes: fotosProdutor.bytes })
        .from(fotosProdutor)
        .where(and(eq(fotosProdutor.id, id), eq(fotosProdutor.publica, true)));
      return linha?.bytes ?? null;
    },

    async criarPedido(pedido) {
      const [linha] = await db
        .insert(pedidosProdutor)
        .values({ dados: pedido, criadoEm: new Date() })
        .returning({ id: pedidosProdutor.id });
      return linha!.id;
    },

    async substituir(lista, fotos = new Map(), catalogos = new Map()) {
      const agora = new Date();
      return db.transaction(async (tx) => {
        for (const [id, bytes] of fotos) {
          // Mesmo id = mesmo conteúdo. Se o produtor já tinha mandado a mesma foto pelo app, a
          // importação do autor vale como aprovação.
          await tx
            .insert(fotosProdutor)
            .values({ id, bytes, criadoEm: agora })
            .onConflictDoUpdate({ target: fotosProdutor.id, set: { publica: true } });
        }

        const ids = lista.map((p) => p.id);
        await (ids.length > 0
          ? tx.delete(produtores).where(notInArray(produtores.id, ids))
          : tx.delete(produtores));
        for (const p of lista) {
          await tx
            .insert(produtores)
            .values({ id: p.id, dados: p, atualizadoEm: agora })
            .onConflictDoUpdate({
              target: produtores.id,
              set: { dados: p, atualizadoEm: agora },
            });
        }

        const comConta = new Set(
          (await tx.select({ id: contasProdutor.produtorId }).from(contasProdutor)).map(
            (c) => c.id,
          ),
        );
        const ignorados: string[] = [];
        for (const [produtorId, itens] of catalogos) {
          if (comConta.has(produtorId)) {
            ignorados.push(produtorId);
            continue;
          }
          await tx.delete(itensCatalogo).where(eq(itensCatalogo.produtorId, produtorId));
          for (const [ordem, item] of itens.entries()) {
            await tx.insert(itensCatalogo).values({
              produtorId,
              nome: item.nome,
              descricao: item.descricao ?? null,
              precoCentavos: item.preco?.centavos ?? null,
              unidade: item.preco?.unidade ?? null,
              foto: item.foto ? { ...item.foto } : null,
              ordem,
              criadoEm: agora,
            });
          }
        }

        // Fotos sem uso: nem na importação, nem num item, nem numa proposta. As enviadas pelo
        // app há menos de um dia ficam (o produtor pode estar no meio do cadastro do item).
        const usadas = [...fotos.keys()];
        await tx
          .delete(fotosProdutor)
          .where(
            and(
              usadas.length > 0 ? notInArray(fotosProdutor.id, usadas) : undefined,
              sql`not exists (select 1 from ${itensCatalogo} where ${itensCatalogo.foto}->>'id' = ${fotosProdutor.id})`,
              sql`not exists (select 1 from ${propostasItem} where ${propostasItem.foto}->>'id' = ${fotosProdutor.id})`,
              sql`(${fotosProdutor.publica} or ${fotosProdutor.criadoEm} < now() - interval '1 day')`,
            ),
          );
        return { ignorados };
      });
    },

    async pedidosPendentes() {
      const linhas = await db
        .select()
        .from(pedidosProdutor)
        .where(eq(pedidosProdutor.status, 'pendente'))
        .orderBy(asc(pedidosProdutor.criadoEm));
      return linhas.map((l) => ({ ...l, dados: l.dados as ProducerRequest }));
    },

    async aprovarPedido(id) {
      if (!ehUuid(id)) return false;
      const r = await db
        .update(pedidosProdutor)
        .set({ status: 'aprovado' })
        .where(eq(pedidosProdutor.id, id))
        .returning({ id: pedidosProdutor.id });
      return r.length > 0;
    },

    async recusarPedido(id) {
      if (!ehUuid(id)) return false;
      const r = await db
        .delete(pedidosProdutor)
        .where(eq(pedidosProdutor.id, id))
        .returning({ id: pedidosProdutor.id });
      return r.length > 0;
    },
  };
}
