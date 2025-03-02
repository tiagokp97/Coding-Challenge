ALTER TABLE "states" RENAME TO "statesss";--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_from_state_id_states_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_to_state_id_states_id_fk";
--> statement-breakpoint
ALTER TABLE "statesss" DROP CONSTRAINT "states_agentId_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_state_id_statesss_id_fk" FOREIGN KEY ("from_state_id") REFERENCES "public"."statesss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_state_id_statesss_id_fk" FOREIGN KEY ("to_state_id") REFERENCES "public"."statesss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statesss" ADD CONSTRAINT "statesss_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;