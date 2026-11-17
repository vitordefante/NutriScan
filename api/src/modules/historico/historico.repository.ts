import type { HistoryItem, ProductKind } from '@nutriscan/shared';
import { desc, eq, sql } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { paraFaixa } from '../../db/conversoes.js';
import { historico } from '../../db/schema.js';

export type RepositorioHistorico = {
  /** Os mais recentes primeiro. */
  listar: (usuarioId: string, limite: number) => Promise<HistoryItem[]>;
  /** Guarda os scans; de um produto já guardado, vale o scan mais recente. */
  salvar: (usuarioId: string, itens: readonly HistoryItem[]) => Promise<void>;
};

export function criarRepositorioHistoricoPg(db: Database['db']): RepositorioHistorico {
  return {
    async listar(usuarioId, limite) {
      const linhas = await db
        .select()
        .from(historico)
        .where(eq(historico.usuarioId, usuarioId))
        .orderBy(desc(historico.escaneadoEm))
        .limit(limite);
      return linhas.map((l) => ({
        barcode: l.barcode,
        tipo: (l.tipo === 'cosmetico' ? 'cosmetico' : 'alimento') satisfies ProductKind,
        nome: l.nome,
        ...(l.marca && { marca: l.marca }),
        ...(l.imagemUrl && { imagemUrl: l.imagemUrl }),
        nota: l.nota,
        faixa: paraFaixa(l.faixa),
        escaneadoEm: l.escaneadoEm.toISOString(),
      }));
    },

    async salvar(usuarioId, itens) {
      // O mesmo produto duas vezes num envio derrubaria o INSERT … ON CONFLICT: fica o mais novo.
      const porCodigo = new Map<string, HistoryItem>();
      for (const i of itens) {
        const outro = porCodigo.get(i.barcode);
        if (!outro || Date.parse(i.escaneadoEm) > Date.parse(outro.escaneadoEm)) {
          porCodigo.set(i.barcode, i);
        }
      }
      if (porCodigo.size === 0) return;
      await db
        .insert(historico)
        .values(
          [...porCodigo.values()].map((i) => ({
            usuarioId,
            barcode: i.barcode,
            tipo: i.tipo,
            nome: i.nome,
            marca: i.marca ?? null,
            imagemUrl: i.imagemUrl ?? null,
            nota: i.nota,
            faixa: i.faixa,
            escaneadoEm: new Date(i.escaneadoEm),
          })),
        )
        .onConflictDoUpdate({
          target: [historico.usuarioId, historico.barcode],
          set: {
            tipo: sql`excluded.tipo`,
            nome: sql`excluded.nome`,
            marca: sql`excluded.marca`,
            imagemUrl: sql`excluded.imagem_url`,
            nota: sql`excluded.nota`,
            faixa: sql`excluded.faixa`,
            escaneadoEm: sql`excluded.escaneado_em`,
          },
          // Um scan antigo (de outro aparelho, sincronizado depois) não apaga um mais novo.
          setWhere: sql`excluded.escaneado_em > ${historico.escaneadoEm}`,
        });
    },
  };
}
