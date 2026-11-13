CREATE TABLE "rotulos_lidos" (
	"barcode" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"nome" text,
	"ingredientes" text,
	"nutrientes" jsonb,
	"unidade" text,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
