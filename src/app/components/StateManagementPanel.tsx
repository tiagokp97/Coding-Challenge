"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner"

import { RootState, AppDispatch } from "@/store/store";
import {
    updateAgentState,
    addAgentStateAsync,
    AgentState,
    fetchAgents,
    fetchAgentStates,
    updateAgent,
    deleteAgentStateAsync,
} from "@/store/agentSlice";

import { debounce } from "lodash";

import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { ChatModels } from "@/lib/chatModels";


interface StateManagementPanelProps {
    onUpdateState: (id: number, update: Partial<AgentState>) => void;
    onRemoveState: (id: number) => void;
    onAddState: () => void;
    onStartTestMode: () => void;
    onStopTestMode: () => void;
    testModeActive: boolean;
    activeStateId: number | null;
    selectedAgentId: number | null;
    selectedStateId: number | null;
    setSelectedStateId: (id: number | null) => void;
    setSelectedAgentId: (id: number | null) => void;
}

const StateManagementPanel: React.FC<StateManagementPanelProps> = ({
    testModeActive,
    activeStateId,
    onStartTestMode,
    onStopTestMode,
    selectedAgentId,
    selectedStateId,
    setSelectedStateId,
    setSelectedAgentId,
}) => {
    const dispatch: AppDispatch = useDispatch();
    const agents = useSelector((state: RootState) => state.agents.agents);
    const states = useSelector((state: RootState) => state.agents.states);
    const [selectedModel, setSelectedModel] = useState(ChatModels.GPT_3_5);


    const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
    const selectedState = states.find((s) => s.id === selectedStateId);
    const [isMinimized, setIsMinimized] = useState(false);


    const [activeTab, setActiveTab] = useState<"agent" | "state">("agent");





    const [agentName, setAgentName] = useState("");
    const [agentGlobalPrompt, setAgentGlobalPrompt] = useState("");

    useEffect(() => {
        if (selectedAgent) {
            setAgentName(selectedAgent.name);
            setAgentGlobalPrompt(selectedAgent.globalPrompt || "");
        }
    }, [selectedAgent]);


    const handleAgentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgentId) return;

        dispatch(
            updateAgent({
                selectedAgentId,
                updatedInfo: {
                    name: agentName,
                    globalPrompt: agentGlobalPrompt,
                    model: selectedModel
                },
            })
        );
    };


    const [localName, setLocalName] = useState("");
    const [localPrompt, setLocalPrompt] = useState("");
    const [localConditions, setLocalConditions] = useState<
        { condition: string; name: string }[]
    >([]);


    const debouncedUpdate = useRef<(id: number, update: Partial<AgentState>) => void>();
    useEffect(() => {
        debouncedUpdate.current = debounce((id: number, update: Partial<AgentState>) => {
            dispatch(updateAgentState({ id, update, selectedAgentId }));
        }, 500);
    }, [dispatch, selectedAgentId]);



    useEffect(() => {
        if (selectedState) {
            setLocalName(selectedState.name);
            setLocalPrompt(selectedState.prompt);
            setLocalConditions(selectedState.transitions || []);
        }
    }, [selectedState]);

    const handleStateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedState || !debouncedUpdate.current) return;

        const newValues = {
            name: localName,
            prompt: localPrompt,
            transitions: localConditions,
        };
        debouncedUpdate.current(selectedState.id, newValues);
    };

    const handleConditionChange = useCallback((index: number, key: "condition" | "name", value: string) => {
        setLocalConditions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [key]: value };
            return updated;
        });
    }, []);

    const handleRemoveCondition = useCallback(
        (index: number) => {
            setLocalConditions((prev) => {
                const updatedConditions = prev.filter((_, i) => i !== index);

                if (selectedState && debouncedUpdate.current) {
                    debouncedUpdate.current(selectedState.id, {
                        transitions: updatedConditions,
                    });
                }

                return updatedConditions;
            });
        },
        [selectedState, debouncedUpdate]
    );



    const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
    const [newAgentName, setNewAgentName] = useState("");
    const [newAgentPrompt, setNewAgentPrompt] = useState("");

    const handleOpenCreateAgentModal = () => {
        setNewAgentName("");
        setNewAgentPrompt("");
        setShowCreateAgentModal(true);
    };

    const handleCreateAgent = async () => {
        if (!newAgentName.trim()) {
            toast("Please, insert a name for the agent.")
            return;
        }
        const newAgent = { name: newAgentName, globalPrompt: newAgentPrompt };
        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAgent),
            });
            if (!response.ok) throw new Error("Error creating agent");
            const createdAgent = await response.json();
            dispatch(fetchAgents());
            setSelectedAgentId(createdAgent.id);
            setShowCreateAgentModal(false);
        } catch (error) {
            console.error("Error creating agent:", error);
        }
    };


    const handleAddState = () => {
        if (!selectedAgentId) {
            console.error("Error: No agentId selected.");
            return;
        }
        const newState: Omit<AgentState, "id"> = {
            agentId: selectedAgentId,
            name: `State ${states.length + 1}`,
            prompt: "",
            transitions: [],
            isStart: false,
            isEnd: false,
            position: {
                x: states.length > 0 ? states[0].position.x : 100,
                y: states.length > 0 ? Math.max(...states.map((s) => s.position.y)) + 140 : 0,
            },
        };
        dispatch(addAgentStateAsync({ agentId: selectedAgentId, newState }))
            .unwrap()
            .catch((error) => console.error("Error adding state:", error));
    };

    const handleRemoveState = (id: number) => {
        dispatch(deleteAgentStateAsync(id));
    };

    useEffect(() => {
        dispatch(fetchAgents());
    }, [dispatch]);

    useEffect(() => {
        if (selectedAgentId) {
            dispatch(fetchAgentStates(selectedAgentId));
        }
    }, [dispatch, selectedAgentId]);

    return (
        <aside className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-800 text-base font-semibold">
                    Agent & State Management
                </h2>
                <Button variant="outline" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? "Expand" : "Minimize"}
                </Button>
            </div>
            {isMinimized ? (
                <p className="text-sm text-gray-500">Panel minimized.</p>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <Select
                            onValueChange={(value) => {
                                setSelectedAgentId(Number(value));
                                setSelectedStateId(null);
                            }}
                            defaultValue={selectedAgentId ? selectedAgentId.toString() : ""}
                        >
                            <SelectTrigger className="w-full max-w-xs">
                                <SelectValue
                                    placeholder={agents.length === 0 ? "Click on create new agent" : "Select an Agent"}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        Click on create new agent
                                    </SelectItem>
                                ) : (
                                    agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id.toString()}>
                                            {agent.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={activeTab === "agent" ? "default" : "outline"}
                            onClick={() => setActiveTab("agent")}
                        >
                            Agent Tab
                        </Button>
                        <Button
                            variant={activeTab === "state" ? "default" : "outline"}
                            onClick={() => setActiveTab("state")}
                        >
                            State Tab
                        </Button>
                    </div>

                    {activeTab === "agent" && (
                        <form onSubmit={handleAgentSubmit}>
                            {selectedAgent && (
                                <>
                                    <div className="mb-4">
                                        <Label className="mb-1 block">Agent Name:</Label>
                                        <Input
                                            placeholder="Agent Name"
                                            value={agentName}
                                            onChange={(e) => setAgentName(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <Label className="mb-1 block">Agent Name:</Label>
                                        <Select
                                            value={selectedModel}
                                            onValueChange={(value) => setSelectedModel(value)}
                                        >
                                            <SelectTrigger className="w-full border rounded px-2 py-1">
                                                <SelectValue placeholder="Select a Model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(ChatModels).map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>


                                    <div className="mb-4">
                                        <Label className="mb-1 block ">Global Prompt:</Label>
                                        <Textarea
                                            className='max-h-50'
                                            placeholder="Global Prompt"
                                            value={agentGlobalPrompt}
                                            onChange={(e) => setAgentGlobalPrompt(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-2">
                                <Button type="submit">
                                    Save Agent
                                </Button>
                                <Button type="button" onClick={handleOpenCreateAgentModal}>
                                    Create New Agent
                                </Button>
                            </div>
                        </form>
                    )}

                    {activeTab === "state" && (
                        <form onSubmit={handleStateSubmit}>
                            {selectedState ? (
                                <>
                                    <div className="mb-4">
                                        <Label className="mb-1 block">State Name:</Label>
                                        <Input
                                            placeholder="State Name"
                                            value={localName}
                                            onChange={(e) => setLocalName(e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <Label className="mb-1 block">State Prompt:</Label>
                                        <Textarea
                                            placeholder="State Prompt"
                                            value={localPrompt}
                                            onChange={(e) => setLocalPrompt(e.target.value)}
                                        />
                                    </div>

                                    {localConditions.map((cond, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <Input
                                                placeholder="Condition"
                                                className="w-1/2"
                                                value={cond.condition}
                                                onChange={(e) =>
                                                    handleConditionChange(index, "condition", e.target.value)
                                                }
                                            />
                                            <p className="py-1 text-sm w-1/3">To reach {cond.name}</p>
                                            <Button
                                                variant="destructive"
                                                type="button"
                                                onClick={() => handleRemoveCondition(index)}
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex items-center mt-4 justify-between">
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                className="bg-green-50 border border-green-400 text-green-700 hover:bg-green-100 hover:text-green-800"
                                                variant={selectedState.isStart ? "default" : "outline"}
                                                onClick={() =>
                                                    dispatch(
                                                        updateAgentState({
                                                            id: selectedState.id,
                                                            update: { isStart: !selectedState.isStart },
                                                            selectedAgentId,
                                                        })
                                                    )
                                                }
                                            >
                                                {selectedState.isStart ? "Remove Start" : "Set as Start"}
                                            </Button>

                                            <Button
                                                type="button"
                                                className="bg-red-50 border border-red-400 text-red-700 hover:bg-red-100 hover:text-red-800"
                                                variant={selectedState.isEnd ? "default" : "outline"}
                                                onClick={() =>
                                                    dispatch(
                                                        updateAgentState({
                                                            id: selectedState.id,
                                                            update: { isEnd: !selectedState.isEnd },
                                                            selectedAgentId,
                                                        })
                                                    )
                                                }
                                            >
                                                {selectedState.isEnd ? "Remove End" : "Set as End"}
                                            </Button>
                                        </div>


                                        <Button
                                            variant="destructive"
                                            type="button"
                                            onClick={() => handleRemoveState(selectedState.id)}
                                        >
                                            Delete State
                                        </Button>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <Button type="submit">
                                            Save State
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleAddState}
                                        >
                                            + New State
                                        </Button>
                                    </div>

                                    <div className="mt-4">
                                        {testModeActive ? (
                                            <Button
                                                variant="destructive"
                                                onClick={onStopTestMode}
                                            >
                                                Stop Test
                                            </Button>
                                        ) : (
                                            <Button
                                                className="bg-yellow-50 text-black border border-yellow-300 hover:border-yellow-400 hover:bg-yellow-100"
                                                onClick={onStartTestMode}>
                                                Start Test
                                            </Button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-sm text-center">
                                    Click on a state to view details.
                                </p>
                            )}
                        </form>
                    )}

                    {showCreateAgentModal && (
                        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 z-50">
                            <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 md:w-1/3">
                                <h3 className="text-lg font-bold mb-4">Create New Agent</h3>
                                <div className="mb-4">
                                    <Label className="mb-1 block">Agent Name</Label>
                                    <Input
                                        value={newAgentName}
                                        onChange={(e) => setNewAgentName(e.target.value)}
                                        placeholder="Enter agent name"
                                    />
                                </div>
                                <div className="mb-4">
                                    <Label className="mb-1 block">Global Prompt</Label>
                                    <Textarea
                                        value={newAgentPrompt}
                                        onChange={(e) => setNewAgentPrompt(e.target.value)}
                                        placeholder="Define the global prompt for this agent..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCreateAgentModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateAgent}>
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </aside>
    );
};

export default StateManagementPanel;
