import { Tool } from "@/app/types/Tool";

const toolRegistry: Record<string, Tool> = {};

export const registerTool = (tool: Tool) => {
  toolRegistry[tool.name] = tool;
};

export const getTool = (toolName: string): Tool | undefined => {
  return toolRegistry[toolName];
};

registerTool({
  name: "getWeather",
  description: "Get city weather",
  execute: async (params) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const { city } = params;
    const url = `${baseUrl}/api/weather?city=${encodeURIComponent(city)}`;
const response = await fetch(url);
    if (!response.ok) throw new Error("Error getting weather");
    return await response.json();
  },
});
