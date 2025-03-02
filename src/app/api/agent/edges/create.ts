import { NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { edges } from "@/db/schema"

export async function POST(request: Request) {
  const { agentId, fromStateId, toStateId, condition } = await request.json()

  if (!agentId || !fromStateId || !toStateId) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 })
  }

  try {
    await db.insert(edges).values({ agentId, fromStateId, toStateId, condition })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating transition:", error)
    return NextResponse.json({ error: "Error creating transition" }, { status: 500 })
  }
}
