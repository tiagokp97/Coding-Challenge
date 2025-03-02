ALTER TABLE "statesss" RENAME TO "states";--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_from_state_id_statesss_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" DROP CONSTRAINT "edges_to_state_id_statesss_id_fk";
--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "statesss_agentId_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_state_id_states_id_fk" FOREIGN KEY ("from_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_state_id_states_id_fk" FOREIGN KEY ("to_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_agentId_agents_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;