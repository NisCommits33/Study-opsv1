/**
 * @file useTimerStore.ts
 * @description Global state management for the Pomodoro Timer.
 * Ensures the timer continues running even when the user navigates between pages.
 * 
 * @author Study Ops Engineering
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TimerMode = 'focus' | 'break'

interface TimerState {
  mode: TimerMode
  timeLeft: number
  isActive: boolean
  startTime: number | null // Used to calculate elapsed time precisely
  
  setMode: (mode: TimerMode) => void
  setTimeLeft: (time: number) => void
  setIsActive: (active: boolean) => void
  tick: () => void
  reset: () => void
  toggle: () => void
}

/**
 * Zustand store for the Focus Timer.
 * Persists the timer state across page navigations.
 */
export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: 'focus',
      timeLeft: 25 * 60,
      isActive: false,
      startTime: null,

      setMode: (mode) => set({ 
        mode, 
        timeLeft: mode === 'focus' ? 25 * 60 : 5 * 60,
        isActive: false 
      }),
      
      setTimeLeft: (time) => set({ timeLeft: time }),
      
      setIsActive: (active) => set({ 
        isActive: active,
        startTime: active ? Date.now() : null 
      }),

      tick: () => set((state) => {
        if (!state.isActive || state.timeLeft <= 0) return state
        return { timeLeft: state.timeLeft - 1 }
      }),

      reset: () => {
        const mode = get().mode
        set({ 
          isActive: false, 
          timeLeft: mode === 'focus' ? 25 * 60 : 5 * 60,
          startTime: null 
        })
      },

      toggle: () => set((state) => ({ 
        isActive: !state.isActive,
        startTime: !state.isActive ? Date.now() : null 
      })),
    }),
    {
      name: 'timer-storage',
    }
  )
)
