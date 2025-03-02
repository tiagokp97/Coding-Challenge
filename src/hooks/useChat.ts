import { useState, useCallback } from 'react';
import {  Message } from "@/app/types/StateCanvasTypes";


export default function useChat() {
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addMessage = useCallback((msg: Message) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  return { chatInput, setChatInput, chatMessages, addMessage, clearChat, isLoading, setIsLoading };
}
