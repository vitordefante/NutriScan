CREATE TABLE "historico" (
	"usuario_id" uuid NOT NULL,
	"barcode" text NOT NULL,
	"tipo" text NOT NULL,
	"nome" text NOT NULL,
	"marca" text,
	"imagem_url" text,
	"nota" integer,
	"faixa" text,
	"escaneado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "historico_usuario_id_barcode_pk" PRIMARY KEY("usuario_id","barcode")
);
--> statement-breakpoint
CREATE TABLE "registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"barcode" text NOT NULL,
	"tipo" text NOT NULL,
	"nome" text NOT NULL,
	"marca" text,
	"imagem_url" text,
	"nota" integer,
	"faixa" text,
	"nova" integer,
	"alto_em" jsonb NOT NULL,
	"alertas" jsonb NOT NULL,
	"registrado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "historico" ADD CONSTRAINT "historico_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registros" ADD CONSTRAINT "registros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registros_usuario_data" ON "registros" USING btree ("usuario_id","registrado_em");