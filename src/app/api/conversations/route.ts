import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { conversations } from "@/db/schema";
import { and, eq, gte, lte, like, desc, asc} from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = Number(url.searchParams.get("agentId"));
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const keyword = url.searchParams.get("keyword");
  const sortOrder = url.searchParams.get("sort") === "desc" ? desc : asc;

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID not found" }, { status: 400 });
  }

  const openConversations = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.agentId, agentId),
        eq(conversations.closed, false)
      )
    )
    .orderBy(sortOrder(conversations.createdAt));

  if (openConversations.length > 0) {
    return NextResponse.json(openConversations);
  }

  const conditions = [eq(conversations.agentId, agentId)];

  if (startDate) conditions.push(gte(conversations.createdAt, startDate));
  if (endDate) conditions.push(lte(conversations.createdAt, endDate));
  if (keyword) conditions.push(like(conversations.messages, `%${keyword}%`));

  const history = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(sortOrder(conversations.createdAt));

  return NextResponse.json(history);
}


export async function POST(request: Request) {
  const { agentId, messages } = await request.json();

  if (!agentId || !messages) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
 const existingConversations = await db
  .select()
  .from(conversations)
  .where(
    and(
      eq(conversations.agentId, agentId),
      eq(conversations.closed, false)
    )
  );

    if (existingConversations.length > 0) {
      const conversation = existingConversations[0];
      const updatedMessages = [
  ...(Array.isArray(conversation.messages) ? conversation.messages : []),
  ...messages
];

      await db
        .update(conversations)
        .set({ messages: updatedMessages })
        .where(eq(conversations.id, conversation.id))
        .execute();

      return NextResponse.json({ success: true, conversationId: conversation.id });
    } else {
      const [newConversation] = await db
        .insert(conversations)
        .values({ agentId, messages, closed: false })
        .returning({ id: conversations.id });

      return NextResponse.json({ success: true, conversationId: newConversation.id });
    }
  } catch (error) {
    console.error("Error saving conversation:", error);
    return NextResponse.json({ error: "Error saving conversation" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const conversationId = Number(url.searchParams.get("conversationId"));

  if (!conversationId) {
    return NextResponse.json(
      { error: "Conversation ID is needed" },
      { status: 400 }
    );
  }

  try {
    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId))
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Error deleting conversation" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId not found" }, { status: 400 });
  }

  try {
    await db.update(conversations).set({
      closed: true,
      endedAt: new Date().toISOString()
    })
    .where(eq(conversations.id, Number(conversationId)))
    .execute();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating conversation:", err);
    return NextResponse.json({ error: "Error updating conversation" }, { status: 500 });
  }
}