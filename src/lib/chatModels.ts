

export enum ChatModels {
  GPT_3_5 = "gpt-3.5-turbo",
  GPT_4 = "gpt-4",
  GPT_4_MINI = "gpt-4o-mini",
  GPT_4o = 'gpt-4o'

}

export const DEFAULT_CHAT_MODEL = ChatModels.GPT_3_5;


export function getChatModel(model?: string): ChatModels {
  if (!model) return DEFAULT_CHAT_MODEL;
  const validModels = Object.values(ChatModels);
  return validModels.includes(model as ChatModels) ? (model as ChatModels) : DEFAULT_CHAT_MODEL;
}
