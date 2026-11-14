import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Database } from '../../db/client.js';
import { buscasCategoria } from '../../db/schema.js';
import type { ResultadoBusca } from '../produtos/open-food-facts.client.js';
import { produtoOffSchema } from '../produtos/open-food-facts.mapper.js';
import type { FonteProduto } from '../produtos/produtos.service.js';

export type BuscaEmCache = ResultadoBusca & { atualizadoEm: Date };

/** Cache das buscas por categoria no Postgres (tabela buscas_categoria). */
export type CacheBuscas = {
  buscar: (fonte: FonteProduto, categoria: string) => Promise<BuscaEmCache | null>;
  salvar: (
    fonte: FonteProduto,
    categoria: string,
    busca: ResultadoBusca,
    agora: Date,
  ) => Promise<void>;
};

const listaSchema = z.array(z.unknown());

export function criarCacheBuscasPg(db: Database['db']): CacheBuscas {
  return {
    async buscar(fonte, categoria) {
      const [linha] = await db
        .select()
        .from(buscasCategoria)
        .where(and(eq(buscasCategoria.fonte, fonte), eq(buscasCategoria.categoria, categoria)))
        .limit(1);
      if (!linha) return null;

      // Valida de novo ao ler (o formato pode ter mudado entre versões da API); um cadastro
      // que não passa só fica de fora.
      const lista = listaSchema.safeParse(linha.produtos);
      if (!lista.success) return null;
      const produtos = lista.data.flatMap((p) => {
        const r = produtoOffSchema.safeParse(p);
        return r.success ? [r.data] : [];
      });
      return { total: linha.total, produtos, atualizadoEm: linha.atualizadoEm };
    },

    async salvar(fonte, categoria, { total, produtos }, atualizadoEm) {
      await db
        .insert(buscasCategoria)
        .values({ fonte, categoria, total, produtos, atualizadoEm })
        .onConflictDoUpdate({
          target: [buscasCategoria.fonte, buscasCategoria.categoria],
          set: { total, produtos, atualizadoEm },
        });
    },
  };
}
