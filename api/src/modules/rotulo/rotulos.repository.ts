import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Database } from '../../db/client.js';
import { rotulosLidos } from '../../db/schema.js';
import type { RotuloLido } from './leitura.js';

/** Base própria de rótulos lidos por foto. */
export type RepositorioRotulos = {
  buscar: (barcode: string) => Promise<RotuloLido | null>;
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
      if (!linha || (linha.tipo !== 'alimento' && linha.tipo !== 'cosmetico')) return null;

      const nutrientes = nutrientesSchema.safeParse(linha.nutrientes);
      return {
        tipo: linha.tipo,
        ...(linha.nome && { nome: linha.nome }),
        ...(linha.ingredientes && { ingredientes: linha.ingredientes }),
        ...(nutrientes.success && { nutrientes: nutrientes.data }),
        ...((linha.unidade === 'g' || linha.unidade === 'ml') && { unidade: linha.unidade }),
      };
    },

    async salvar(barcode, lido, agora) {
      const valores = {
        tipo: lido.tipo,
        nome: lido.nome ?? null,
        ingredientes: lido.ingredientes ?? null,
        nutrientes: lido.nutrientes ?? null,
        unidade: lido.unidade ?? null,
        atualizadoEm: agora,
      };
      await db
        .insert(rotulosLidos)
        .values({ barcode, ...valores, criadoEm: agora })
        .onConflictDoUpdate({ target: rotulosLidos.barcode, set: valores });
    },
  };
}
