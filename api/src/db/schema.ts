/**
 * Schema do banco (tabelas Drizzle).
 * Depois de mudar este arquivo: `npm run db:generate -w @nutriscan/api` (gera a migração SQL)
 * e `npm run db:migrate -w @nutriscan/api` (aplica no banco).
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

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

/**
 * Cache das buscas por categoria (alternativas): o limite de buscas do Open Food Facts é baixo
 * (~10 por minuto), então cada categoria é consultada no máximo uma vez por semana.
 * `produtos` guarda os cadastros BRUTOS (como em produtos_cache), não as notas.
 */
export const buscasCategoria = pgTable(
  'buscas_categoria',
  {
    fonte: text('fonte').notNull(),
    categoria: text('categoria').notNull(),
    total: integer('total').notNull(),
    produtos: jsonb('produtos').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.fonte, t.categoria] })],
);

/** Contas do app (e-mail + senha). A senha só existe como hash argon2id. */
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Sempre em minúsculas e sem espaços nas pontas. */
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull(),
});

/**
 * Histórico de scans sincronizado com a conta: uma linha por produto (o último scan vale).
 * Guarda o resumo que a lista mostra; a análise completa vem de GET /produtos/:barcode.
 */
export const historico = pgTable(
  'historico',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull(),
    tipo: text('tipo').notNull(),
    nome: text('nome').notNull(),
    marca: text('marca'),
    imagemUrl: text('imagem_url'),
    nota: integer('nota'),
    faixa: text('faixa'),
    escaneadoEm: timestamp('escaneado_em', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.barcode] })],
);

/**
 * Log de exposição: cada consumo (alimento) ou uso (cosmético) registrado. Guarda a análise do
 * momento do registro (nota, NOVA, "alto em", títulos dos alertas) — o resumo do período sai daqui.
 */
export const registros = pgTable(
  'registros',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull(),
    tipo: text('tipo').notNull(),
    nome: text('nome').notNull(),
    marca: text('marca'),
    imagemUrl: text('imagem_url'),
    nota: integer('nota'),
    faixa: text('faixa'),
    nova: integer('nova'),
    altoEm: jsonb('alto_em').notNull(),
    alertas: jsonb('alertas').notNull(),
    registradoEm: timestamp('registrado_em', { withTimezone: true }).notNull(),
  },
  (t) => [index('registros_usuario_data').on(t.usuarioId, t.registradoEm)],
);

/**
 * Produtores do mapa: o conteúdo de `api/data/produtores.local.json` já tratado para publicar
 * (ver `paraPublicar`). Substituídos por inteiro a cada importação.
 */
export const produtores = pgTable('produtores', {
  id: text('id').primaryKey(),
  /** O `Producer` como o app recebe. */
  dados: jsonb('dados').notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull(),
});

/** Pedidos do formulário "Quero aparecer no mapa": nada é publicado sem a aprovação do autor. */
export const pedidosProdutor = pgTable('pedidos_produtor', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** O `ProducerRequest` enviado. */
  dados: jsonb('dados').notNull(),
  /** pendente | aprovado (recusado = apagado). */
  status: text('status').notNull().default('pendente'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull(),
});
