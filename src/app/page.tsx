'use client'
import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, { Background, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { updateAgentState } from "@/store/agentSlice";
import ChatPanel from "@/app/components/ChatPanel"
import StateManagementPanel from "./components/StateManagementPanel";
import { Message } from "@/app/types/StateCanvasTypes";
import CustomNode from "./components/CustomNode";
import { toast } from "sonner"


const StateCanvas: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const allStates = useSelector((state: RootState) => state.agents.states);

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const filteredStates = useMemo(() => {
    return selectedAgentId
      ? allStates.filter((s) => s.agentId === selectedAgentId)
      : [];
  }, [allStates, selectedAgentId]);

  const [edges, setEdges] = useState<Edge[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testModeActive, setTestModeActive] = useState<boolean>(false);
  const [activeStateId, setActiveStateId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [connectingStateId, setConnectingStateId] = useState<number | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  useEffect(() => {
    setActiveStateId(null);
    setSelectedStateId(null);
    setChatMessages([]);
    setEdges([]);
  }, [selectedAgentId]);

  const computedEdges = useMemo(() => {
    const edgeMap = new Map<string, Edge>();
    filteredStates.forEach((state) => {
      (state.transitions ?? []).forEach((transition) => {
        const edgeId = `${state.id}-${transition.nextState}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: state.id.toString(),
            target: transition.nextState.toString(),
            animated: false,
          });
        }
      });
    });
    const edgesArr = Array.from(edgeMap.values());
    if (testModeActive && activeStateId) {
      return edgesArr.map((edge) =>
        edge.source === activeStateId.toString()
          ? { ...edge, animated: true, style: { stroke: "#FF5733", strokeWidth: 3 } }
          : edge
      );
    }
    return edgesArr;
  }, [filteredStates, testModeActive, activeStateId]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      const nodeId = parseInt(node.id);
      if (connectingStateId !== null && connectingStateId !== nodeId) {
        const sourceState = filteredStates.find((s) => s.id === connectingStateId);
        if (sourceState) {
          const updatedTransitions = [
            ...(sourceState.transitions ?? []),
            { condition: "default", nextState: nodeId },
          ];
          dispatch(
            updateAgentState({ id: connectingStateId, update: { transitions: updatedTransitions } })
          );
        }
        setConnectingStateId(null);
      } else {
        setSelectedStateId(nodeId);
      }
    },
    [connectingStateId, dispatch, filteredStates]
  );

  const handleStartConnection = useCallback(() => {
    if (selectedStateId) {
      setConnectingStateId(selectedStateId);
      setSelectedStateId(null);
    }
  }, [selectedStateId]);

  const startTestMode = useCallback(() => {
    const initialState = filteredStates.find((state) => state.isStart);
    if (!initialState) {
      toast("Configure um estado inicial antes de iniciar o teste.");
      return;
    }
    setActiveStateId(initialState.id);
    setTestModeActive(true);
    setChatMessages([]);
  }, [filteredStates]);

  const stopTestMode = useCallback(() => {
    setTestModeActive(false);
    setActiveStateId(null);
    setChatMessages([]);
  }, []);


  const saveConversation = async (agentId: number, messages: Message[]) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, messages }),
      });
      if (!response.ok) {
        console.error("Erro ao salvar conversa");
      } else {
        const data = await response.json();
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor para salvar conversa:", error);
    }
  };

  const handleConnect = useCallback(
    (connection: Edge) => {
      const { source, target } = connection;
      if (!source || !target) return;

      const sourceId = parseInt(source);
      const targetId = parseInt(target);

      const sourceState = filteredStates.find((s) => s.id === sourceId);
      const targetState = filteredStates.find((s) => s.id === targetId);

      if (sourceState && targetState) {
        const transitionExists = sourceState.transitions?.some(
          (t) => t.nextState === targetId
        );

        if (!transitionExists) {
          const updatedTransitions = [
            ...(sourceState.transitions ?? []),
            {
              condition: "default",
              nextState: targetId,
              name: targetState.name
            },
          ];

          dispatch(
            updateAgentState({
              selectedAgentId,
              id: sourceId,
              update: { transitions: updatedTransitions },
            })
          );
        }
      }
    },
    [dispatch, filteredStates, selectedAgentId]
  );

  const handleNodeDragStop = useCallback((_: any, node: any) => {
    const id = parseInt(node.id);
    dispatch(updateAgentState({ id, update: { position: { x: node.position.x, y: node.position.y } } }));
  }, [dispatch]);

  const addMessage = useCallback((msg: Message) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);



  const handleResetChat = (convId: number) => {
    setChatMessages([]);
    setCurrentConversationId(null);

    const initialState = filteredStates.find((state) => state.isStart);
    if (initialState) {
      setActiveStateId(initialState.id);
    } else {
      setActiveStateId(null);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg: Message = { role: "user", text: chatInput };
    addMessage(userMsg);
    setChatInput("");
    setIsLoading(true);
    if (activeStateId !== null) {
      try {
        const response = await fetch("/api/agent/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: selectedAgentId,
            stateId: activeStateId,
            userMessage: userMsg.text,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.conversationId) {
            setCurrentConversationId(data.conversationId);
          }
          data.responses.forEach((resp: any) => {
            addMessage({ role: "bot", text: resp.text });
          });
          if (data.nextStateId) {
            setActiveStateId(data.nextStateId);
          }
        } else {
          addMessage({ role: "bot", text: "Erro ao processar sua solicitação." });
        }
      } catch (error) {
        console.error("Erro ao conectar com a API de teste:", error);
        addMessage({ role: "bot", text: "Erro ao conectar com o servidor." });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(false);
  }, [chatInput, isLoading, testModeActive, activeStateId, addMessage, selectedAgentId, currentConversationId]);
  return (
    <div className="h-screen w-screen grid grid-cols-[1fr_auto] grid-rows-[1fr_auto]">
      <div className="col-span-1 row-span-1 relative">
        <ReactFlow
          nodes={filteredStates.map((state) => ({
            id: state.id.toString(),
            data: { id: state.id, name: state.name, isStart: state.isStart, isEnd: state.isEnd, active: state.id === activeStateId },
            position: state.position,
            selected: selectedStateId === state.id,
            type: "custom",
          }))}
          edges={computedEdges}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={{ custom: CustomNode }}
        >
          <Background />
        </ReactFlow>
      </div>
      <div className="w-[350px] bg-white shadow-lg border-l border-gray-300 p-4 max-h-screen overflow-y-auto">
        <ChatPanel
          messages={chatMessages}
          chatInput={chatInput}
          onInputChange={setChatInput}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedAgentId={selectedAgentId}
          testModeActive={testModeActive}
          activeStateId={activeStateId}
          handleResetChat={handleResetChat}
          currentConversationId={currentConversationId}
          setCurrentConversationId={setCurrentConversationId}
        />
      </div>
      <div className="col-span-2 flex justify-center fixed bottom-4 left-0 right-0 pointer-events-none">
        <div className="w-[450px] bg-white border border-gray-300 p-4 shadow-md rounded-lg pointer-events-auto">
          <StateManagementPanel
            selectedStateId={selectedStateId}
            setSelectedStateId={setSelectedStateId}
            onUpdateState={(id, update) => dispatch(updateAgentState({ id, update }))}
            onStartTestMode={startTestMode}
            onStopTestMode={stopTestMode}
            testModeActive={testModeActive}
            activeStateId={activeStateId}
            selectedAgentId={selectedAgentId}
            setSelectedAgentId={setSelectedAgentId}
          />
        </div>
      </div>
    </div>
  );
};

export default StateCanvas;
