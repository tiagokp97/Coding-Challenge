import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { states, edges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId is need" }, { status: 400 });
  }

  try {
    const agentIdNumber = Number(agentId);
    if (isNaN(agentIdNumber)) {
      return NextResponse.json({ error: "agentId invalid" }, { status: 400 });
    }

    const agentStates = await db
      .select()
      .from(states)
      .where(eq(states.agentId, agentIdNumber));

    const agentTransitions = await db
      .select()
      .from(edges)
      .where(eq(edges.agentId, agentIdNumber));

    const transitionsMap = new Map<number, any[]>();

    agentTransitions.forEach((transition) => {
      if (transition.fromStateId === transition.toStateId) return;

      if (!transitionsMap.has(transition.fromStateId)) {
        transitionsMap.set(transition.fromStateId, []);
      }
      const transitionsArray = transitionsMap.get(transition.fromStateId);
      
      const targetState = agentStates.find((s) => s.id === transition.toStateId);
      
      const alreadyExists = transitionsArray.some(
        (t: any) =>
          t.condition === transition.condition &&
          t.nextState === transition.toStateId
      );
      if (!alreadyExists) {
        transitionsArray.push({
          condition: transition.condition,
          nextState: transition.toStateId,
          name: targetState ? targetState.name : "Unknown",
        });
      }
    });

    const statesWithTransitions = agentStates.map((state) => ({
      ...state,
      transitions: transitionsMap.get(state.id) || [],
    }));

    return NextResponse.json(statesWithTransitions);
  } catch (error) {
    console.error("Error getting data:", error);
    return NextResponse.json({ error: "error getting data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newState = await request.json();

    console.log("newState", newState);

    if (!newState.name || !newState.position) {
      return NextResponse.json({ error: "Ivalid name or position" }, { status: 400 });
    }

    if (!newState.agentId) {
      console.error("Erro: agentId is missing", newState);
      return NextResponse.json({ error: "agentId is needed" }, { status: 400 });
    }


    const [savedState] = await db.insert(states).values(newState).returning();


    if (newState.transitions && newState.transitions.length > 0) {
      const toStateIds = newState.transitions.map((t: any) => t.nextState);


      const targetStates = await db
        .select({ id: states.id, name: states.name })
        .from(states)
        .where(Array(states.id, toStateIds));

 
      const stateNameMap = Object.fromEntries(
        targetStates.map((s) => [s.id, s.name])
      );

      const edgesToInsert = newState.transitions.map((transition: any) => ({
        agentId: newState.agentId,
        fromStateId: savedState.id,
        toStateId: transition.nextState,
        condition: transition.condition,
        name: stateNameMap[transition.nextState] || "Unknown", 
      }));


      await db.insert(edges).values(edgesToInsert).execute();
    }

    return NextResponse.json({ success: true, savedState });
  } catch (error) {
    console.error("Erro salving state:", error);
    return NextResponse.json({ error: "Erro salving state." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get("stateId");

    if (!stateId) {
      return NextResponse.json({ error: "stateId is needed" }, { status: 400 });
    }

    const id = Number(stateId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "stateId invalid" }, { status: 400 });
    }

    await db.delete(edges).where(eq(edges.fromStateId, id)).execute();
    await db.delete(edges).where(eq(edges.toStateId, id)).execute();

    const deletedState = await db.delete(states).where(eq(states.id, id)).returning();

    if (!deletedState.length) {
      return NextResponse.json({ error: "Estado not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "State deleted successful" });
  } catch (error) {
    console.error("Error deleting state:", error);
    return NextResponse.json({ error: "Error deleting state" }, { status: 500 });
  }
}
