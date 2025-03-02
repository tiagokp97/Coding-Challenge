ALTER TABLE "conversations" RENAME COLUMN "agent_id" TO "agentId";--> statement-breakpoint
ALTER TABLE "edges" RENAME COLUMN "agent_id" TO "agentId";--> statement-breakpoint
ALTER TABLE "states" RENAME COLUMN "agent_id" TO "agentId";--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_agent_id_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;