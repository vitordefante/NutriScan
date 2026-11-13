/**
 * Schema do banco (tabelas Drizzle).
 * Depois de mudar este arquivo: `npm run db:generate -w @nutriscan/api` (gera a migração SQL)
 * e `npm run db:migrate -w @nutriscan/api` (aplica no banco).
 */
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Cache das respostas do Open Food Facts (alimentos) e do Open Beauty Facts (cosméticos),
 * por código de barras. `fonte` diz de qual base veio o produto.
 *
 * Guarda o dado BRUTO da fonte, não a nota: assim uma mudança na metodologia vale na hora
 * para todos os produtos, sem precisar limpar o cache.
 * `dados` nulo = a fonte respondeu "produto não encontrado" (também é guardado, para não
 * consultar a fonte de novo a cada leitura de um código desconhecido).
 */
export const produtosCache = pgTable('produtos_cache', {
  barcode: text('barcode').primaryKey(),
  fonte: text('fonte').notNull(),
  dados: jsonb('dados'),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull(),
});

/**
 * Base própria: o que foi lido nas fotos de rótulos enviadas pelo app, por código de barras.
 * Preenche produtos que as bases abertas não conhecem ou conhecem sem ingredientes/tabela.
 *
 * Como no cache, guarda o dado lido (texto dos ingredientes, nutrientes por 100 g/ml), não a nota.
 * As fotos não são guardadas: o OCR roda no aparelho e só o texto chega aqui.
 */
export const rotulosLidos = pgTable('rotulos_lidos', {
  barcode: text('barcode').primaryKey(),
  tipo: text('tipo').notNull(),
  nome: text('nome'),
  ingredientes: text('ingredientes'),
  /** Nutrientes por 100 g ou 100 ml (ver `unidade`). */
  nutrientes: jsonb('nutrientes'),
  unidade: text('unidade'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull(),
});
