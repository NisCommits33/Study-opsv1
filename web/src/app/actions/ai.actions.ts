/**
 * @file ai.actions.ts
 * @description Server Actions for AI operations.
 * This ensures that sensitive API keys are never exposed to the client.
 * 
 * @author Study Ops Engineering
 */

'use server'

import { aiChat as internalAiChat, AIMessage, AIResponse } from '@/lib/ai'
import { supabase } from '@/lib/supabase/client'
import { getShiftForDate, ShiftType } from '@/lib/shiftUtils'

/**
 * Specialized action for the Assistant Sidebar.
 * Injects user context (shifts, deadlines) into the prompt.
 */
export async function getAssistantResponseAction(
  messages: any[],
  complexity: 'simple' | 'complex' = 'complex'
): Promise<AIResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch context
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: shiftConfig } = await supabase.from('shift_configs').select('*').eq('id', user.id).single()
    const { data: deadlines } = await supabase.from('deadlines').select('*').eq('user_id', user.id).limit(5)

    let shiftContext = "No shift cycle configured."
    if (shiftConfig) {
      const currentShift = getShiftForDate(
        new Date(),
        new Date(shiftConfig.cycle_start_date),
        shiftConfig.first_shift_type as ShiftType
      )
      shiftContext = `Current Shift: ${currentShift}. Cycle started on ${shiftConfig.cycle_start_date}.`
    }

    const deadlineContext = deadlines?.map(d => `${d.title} on ${d.deadline_date}`).join(', ') || "No upcoming deadlines."

    const systemPrompt = `You are the Study Ops AI Assistant, a personal study coach for ${profile?.full_name || 'the user'}.
You are shift-aware and exam-focused.
USER CONTEXT:
- ${shiftContext}
- Upcoming Deadlines: ${deadlineContext}
- Language: English/Nepali (answer in the language user uses).
GOAL: Provide actionable study advice, plan sessions, and encourage the user based on their energy levels and shift work constraints.`

    const sanitizedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(({ role, content }) => ({ role, content }))
    ]

    return await internalAiChat(sanitizedMessages, complexity)
  } catch (error: any) {
    console.error('Assistant Action Error:', error)
    throw new Error(error.message || 'Assistant request failed')
  }
}

/**
 * Server action to handle generic AI chat requests.
 */
export async function chatAction(
  messages: any[],
  complexity: 'simple' | 'complex' = 'complex',
  jsonMode: boolean = false
): Promise<AIResponse> {
  try {
    const sanitizedMessages = messages.map(({ role, content }) => ({ role, content }))
    return await internalAiChat(sanitizedMessages, complexity, jsonMode)
  } catch (error: any) {
    console.error('AI Action Error:', error)
    throw new Error(error.message || 'AI request failed on server')
  }
}
