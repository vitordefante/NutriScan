CREATE TABLE "produtos_cache" (
	"barcode" text PRIMARY KEY NOT NULL,
	"fonte" text NOT NULL,
	"dados" jsonb,
	"atualizado_em" timestamp with time zone NOT NULL
);
