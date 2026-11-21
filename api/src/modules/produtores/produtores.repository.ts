import type { Producer, ProducerRequest } from '@nutriscan/shared';
import { asc, eq, notInArray } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { ehUuid } from '../../db/conversoes.js';
import { fotosProdutor, pedidosProdutor, produtores } from '../../db/schema.js';

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
   * Substitui todos os produtores pelos da lista (quem saiu do arquivo sai do mapa) e as fotos
   * pelas do mapa id → JPEG (foto que ninguém mais usa é apagada).
   */
  substituir: (lista: readonly Producer[], fotos?: ReadonlyMap<string, Buffer>) => Promise<void>;
  pedidosPendentes: () => Promise<Pedido[]>;
  /** false se o pedido não existe. */
  aprovarPedido: (id: string) => Promise<boolean>;
  recusarPedido: (id: string) => Promise<boolean>;
};

// Os dados vêm do script de importação, que já validou cada produtor.
const comoProdutor = (dados: unknown) => dados as Producer;

export function criarRepositorioProdutoresPg(
  db: Database['db'],
): RepositorioProdutores & AdminProdutores {
  return {
    async listar() {
      // Ordena no JS: o nome está dentro do JSON, e o localeCompare segue a ordem do português.
      const linhas = await db.select().from(produtores);
      return linhas
        .map((l) => comoProdutor(l.dados))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    async buscar(id) {
      const [linha] = await db.select().from(produtores).where(eq(produtores.id, id));
      return linha ? comoProdutor(linha.dados) : null;
    },

    async foto(id) {
      const [linha] = await db
        .select({ bytes: fotosProdutor.bytes })
        .from(fotosProdutor)
        .where(eq(fotosProdutor.id, id));
      return linha?.bytes ?? null;
    },

    async criarPedido(pedido) {
      const [linha] = await db
        .insert(pedidosProdutor)
        .values({ dados: pedido, criadoEm: new Date() })
        .returning({ id: pedidosProdutor.id });
      return linha!.id;
    },

    async substituir(lista, fotos = new Map()) {
      const agora = new Date();
      await db.transaction(async (tx) => {
        const idsFotos = [...fotos.keys()];
        await (idsFotos.length > 0
          ? tx.delete(fotosProdutor).where(notInArray(fotosProdutor.id, idsFotos))
          : tx.delete(fotosProdutor));
        for (const [id, bytes] of fotos) {
          // Mesmo id = mesmo conteúdo: a foto que já está no banco fica como está.
          await tx
            .insert(fotosProdutor)
            .values({ id, bytes, criadoEm: agora })
            .onConflictDoNothing({ target: fotosProdutor.id });
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
