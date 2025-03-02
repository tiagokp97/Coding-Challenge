export interface Transition {
  condition: string;
  nextState: number;
}

export interface AgentState {
  id: number;
  name: string;
  prompt: string;
  transitions: Transition[];
  isStart: boolean;
  isEnd: boolean;
  position: { x: number; y: number };
  condition?: string;
}

export interface Message {
  role: "user" | "bot";
  text: string;
}
