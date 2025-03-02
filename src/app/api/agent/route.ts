import { NextResponse } from "next/server";
import { agents, states  } from "@/db/schema";
import { db } from "@/db/drizzle";

 

export async function POST(request: Request) {
  try {
    const { name, globalPrompt } = await request.json();

    if (!name || !globalPrompt) {
      return NextResponse.json({ error: "Name or prompt not found." }, { status: 400 });
    }


    const [createdAgent] = await db
      .insert(agents)
      .values({ name, globalPrompt })
      .returning();

    if (!createdAgent?.id) {
      return NextResponse.json({ error: "Error creating agent." }, { status: 500 });
    }


    const [initialState] = await db
      .insert(states)
      .values({
        agentId: createdAgent.id,
        name: "State 1",
        prompt: "How can i help you?",
        isStart: true,
        isEnd: false,
        position: JSON.stringify({ x: 200, y: 200 }), 
      })
      .returning();

    if (!initialState?.id) {
      return NextResponse.json({ error: "Erro ao criar estado inicial." }, { status: 500 });
    }


    return NextResponse.json({ success: true, createdAgent, initialState });
  } catch (error) {
    console.error("Erro ao criar agente e estado inicial:", error);
    return NextResponse.json({ error: "Erro ao processar requisição." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allAgents = await db.select().from(agents);
    return NextResponse.json(allAgents);
  } catch (error) {
    console.error("Erro ao buscar agentes:", error);
    return NextResponse.json({ error: "Erro ao buscar agentes" }, { status: 500 });
  }
}