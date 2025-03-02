
import { openai } from "@/lib/openai";
import { getChatModel } from "@/lib/chatModels";

interface ChatCompletionParams {
  model?: string; 
  messages: { role: string; content: string }[];
}

/**
 * 
 * @param model 
 * @param messages 
 * @returns 
 */
export async function getChatCompletion({ model, messages }: ChatCompletionParams) {

  const chosenModel = getChatModel(model);

  try {
    const response = await openai.chat.completions.create({
      model: chosenModel,
      messages,
    });
    return response;
  } catch (error) {
    throw new Error(`Erro ao chamar a API do OpenAI: ${error}`);
  }
}
