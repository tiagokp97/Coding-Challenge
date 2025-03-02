import { pgTable, serial, text, timestamp, boolean, integer, jsonb  } from "drizzle-orm/pg-core";



export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").notNull(), 
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  messages: jsonb("messages").notNull(), 
  endedAt: timestamp("ended_at", { mode: "string" }),
  closed: boolean("closed").default(false).notNull(), 
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), 
  globalPrompt: text("global_prompt").notNull(), 
  model: text("model").default("gpt-3.5-turbo"),
  createdAt: timestamp("created_at", { mode: "string" })
    .defaultNow()
    .notNull(),
});

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId")
    .notNull()
    .references(() => agents.id), 
  name: text("name").notNull(),
  prompt: text("prompt").notNull(), 
  isStart: boolean("is_start").default(false).notNull(), 
  isEnd: boolean("is_end").default(false).notNull(), 
  position: jsonb("position").default({ x: 0, y: 0 }).notNull(), 
   tools: jsonb("tools"),
});


export const edges = pgTable("edges", {
  id: serial("id").primaryKey(),
  name: text("name"), 
  agentId: integer("agentId")
    .notNull()
    .references(() => agents.id), 
  fromStateId: integer("from_state_id")
    .notNull()
    .references(() => states.id), 
  toStateId: integer("to_state_id")
    .notNull()
    .references(() => states.id),
  condition: text("condition").notNull(), 
});
