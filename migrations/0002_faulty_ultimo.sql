CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"messages" jsonb NOT NULL
);
