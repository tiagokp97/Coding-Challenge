import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { states } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { stateId, position } = await request.json();

  if (!stateId || !position) {
    return NextResponse.json({ error: "invalid stated id or position" }, { status: 400 });
  }

  try {
    await db.update(states).set({ position }).where(eq(states.id, stateId));
    return NextResponse.json({ success: 'ok' });
  } catch (error) {
    console.error("Error in state update:", error);
    return NextResponse.json({ error: "error changing position" }, { status: 500 });
  }
}
