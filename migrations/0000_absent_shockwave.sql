CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"global_prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"from_state_id" integer NOT NULL,
	"to_state_id" integer NOT NULL,
	"condition" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"is_start" boolean DEFAULT false NOT NULL,
	"is_end" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_state_id_states_id_fk" FOREIGN KEY ("from_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_state_id_states_id_fk" FOREIGN KEY ("to_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;