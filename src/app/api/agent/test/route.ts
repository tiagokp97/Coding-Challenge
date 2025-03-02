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
  const aiContent = response.choices[0].message.content;
  let aiResponse: { text?: string; action?: { toolName: string; params: any } } = { text: aiContent };

  try {
  const parsed = JSON.parse(aiContent);
  aiResponse = {
    text: parsed.text || aiContent,
    action: parsed.action
  };
} catch (error) {
  aiResponse = { text: aiContent };
}

  try {
    aiResponse = JSON.parse(aiContent);
  } catch (error) {
    aiResponse = { text: aiContent };
  }

  if (aiResponse.action) {
    const tool = getTool(aiResponse.action.toolName);
    if (tool) {
      try {
        const result = await tool.execute(aiResponse.action.params);
        aiResponse.text = `${aiResponse.text}\nResultado da ferramenta: ${JSON.stringify(result)}`;
      } catch (toolError) {
        console.error("Erro ao executar a ferramenta:", toolError);
        aiResponse.text = `${aiResponse.text}\nErro ao executar a ferramenta.`;
      }
    } else {
      aiResponse.text = `${aiResponse.text}\nFerramenta não encontrada.`;
    }
  }

  return aiResponse;
}

async function determineNextStateFromEdges(
  stateId: number,
  normalizedMessage: string,
  nluResult: { changeState: boolean; value?: string },
  currentState: any
) {
  const edgesFromState = await db.select().from(edges).where(eq(edges.fromStateId, stateId));
  console.log("edgesFromState", edgesFromState, "stateId", stateId);
  
  let nextState = currentState;
  let transitionFound = false;

  if (edgesFromState.length > 0 && nluResult.changeState && nluResult.value) {
    const expectedValue = nluResult.value.trim().toLowerCase();
    console.log("Expected value from NLU:", expectedValue);

    const explicitEdges = edgesFromState.filter(
      (edge) => edge.condition.trim().toLowerCase() !== "default"
    );
    const defaultEdges = edgesFromState.filter(
      (edge) => edge.condition.trim().toLowerCase() === "default"
    );

    for (const edge of explicitEdges) {
      const condition = edge.condition.trim().toLowerCase();
      console.log("Explicit edge condition:", condition);
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
  } else {
    console.log("Nenhuma transição encontrada a partir do estado atual.");
  }

  if (!transitionFound) {
    console.log("Nenhuma transição válida encontrada.");
  }

  return nextState;
}
export async function POST(request: Request) {
  const { agentId, userMessage, stateId, model } = await request.json();
  const chosenModel = getChatModel(model);

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  const [currentState] = await db.select().from(states).where(eq(states.id, stateId));

  if (!agent || !currentState) {
    return NextResponse.json({ error: "Agente ou estado não encontrado" }, { status: 404 });
  }

  if (currentState.isEnd) {

    const existingConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.agentId, agentId));

    let conversation;
    const farewellMsg = "End of conversation! Thank you";

    if (existingConversation.length > 0) {
      conversation = existingConversation[0];
      const updatedMessages = [
        ...conversation.messages,
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
 
      const insertedConversation = await db
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

      conversation = insertedConversation[0];

      return NextResponse.json({
        conversationId: conversation.id,
        responses: [{ role: "bot", text: farewellMsg }],
        nextStateId: null,
        nextStateName: null,
        closed: true,
      });
    }
  }

 
  const normalizedMessage = userMessage.trim().toLowerCase();
  const messages = [
    { role: "system", content: agent.globalPrompt },
    { role: "assistant", content: currentState.prompt },
    { role: "user", content: userMessage },
  ];

  try {
    const aiResponse = await processAIResponse(chosenModel, messages);
    const nluResult = await interpretStateChangeIntent(userMessage, currentState.prompt, chosenModel);
    const nextState = await determineNextStateFromEdges(stateId, normalizedMessage, nluResult, currentState);
    console.log('aiResponse', aiResponse)
    console.log('nluResult', nluResult)
    console.log('nextState', nextState)

    const existingConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.agentId, agentId));

    let conversation;
    let conversationClosed = shouldCloseConversation(userMessage, currentState);

    if (existingConversation.length > 0) {
      conversation = existingConversation[0];
      const updatedMessages = [
        ...conversation.messages,
        { role: "user", text: userMessage },
        { role: "bot", text: aiResponse.text }
      ];

      await db
        .update(conversations)
        .set({ 
          messages: updatedMessages, 
          closed: conversationClosed, 
          endedAt: conversationClosed ? new Date().toISOString() : conversation.endedAt 
        })
        .where(eq(conversations.id, conversation.id));
    } else {
      const insertedConversation = await db
        .insert(conversations)
        .values({
          agentId,
          messages: [{ role: "user", text: userMessage }, { role: "bot", text: aiResponse.text }],
          closed: conversationClosed,
          endedAt: conversationClosed ? new Date().toISOString() : null,
        })
        .returning({ id: conversations.id });

      conversation = insertedConversation[0];
    }


    const finalNextStateId = conversationClosed ? null : nextState.id;
    const finalNextStateName = conversationClosed ? null : nextState.name;

    return NextResponse.json({
      conversationId: conversation.id,
      responses: [
        { role: "bot", text: aiResponse.text },
        { role: "bot", text: `State: ${currentState?.name}` }
      ],
      nextStateId: finalNextStateId,
      nextStateName: finalNextStateName,
      closed: conversationClosed,
    });
  } catch (error) {
    console.error("Erro ao chamar a API do OpenAI:", error);
    return NextResponse.json({ error: "Erro ao processar a mensagem." }, { status: 500 });
  }
}