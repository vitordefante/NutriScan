import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import type { Database } from '../../db/client.js';
import { rotulosLidos } from '../../db/schema.js';
import type { RotuloLido } from './leitura.js';

/** Base própria de rótulos lidos por foto. */
export type RepositorioRotulos = {
  buscar: (barcode: string) => Promise<RotuloLido | null>;
  /** Vários de uma vez (ex.: os candidatos a alternativa); só os que têm leitura aparecem no mapa. */
  buscarVarios: (barcodes: readonly string[]) => Promise<Map<string, RotuloLido>>;
  salvar: (barcode: string, lido: RotuloLido, agora: Date) => Promise<void>;
};

const nutrientesSchema = z.record(z.string(), z.number());

export function criarRepositorioRotulosPg(db: Database['db']): RepositorioRotulos {
  return {
    async buscar(barcode) {
      const [linha] = await db
        .select()
        .from(rotulosLidos)
        .where(eq(rotulosLidos.barcode, barcode))
        .limit(1);
      return linha ? paraRotulo(linha) : null;
    },

    async buscarVarios(barcodes) {
      if (barcodes.length === 0) return new Map();
      const linhas = await db
        .select()
        .from(rotulosLidos)
        .where(inArray(rotulosLidos.barcode, [...barcodes]));
      return new Map(
        linhas.flatMap((linha) => {
          const lido = paraRotulo(linha);
          return lido ? [[linha.barcode, lido] as const] : [];
        }),
      );
    },

    async salvar(barcode, lido, agora) {
      const valores = {
        tipo: lido.tipo,
        nome: lido.nome ?? null,
        ingredientes: lido.ingredientes ?? null,
        nutrientes: lido.nutrientes ?? null,
        unidade: lido.unidade ?? null,
        porcao: lido.porcao ?? null,
        atualizadoEm: agora,
      };
      await db
        .insert(rotulosLidos)
        .values({ barcode, ...valores, criadoEm: agora })
        .onConflictDoUpdate({ target: rotulosLidos.barcode, set: valores });
    },
  };
}

function paraRotulo(linha: typeof rotulosLidos.$inferSelect): RotuloLido | null {
  if (linha.tipo !== 'alimento' && linha.tipo !== 'cosmetico') return null;
  const nutrientes = nutrientesSchema.safeParse(linha.nutrientes);
  return {
    tipo: linha.tipo,
    ...(linha.nome && { nome: linha.nome }),
    ...(linha.ingredientes && { ingredientes: linha.ingredientes }),
    ...(nutrientes.success && { nutrientes: nutrientes.data }),
    ...((linha.unidade === 'g' || linha.unidade === 'ml') && { unidade: linha.unidade }),
    ...(linha.porcao !== null && linha.porcao > 0 && { porcao: linha.porcao }),
  };
}
