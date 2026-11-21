CREATE TABLE "contas_produtor" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"produtor_id" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "contas_produtor_produtor_id_unique" UNIQUE("produtor_id")
);
--> statement-breakpoint
CREATE TABLE "convites_produtor" (
	"codigo_hash" text PRIMARY KEY NOT NULL,
	"produtor_id" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_catalogo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produtor_id" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_centavos" integer,
	"unidade" text,
	"preco_atualizado_em" timestamp with time zone,
	"foto" jsonb,
	"ordem" integer NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propostas_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produtor_id" text NOT NULL,
	"item_id" uuid,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_centavos" integer,
	"unidade" text,
	"foto" jsonb,
	"situacao" text DEFAULT 'em_analise' NOT NULL,
	"motivo" text,
	"enviada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "propostas_item_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "fotos_produtor" ADD COLUMN "publica" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "fotos_produtor" ADD COLUMN "enviada_por" text;--> statement-breakpoint
ALTER TABLE "fotos_produtor" ADD COLUMN "largura" integer;--> statement-breakpoint
ALTER TABLE "fotos_produtor" ADD COLUMN "altura" integer;--> statement-breakpoint
ALTER TABLE "contas_produtor" ADD CONSTRAINT "contas_produtor_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_produtor" ADD CONSTRAINT "contas_produtor_produtor_id_produtores_id_fk" FOREIGN KEY ("produtor_id") REFERENCES "public"."produtores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convites_produtor" ADD CONSTRAINT "convites_produtor_produtor_id_produtores_id_fk" FOREIGN KEY ("produtor_id") REFERENCES "public"."produtores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_catalogo" ADD CONSTRAINT "itens_catalogo_produtor_id_produtores_id_fk" FOREIGN KEY ("produtor_id") REFERENCES "public"."produtores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propostas_item" ADD CONSTRAINT "propostas_item_produtor_id_produtores_id_fk" FOREIGN KEY ("produtor_id") REFERENCES "public"."produtores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propostas_item" ADD CONSTRAINT "propostas_item_item_id_itens_catalogo_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."itens_catalogo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itens_catalogo_produtor" ON "itens_catalogo" USING btree ("produtor_id","ordem");--> statement-breakpoint
CREATE INDEX "propostas_item_produtor" ON "propostas_item" USING btree ("produtor_id");