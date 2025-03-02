ALTER TABLE "conversations" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closed" boolean DEFAULT false NOT NULL;