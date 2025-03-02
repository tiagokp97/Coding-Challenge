import { useState, useCallback } from 'react';
import {  AgentState } from "@/app/types/StateCanvasTypes";


export default function useAgentStates(initialStates: AgentState[]) {
  const [states, setStates] = useState<AgentState[]>(initialStates);

  const addState = useCallback(() => {
    const newId = states.length ? Math.max(...states.map(s => s.id)) + 1 : 1;
    const newState: AgentState = {
      id: newId,
      name: `State ${newId}`,
      prompt: '',
      transitions: [],
      isStart: false,
      isEnd: false,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
    };
    setStates(prev => [...prev, newState]);
  }, [states]);

  const updateState = useCallback((id: number, update: Partial<AgentState>) => {
    setStates(prev => prev.map(state => (state.id === id ? { ...state, ...update } : state)));
  }, []);

  const removeState = useCallback((id: number) => {
    setStates(prev => prev.filter(state => state.id !== id));
  }, []);

  return { states, addState, updateState, removeState, setStates };
}
