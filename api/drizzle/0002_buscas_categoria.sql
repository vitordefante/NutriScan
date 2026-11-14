CREATE TABLE "buscas_categoria" (
	"fonte" text NOT NULL,
	"categoria" text NOT NULL,
	"total" integer NOT NULL,
	"produtos" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "buscas_categoria_fonte_categoria_pk" PRIMARY KEY("fonte","categoria")
);
