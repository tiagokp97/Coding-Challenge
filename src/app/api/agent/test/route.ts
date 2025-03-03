import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { agents, states, edges, conversations } from "@/db/schema";
import { getTool } from "@/app/utils/toolRegistry"; 
import { getChatCompletion } from "@/lib/chatCompletion";
import { getChatModel } from "@/lib/chatModels";
import { interpretStateChangeIntent } from "@/app/utils/interpretStateChangeIntent";

function shouldCloseConversation(userMessage: string, currentState: any): boolean {
  const farewellWords = ["tchau", "bye", "goodbye", "finish", "encerrar"];
  const normalizedMessage = userMessage.trim().toLowerCase();



  return currentState.isEnd || farewellWords.some(word => normalizedMessage.includes(word));
}


function handleEndStateIfNeeded(conversation: any, nextState: any) {
  if (!nextState.isEnd) {

    return conversation;
  }

  
  const farewellMessage = "Ok, end of conversation. See you later!";
  const updatedMessages = [
    ...conversation.messages,
    { role: "bot", text: farewellMessage }
  ];

  return {
    ...conversation,
    messages: updatedMessages,
    closed: true,
    endedAt: new Date().toISOString()
  };
}

async function processAIResponse(chosenModel: string, messages: any[]) {
  const response = await getChatCompletion({ model: chosenModel, messages });
  const aiContent: string = response.choices[0].message.content ?? "";

  let aiResponse: { text: string; action?: { toolName: string; params: any } } = { text: aiContent };

  try {
    const parsed = JSON.parse(aiContent);
    aiResponse = {
      text: typeof parsed.text === "string" ? parsed.text : aiContent,
      action: parsed.action ?? undefined,
    };
  } catch (error) {
    aiResponse = { text: aiContent };
  }

  if (aiResponse.action) {
    const tool = getTool(aiResponse.action.toolName);
    if (tool) {
      try {
        const result = await tool.execute(aiResponse.action.params);
        aiResponse.text += `\nResultado da ferramenta: ${JSON.stringify(result)}`;
      } catch (toolError) {
        console.error("Erro ao executar a ferramenta:", toolError);
        aiResponse.text += "\nErro ao executar a ferramenta.";
      }
    } else {
      aiResponse.text += "\nFerramenta não encontrada.";
    }
  }

  return aiResponse;
}

async function determineNextStateFromEdges(
  stateId: number,
  normalizedMessage: string,
  nluResult: { changeState: boolean; value?: string | null | undefined},
  currentState: any
) {
  const edgesFromState = await db.select().from(edges).where(eq(edges.fromStateId, stateId));
  
  let nextState = currentState;
  let transitionFound = false;

  if (edgesFromState.length > 0 && nluResult.changeState && nluResult.value) {
    const expectedValue = nluResult.value.trim().toLowerCase();

    const explicitEdges = edgesFromState.filter(
      (edge) => edge.condition.trim().toLowerCase() !== "default"
    );
    const defaultEdges = edgesFromState.filter(
      (edge) => edge.condition.trim().toLowerCase() === "default"
    );

    for (const edge of explicitEdges) {
      const condition = edge.condition.trim().toLowerCase();
      if (condition === expectedValue) {
        const [newState] = await db.select().from(states).where(eq(states.id, edge.toStateId));
        if (newState) {
          nextState = newState;
          transitionFound = true;
          break;
        }
      }
    }

    if (!transitionFound) {
      for (const edge of defaultEdges) {
        if (normalizedMessage.includes(expectedValue)) {
          const [newState] = await db.select().from(states).where(eq(states.id, edge.toStateId));
          if (newState) {
            nextState = newState;
            transitionFound = true;
            break;
          }
        }
      }
    }
  } 

 

  return nextState;
}


export async function POST(request: Request) {
  try {
    const { agentId, userMessage, stateId, model } = await request.json();
    const chosenModel = getChatModel(model);

    const agentResult = await db.select().from(agents).where(eq(agents.id, agentId));
    const stateResult = await db.select().from(states).where(eq(states.id, stateId));
    
    const agent = agentResult.length > 0 ? agentResult[0] : null;
    const currentState = stateResult.length > 0 ? stateResult[0] : null;

    if (!agent || !currentState) {
      return NextResponse.json({ error: "Agent or state not found" }, { status: 404 });
    }

    if (currentState.isEnd) {
      return await handleEndState(agentId, userMessage);
    }

    const normalizedMessage = userMessage.trim().toLowerCase();
    const messages = [
      { role: "system", content: agent.globalPrompt },
      { role: "assistant", content: currentState.prompt },
      { role: "user", content: userMessage },
    ];

    const aiResponse = await processAIResponse(chosenModel, messages);
    const nluResult = await interpretStateChangeIntent(userMessage, currentState.prompt, chosenModel);
    
    const nextState = await determineNextStateFromEdges(
      stateId,
      normalizedMessage,
      nluResult,
      currentState
    );
    
    const expectedValue: string | undefined = nluResult.value ?? undefined;

    return await updateOrCreateConversation(
      agentId,
      userMessage,
      aiResponse.text,
      currentState,
      nextState
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Error processing message" }, { status: 500 });
  }
}


async function handleEndState(agentId: number, userMessage: string) {
  const existingConversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId));

  const farewellMsg = "End of conversation! Thank you.";

  if (existingConversation.length > 0) {
    const conversation = existingConversation[0];
    const updatedMessages = [
  ...(Array.isArray(conversation.messages) ? conversation.messages : []),
  { role: "user", text: userMessage },
  { role: "bot", text: farewellMsg },
];

    await db
      .update(conversations)
      .set({
        messages: updatedMessages,
        closed: true,
        endedAt: new Date().toISOString(),
      })
      .where(eq(conversations.id, conversation.id));

    return NextResponse.json({
      conversationId: conversation.id,
      responses: [{ role: "bot", text: farewellMsg }],
      nextStateId: null,
      nextStateName: null,
      closed: true,
    });
  } else {
    const [insertedConversation] = await db
      .insert(conversations)
      .values({
        agentId,
        messages: [
          { role: "user", text: userMessage },
          { role: "bot", text: farewellMsg },
        ],
        closed: true,
        endedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      conversationId: insertedConversation.id,
      responses: [{ role: "bot", text: farewellMsg }],
      nextStateId: null,
      nextStateName: null,
      closed: true,
    });
  }
}

async function updateOrCreateConversation(
  agentId: number,
  userMessage: string,
  botResponse: string,
  currentState: any,
  nextState: any
) {
  const existingConversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId));

  let conversation;
  let conversationClosed = shouldCloseConversation(userMessage, currentState);

  if (existingConversation.length > 0) {
    conversation = existingConversation[0];


    const updatedMessages = [
  ...(Array.isArray(conversation.messages) ? conversation.messages : []),
  { role: "user", text: userMessage },
  { role: "bot", text: botResponse },
];


    await db
      .update(conversations)
      .set({
        messages: updatedMessages,
        closed: conversationClosed,
        endedAt: conversationClosed ? new Date().toISOString() : conversation.endedAt,
      })
      .where(eq(conversations.id, conversation.id));
  } else {
    const [insertedConversation] = await db
      .insert(conversations)
      .values({
        agentId,
        messages: [
          { role: "user", text: userMessage },
          { role: "bot", text: botResponse },
        ],
        closed: conversationClosed,
        endedAt: conversationClosed ? new Date().toISOString() : null,
      })
      .returning({ id: conversations.id });

    conversation = insertedConversation;
  }

  return NextResponse.json({
    conversationId: conversation.id,
    responses: [
      { role: "bot", text: botResponse },
      { role: "bot", text: `State: ${currentState?.name}` },
    ],
    nextStateId: conversationClosed ? null : nextState.id,
    nextStateName: conversationClosed ? null : nextState.name,
    closed: conversationClosed,
  });
}
