/**
 * @file useAssistantStore.ts
 * @description State management for the AI Assistant.
 * Handles chat history, loading states, and sidebar visibility.
 * 
 * @author Study Ops Engineering
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface AssistantState {
  isOpen: boolean
  messages: Message[]
  isLoading: boolean
  toggleSidebar: () => void
  addMessage: (message: Message) => void
  setLoading: (loading: boolean) => void
  clearChat: () => void
}

/**
 * Zustand store for the AI Assistant.
 * Uses persistent storage to keep chat history across sessions.
 */
export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      isLoading: false,
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setLoading: (loading) => set({ isLoading: loading }),
      clearChat: () => set({ messages: [] }),
    }),
    {
      name: 'assistant-storage',
    }
  )
)
