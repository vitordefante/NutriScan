import type {
  FrontLabelNutrient,
  LogEntry,
  LogNutrition,
  Macronutrients,
  NovaGroup,
} from '@nutriscan/shared';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';

import type { Database } from '../../db/client.js';
import { ehUuid, paraFaixa } from '../../db/conversoes.js';
import { registros } from '../../db/schema.js';
import { MICRONUTRIENTES } from '../nutricao/micronutrientes.js';

export type NovoRegistro = Omit<LogEntry, 'id'>;

export type RepositorioRegistros = {
  criar: (usuarioId: string, registro: NovoRegistro) => Promise<LogEntry>;
  /** Registros a partir de `desde`, os mais recentes primeiro. */
  listar: (usuarioId: string, desde: Date) => Promise<LogEntry[]>;
  /** false se o registro não existe (ou é de outra conta). */
  excluir: (usuarioId: string, id: string) => Promise<boolean>;
};

const LUPA: readonly FrontLabelNutrient[] = ['acucar_adicionado', 'gordura_saturada', 'sodio'];
const textos = z.array(z.string()).catch([]);

const MACROS: readonly (keyof Macronutrients)[] = [
  'energiaKcal',
  'carboidratos',
  'acucares',
  'fibras',
  'proteinas',
  'gorduras',
  'gordurasSaturadas',
  'sodioMg',
];
/** Só as chaves conhecidas, com números finitos (o JSON do banco é tratado como não confiável). */
const numerosDe = (chaves: readonly string[]) =>
  z
    .record(z.string(), z.unknown())
    .transform((o) =>
      Object.fromEntries(
        Object.entries(o).filter(
          ([k, v]) => chaves.includes(k) && typeof v === 'number' && Number.isFinite(v),
        ),
      ),
    );
const micros = numerosDe(Object.keys(MICRONUTRIENTES));
/** Registros antigos (antes da nutrição) e cosméticos têm null: ficam sem o campo. */
const nutricaoSalva = z
  .object({
    quantidade: z.number().positive(),
    unidade: z.enum(['g', 'ml']),
    porcao: z.number().positive().optional(),
    macros: numerosDe(MACROS),
    micros,
    estimados: micros,
  })
  .nullable()
  .catch(null);

export function criarRepositorioRegistrosPg(db: Database['db']): RepositorioRegistros {
  return {
    async criar(usuarioId, r) {
      const [linha] = await db
        .insert(registros)
        .values({
          usuarioId,
          barcode: r.barcode,
          tipo: r.tipo,
          nome: r.nome,
          marca: r.marca ?? null,
          imagemUrl: r.imagemUrl ?? null,
          nota: r.nota,
          faixa: r.faixa,
          nova: r.nova,
          altoEm: r.altoEm,
          alertas: r.alertas,
          nutricao: r.nutricao ?? null,
          registradoEm: new Date(r.registradoEm),
        })
        .returning({ id: registros.id });
      return { id: linha!.id, ...r };
    },

    async listar(usuarioId, desde) {
      const linhas = await db
        .select()
        .from(registros)
        .where(and(eq(registros.usuarioId, usuarioId), gte(registros.registradoEm, desde)))
        .orderBy(desc(registros.registradoEm));
      return linhas.map((l) => {
        const nutricao = nutricaoSalva.parse(l.nutricao) as LogNutrition | null;
        return {
          id: l.id,
          barcode: l.barcode,
          tipo: l.tipo === 'cosmetico' ? 'cosmetico' : 'alimento',
          nome: l.nome,
          ...(l.marca && { marca: l.marca }),
          ...(l.imagemUrl && { imagemUrl: l.imagemUrl }),
          nota: l.nota,
          faixa: paraFaixa(l.faixa),
          nova:
            l.nova === 1 || l.nova === 2 || l.nova === 3 || l.nova === 4
              ? (l.nova as NovaGroup)
              : null,
          altoEm: textos
            .parse(l.altoEm)
            .filter((n): n is FrontLabelNutrient => (LUPA as readonly string[]).includes(n)),
          alertas: textos.parse(l.alertas),
          ...(nutricao && { nutricao }),
          registradoEm: l.registradoEm.toISOString(),
        };
      });
    },

    async excluir(usuarioId, id) {
      if (!ehUuid(id)) return false;
      const apagados = await db
        .delete(registros)
        .where(and(eq(registros.id, id), eq(registros.usuarioId, usuarioId)))
        .returning({ id: registros.id });
      return apagados.length > 0;
    },
  };
}
