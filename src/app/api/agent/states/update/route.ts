import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db/drizzle"
import { agents, states, edges } from "@/db/schema"

export async function POST(request: Request) {
  const {
    stateId,
    name,
    prompt,
    position,
    transitions,
    selectedAgentId,
    globalPrompt,
    isStart,
    isEnd,
    model
  } = await request.json()

  if (stateId) {
    const id = Number(stateId)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid stateId" }, { status: 400 })
    }

    try {
      const updateFields: Record<string, any> = {}

      if (name) updateFields.name = name
      if (prompt) updateFields.prompt = prompt
      if (position) updateFields.position = position
      if (model) updateFields.model = model

      if (typeof isStart !== "undefined") {
        if (isStart === true) {
          await db
            .update(states)
            .set({ isStart: false })
            .where(eq(states.agentId, selectedAgentId))
            .execute()
          updateFields.isStart = true
        } else {
          updateFields.isStart = false
        }
      }

      if (typeof isEnd !== "undefined") {
        if (isEnd === true) {
          await db
            .update(states)
            .set({ isEnd: false })
            .where(eq(states.agentId, selectedAgentId))
            .execute()
          updateFields.isEnd = true
        } else {
          updateFields.isEnd = false
        }
      }

      if (Object.keys(updateFields).length > 0) {
        await db
          .update(states)
          .set(updateFields)
          .where(eq(states.id, id))
          .execute()
      }

      if (transitions) {
        await db.delete(edges).where(eq(edges.fromStateId, id)).execute()
        if (transitions.length > 0) {
          const edgesToInsert = transitions.map((t: any) => ({
            fromStateId: id,
            toStateId: t.nextState,
            condition: t.condition,
            agentId: selectedAgentId
          }))
          await db.insert(edges).values(edgesToInsert).execute()
        }
      }

      return NextResponse.json({ success: "ok" })
    } catch (error: any) {
      console.error("Error updating state:", error)
      return NextResponse.json({ error: "Error updating state" }, { status: 500 })
    }

  } else {
    if (!selectedAgentId) {
      return NextResponse.json({ error: "selectedAgentId is required" }, { status: 400 })
    }

    try {
      const updateFields: Record<string, any> = {}
      if (name) updateFields.name = name
      if (globalPrompt) updateFields.globalPrompt = globalPrompt
      if (model) updateFields.model = model

      if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({ error: "No fields provided" }, { status: 400 })
      }

      const [updatedAgent] = await db
        .update(agents)
        .set(updateFields)
        .where(eq(agents.id, selectedAgentId))
        .returning()

      if (!updatedAgent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }

      return NextResponse.json(updatedAgent)
    } catch (error: any) {
      console.error("Error updating agent:", error)
      return NextResponse.json({ error: "Error updating agent" }, { status: 500 })
    }
  }
}
