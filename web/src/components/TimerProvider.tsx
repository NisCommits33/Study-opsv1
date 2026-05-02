/**
 * @file TimerProvider.tsx
 * @description Global timer tick handler.
 * Manages the background interval for the focus timer.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/store/useTimerStore'

/**
 * TimerProvider Component.
 * Injects the global timer interval into the application.
 */
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { tick, isActive, timeLeft } = useTimerStore()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        tick()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft, tick])

  return <>{children}</>
}
