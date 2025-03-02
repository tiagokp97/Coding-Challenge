import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

export interface AgentState {
  id: number;
  agentId: number;
  name: string;
  prompt: string;
  transitions: { condition: string; nextState?: number; name: string }[];
  isStart: boolean;
  isEnd: boolean;
  position: { x: number; y: number };

}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  condition?: string
}

interface AgentStateStore {
  states: AgentState[];
  savedStates: AgentState[];
  edges: Edge[];
  agents: { id: number; name: string; globalPrompt: string; createdAt: string }[];
}

const initialState: AgentStateStore = {
  states: [],
  edges: [],
  savedStates: [],
  agents: [],
};

const mapEdges = (states: AgentState[]): Edge[] => {
  return states.flatMap((state) =>
    (state.transitions ?? []).map((transition) => ({
      id: `edge-${state.id}-${transition.nextState}`,
      source: state.id.toString(),
      target: transition.nextState.toString(),
      label: transition.condition,
    }))
  );
};

export const fetchAgents = createAsyncThunk("agents/fetchAgents", async (_, { rejectWithValue }) => {
  try {
    const response = await fetch("/api/agent");
    if (!response.ok) throw new Error("Erro ao buscar agentes");
    return await response.json();
  } catch (error) {
    return rejectWithValue({ message: error.message });
  }
});

export const fetchAgentStates = createAsyncThunk(
  "agents/fetchAgentStates",
  async (agentId: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agent/states?agentId=${agentId}`);
      if (!response.ok) throw new Error("Erro ao buscar estados");
       const data = await response.json();

      return data
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const addAgentStateAsync = createAsyncThunk(
  "agents/addAgentState",
  async ({ agentId, newState }: { agentId: number; newState: Omit<AgentState, "id" | "agentId"> }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/agent/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, ...newState }),
      });
      if (!response.ok) throw new Error("Erro ao salvar estado");
      const data = await response.json();
      return data.savedState;
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const updateAgentState = createAsyncThunk<
  { selectedAgentId: number | null; id: number; update: Partial<AgentState> },
  { selectedAgentId: number | null; id: number; update: Partial<AgentState> }
>(
  "agents/updateAgentState",
  async ({ id, update, selectedAgentId }, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/agent/states/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAgentId, stateId: id, ...update }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar estado");
      return { id, update };
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const updateAgent = createAsyncThunk(
  "agents/updateAgent",
  async (
    { id, updatedInfo, selectedAgentId }: { id: number; selectedAgentId: number | null; updatedInfo: { name: string; globalPrompt: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/agent/states/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id,selectedAgentId, ...updatedInfo }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar agente");
      return await response.json();
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);

export const deleteAgentStateAsync = createAsyncThunk(
  "agents/",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/agent/states?stateId=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir o estado");

      return id; 
    } catch (error) {
      return rejectWithValue({ message: error.message });
    }
  }
);


const agentSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {
    addAgentState: (state, action: PayloadAction<AgentState>) => {
      state.states.push(action.payload);
      state.edges = mapEdges(state.states);
    },
   removeAgentState: (state, action: PayloadAction<number>) => {
  state.states = state.states.filter((s) => s.id !== action.payload);

  state.states = state.states.map((s) => ({
    ...s,
    transitions: s.transitions ? s.transitions.filter((t) => t.nextState !== action.payload) : [],
  }));

  state.edges = mapEdges(state.states);
},
    addEdge: (state, action: PayloadAction<{ source: number; target: number }>) => {
      const sourceState = state.states.find((s) => s.id === action.payload.source);
      if (sourceState) {
        sourceState.transitions.push({ condition: "default", nextState: action.payload.target });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentStates.fulfilled, (state, action) => {

        state.states = action.payload.map((state) => ({
          ...state,
          transitions: state.transitions.map((t) => ({
            ...t,
            name: t.name || "Unknown", 
          })),
        }));

        state.edges = mapEdges(state.states);
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.agents = action.payload;
      })
      .addCase(addAgentStateAsync.fulfilled, (state, action) => {
        state.states.push(action.payload);
      })
        .addCase(updateAgentState.fulfilled, (state, action) => {
        const { id, update } = action.payload;
        const updatedState = state.states.find((s) => s.id === id);
        if (!updatedState) return;

        if (update.isStart === true) {
          state.states.forEach((s) => {
            if (s.agentId === updatedState.agentId && s.id !== updatedState.id) {
              s.isStart = false;
            }
          });
        }

        if (update.isEnd === true) {
          state.states.forEach((s) => {
            if (s.agentId === updatedState.agentId && s.id !== updatedState.id) {
              s.isEnd = false;
            }
          });
        }

        if (update.transitions) {
          const stateMap = Object.fromEntries(state.states.map((s) => [s.id, s.name]));
          updatedState.transitions = update.transitions.map((t) => ({
            ...t,
            name: stateMap[t.nextState] || "Unknown", 
          }));
        }

        Object.assign(updatedState, update);
      })
      .addCase(updateAgent.fulfilled, (state, action) => {
        const updatedAgent = action.payload;
        const index = state.agents.findIndex((agent) => agent.id === updatedAgent.id);
        if (index !== -1) {
          state.agents[index] = updatedAgent;
        }
      })
      .addCase(deleteAgentStateAsync.fulfilled, (state, action) => {
        const id = action.payload;
        state.states = state.states.filter((s) => s.id !== id);

        state.states = state.states.map((s) => ({
          ...s,
          transitions: s.transitions ? s.transitions.filter((t) => t.nextState !== id) : [],
        }));

        state.edges = mapEdges(state.states);
      })
  },
});

export const { addAgentState, removeAgentState, addEdge } = agentSlice.actions;
export default agentSlice.reducer;
