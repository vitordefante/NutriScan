/**
 * Schema do banco (tabelas Drizzle).
 * Depois de mudar este arquivo: `npm run db:generate -w @nutriscan/api` (gera a migração SQL)
 * e `npm run db:migrate -w @nutriscan/api` (aplica no banco).
 */
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Cache das respostas do Open Food Facts, por código de barras.
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
