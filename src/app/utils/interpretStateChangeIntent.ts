import { getChatCompletion } from "@/lib/chatCompletion";
import { getChatModel } from "@/lib/chatModels";

/**
 * This function interprets whether the user wants to transition to a new state.
 * It returns a JSON object:
 *  - {"changeState": true, "value": "<keyword>"}
 *    if the user intends to change state and provides a relevant keyword.
 *  - {"changeState": false}
 *    if no state transition is intended.
 */
export async function interpretStateChangeIntent(
  userMessage: string,
  currentPrompt: string,
  model?: string
): Promise<{ changeState: boolean; value?: string | null }> {
  const chosenModel = getChatModel(model);

  const systemPrompt = `
You are a state-transition intent detector.

Context:
1. currentPrompt: "${currentPrompt}"
2. userMessage: "${userMessage}"

Task:
- If user wants to advance to another state, or if the user say
, return:
  {"changeState": true, "value": "<keyword>"}
- If not, return:
  {"changeState": false}

Requirements:
1. Output ONLY valid JSON (no extra text or commentary).
2. No explanations.

Examples:
- If userMessage implies transition "ok", respond:
  {"changeState": true, "value": "ok"}
- Otherwise:
  {"changeState": false}
`.trim();

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  try {
    const response = await getChatCompletion({
      model: chosenModel,
      messages,
      // temperature: 0.7, // or 0 for more deterministic
      // max_tokens: 100,  // Adjust as you see fit
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Error interpreting state-change intent:", error);
    return { changeState: false };
  }
}
