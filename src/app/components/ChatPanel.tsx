'use client'
import React, { useState, useEffect, useCallback } from "react";
import { Message } from "@/app/types/StateCanvasTypes";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/app/components/ui/accordion";

interface ChatPanelProps {
    messages: Message[];
    chatInput: string;
    testModeActive: boolean;
    activeStateId: number | null;
    onInputChange: (text: string) => void;
    onSendMessage: () => Promise<void>;
    isLoading: boolean;
    selectedAgentId: number | null;
    handleResetChat: (conversationId: number) => void;
    currentConversationId: number | null;
    setCurrentConversationId: (id: number | null) => void;

}
interface Conversation {
    id: number;
    closed: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    chatInput,
    testModeActive,
    activeStateId,
    onInputChange,
    onSendMessage,
    isLoading,
    selectedAgentId,
    handleResetChat,
    currentConversationId,
    setCurrentConversationId
}) => {
    const [conversationHistory, setConversationHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
    const [highlight, setHighlight] = useState(false);


    const states = useSelector((state: RootState) => state.agents.states);

    const fetchConversationHistory = async (agentId: number) => {
        try {
            const response = await fetch(`/api/conversations?agentId=${agentId}`);
            if (response.ok) {
                const history = await response.json();
                return history;
            } else {
                console.error("Error fetching history");
                return [];
            }
        } catch (error) {
            console.error("Server error:", error);
            return [];
        }
    };

    useEffect(() => {
        if (selectedAgentId) {
            fetchConversationHistory(selectedAgentId).then((history) => {
                setConversationHistory(history);

                const activeConv = history.find((conv: Conversation) => !conv.closed);
                setCurrentConversationId(activeConv ? activeConv.id : null);
            });
        }
    }, [selectedAgentId]);


    useEffect(() => {
        const activeConv = conversationHistory?.find((conv) => conv.closed === false);

        if (activeConv) {
            setCurrentConversationId(activeConv.id);
        } else {
            setCurrentConversationId(null);
        }
    }, [conversationHistory]);

    useEffect(() => {
        if (activeStateId !== null) {
            setHighlight(true);
            const timer = setTimeout(() => {
                setHighlight(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [activeStateId]);


    const handleResetConversation = useCallback(
        async (conversationId: number) => {
            try {
                const response = await fetch(`/api/conversations?conversationId=${conversationId}`, {
                    method: "PATCH",
                });
                if (response.ok) {
                    if (selectedAgentId) {
                        const history = await fetchConversationHistory(selectedAgentId);
                        setConversationHistory(history);
                    }
                    if (currentConversationId === conversationId) {
                        setCurrentConversationId(null);
                        handleResetChat(conversationId);
                    }
                } else {
                    console.error("Error reseting conversation");
                }
            } catch (error) {
                console.error("Error reseting conversation:", error);
            }
        },
        [currentConversationId, handleResetChat, selectedAgentId]
    );

    const handleDeleteConversation = useCallback(
        async (conversationId: number) => {
            try {
                const response = await fetch(`/api/conversations?conversationId=${conversationId}`, {
                    method: "DELETE",
                });
                if (response.ok) {

                    setConversationHistory(prev =>
                        prev.filter(conv => conv.id !== conversationId)
                    );

                    if (selectedAgentId) {
                        const history = await fetchConversationHistory(selectedAgentId);
                        setConversationHistory(history);
                    }
                } else {
                    console.error("Error deleting conversation");
                }
            } catch (error) {
                console.error("Error deleting conversation:", error);
            }
        },
        [selectedAgentId]
    );

    const activeConversation =
        conversationHistory.find((conv) => conv.closed === false) || { messages };

    const closedConversations = conversationHistory.filter(
        (conv) => conv.closed === true
    );

    const groupedHistory: Record<string, any[]> = closedConversations.reduce(
        (groups: Record<string, any[]>, conv: any) => {
            const dateKey = new Date(conv.createdAt).toISOString().split("T")[0];
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(conv);
            return groups;
        },
        {}
    );

    return (
        <section className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
            <div className="flex border-b mb-4">
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`px-4 py-2 font-medium ${activeTab === "chat"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-blue-600"
                        }`}
                >
                    Chat
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2 font-medium ${activeTab === "history"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-blue-600"
                        }`}
                >
                    History
                </button>
            </div>

            {activeTab === "chat" ? (
                <div className="flex flex-col flex-1">
                    <div className="flex gap-2 mb-4 flex-col">
                        <div className="flex">
                            <p className="text-red-700">{testModeActive && "TEST MODE"}</p>
                            <button
                                onClick={() =>
                                    currentConversationId && handleResetConversation(currentConversationId)
                                }
                                className="ml-auto bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-sm"
                            >
                                Reset
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-700">Chat</h3>
                            {testModeActive && (
                                <p
                                    className={`text-sm transition-all duration-500 ${highlight ? "bg-yellow-200 p-1 rounded" : "bg-transparent text-gray-700"
                                        }`}
                                >
                                    Current state:{" "}
                                    {states.find((s) => s.id === activeStateId)?.name || "N/A"}
                                </p>
                            )}
                        </div>
                        <hr className="my-2" />
                    </div>
                    <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[65vh]">
                        {activeConversation.messages.map((msg: Message, idx: number) => (
                            <div
                                key={idx}
                                className={`max-w-[80%] p-2 rounded-lg shadow-sm break-words whitespace-pre-wrap ${msg.role === "user"
                                    ? "self-end bg-blue-500 text-white"
                                    : "self-start bg-gray-200 text-gray-800"
                                    }`}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 p-2">
                        <textarea
                            value={chatInput}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder="Type your message..."
                            className="border border-gray-300 rounded px-2 py-1 flex-1"
                            disabled={isLoading}
                        />
                        <button
                            onClick={onSendMessage}
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            {isLoading ? "Sending..." : "Send"}
                        </button>
                    </div>
                </div>
            ) : (
                <section className="flex flex-col flex-1">
                    <h4 className="text-md font-semibold text-gray-700 mb-2 ">
                        Conversation History
                    </h4>
                    {Object.entries(groupedHistory).map(([date, convs]) => (
                        <div key={date}>
                            <Accordion type="single" collapsible>
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Day: {date}</AccordionTrigger>
                                    <AccordionContent className="overflow-y-auto max-h-[74vh] break-words whitespace-pre-wrap">
                                        {convs.map((conv, idx) => (
                                            <div
                                                key={conv.id || idx}
                                                className="mb-2 flex flex-col gap-2 border p-2 rounded"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        Conversation ID: {conv.id}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteConversation(conv.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs"
                                                    >
                                                        Delete conversation
                                                    </button>
                                                </div>
                                                {conv.messages.map((msg: Message, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={`max-w-[80%] p-2 rounded-lg shadow-sm ${msg.role === "user"
                                                            ? "self-end bg-blue-500 text-white"
                                                            : "self-start bg-gray-200 text-gray-800"
                                                            }`}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    ))}
                </section>
            )}
        </section>
    );
};

export default ChatPanel;
