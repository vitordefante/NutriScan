CREATE TABLE "pedidos_produtor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dados" jsonb NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtores" (
	"id" text PRIMARY KEY NOT NULL,
	"dados" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
