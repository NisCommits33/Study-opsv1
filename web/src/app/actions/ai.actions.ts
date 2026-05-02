/**
 * @file ai.actions.ts
 * @description Server Actions for AI operations.
 * This ensures that sensitive API keys are never exposed to the client.
 * 
 * @author Study Ops Engineering
 */

'use server'

import { aiChat as internalAiChat, AIMessage, AIResponse } from '@/lib/ai'

/**
 * Server action to handle AI chat requests.
 * Proxies the request to the internal AI utility on the server.
 * 
 * @param {AIMessage[]} messages - The chat history.
 * @param {'simple' | 'complex'} complexity - The model complexity to use.
 * @returns {Promise<AIResponse>} The AI response.
 */
export async function chatAction(
  messages: any[],
  complexity: 'simple' | 'complex' = 'complex',
  jsonMode: boolean = false
): Promise<AIResponse> {
  try {
    // Sanitize messages to only include role and content (API requirement)
    const sanitizedMessages = messages.map(({ role, content }) => ({ role, content }))
    return await internalAiChat(sanitizedMessages, complexity, jsonMode)
  } catch (error: any) {
    console.error('AI Action Error:', error)
    throw new Error(error.message || 'AI request failed on server')
  }
}
