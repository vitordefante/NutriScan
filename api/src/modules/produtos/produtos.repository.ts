import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { produtosCache } from '../../db/schema.js';
import { produtoOffSchema } from './open-food-facts.mapper.js';
import type { CacheProdutos } from './produtos.service.js';

const FONTE = 'open_food_facts';

/** Cache de produtos no Postgres (tabela produtos_cache). */
export function criarCacheProdutosPg(db: Database['db']): CacheProdutos {
  return {
    async buscar(barcode) {
      const [linha] = await db
        .select()
        .from(produtosCache)
        .where(eq(produtosCache.barcode, barcode))
        .limit(1);
      if (!linha) return null;
      if (linha.dados === null) return { dados: null, atualizadoEm: linha.atualizadoEm };

      // Valida de novo ao ler: se o formato mudou entre versões da API, trata como ausente.
      const dados = produtoOffSchema.safeParse(linha.dados);
      return dados.success ? { dados: dados.data, atualizadoEm: linha.atualizadoEm } : null;
    },

    async salvar(barcode, dados, atualizadoEm) {
      await db
        .insert(produtosCache)
        .values({ barcode, fonte: FONTE, dados, atualizadoEm })
        .onConflictDoUpdate({ target: produtosCache.barcode, set: { dados, atualizadoEm } });
    },
  };
}
