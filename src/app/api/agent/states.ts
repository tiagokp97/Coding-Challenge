import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { states } from "@/db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = Number(url.searchParams.get("agentId"));

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID é obrigatório" }, { status: 400 });
  }

  const agentStates = await db.select().from(states).where(eq(states.agentId, agentId));

  return NextResponse.json(agentStates);
}
