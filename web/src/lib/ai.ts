// src/lib/ai.ts — unified AI provider with automatic fallback
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export type AIMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export type AIResponse = {
  text: string
  provider: 'groq' | 'openai' | 'claude'
  model: string
  usedFallback: boolean
}

// Model map per task complexity
const MODELS: Record<string, any> = {
  groq: {
    complex: 'llama-3.3-70b-versatile',
    simple:  'llama-3.1-8b-instant',
    voice:   'whisper-large-v3',
  },
  openai: {
    complex: 'gpt-4o',
    simple:  'gpt-4o-mini',
  },
  claude: {
    complex: 'claude-3-5-sonnet-20240620', // Updated to current stable versions
    simple:  'claude-3-haiku-20240307',
  },
}

// Lazy initialization of clients to prevent startup crashes if keys are missing
let _groq: Groq | null = null
let _openai: OpenAI | null = null
let _anthropic: Anthropic | null = null

function getGroq() {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your-groq-key') {
      console.warn("GROQ_API_KEY is missing. Groq provider will be unavailable.")
      return null
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-key') {
      console.warn("OPENAI_API_KEY is missing. OpenAI provider will be unavailable.")
      return null
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-key') {
      console.warn("ANTHROPIC_API_KEY is missing. Anthropic provider will be unavailable.")
      return null
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}


// ── Primary: Groq ──────────────────────────────────────────────────────────
async function callGroq(messages: AIMessage[], model: string): Promise<string> {
  const client = getGroq()
  if (!client) throw new Error("Groq client not initialized")
  const res = await client.chat.completions.create({ model, messages, max_tokens: 1000 })
  return res.choices[0].message.content ?? ''
}

// ── Fallback 1: OpenAI ─────────────────────────────────────────────────────
async function callOpenAI(messages: AIMessage[], model: string): Promise<string> {
  const client = getOpenAI()
  if (!client) throw new Error("OpenAI client not initialized")
  const res = await client.chat.completions.create({ model, messages, max_tokens: 1000 })
  return res.choices[0].message.content ?? ''
}

// ── Fallback 2: Claude ─────────────────────────────────────────────────────
async function callClaude(messages: AIMessage[], model: string): Promise<string> {
  const client = getAnthropic()
  if (!client) throw new Error("Anthropic client not initialized")
  const system = messages.find(m => m.role === 'system')?.content
  const userMsgs = messages.filter(m => m.role !== 'system')
  const res = await client.messages.create({
    model,
    max_tokens: 1000,
    system,
    messages: userMsgs as any,
  })
  return (res.content[0] as any).text
}

// ── Main export: aiChat() ──────────────────────────────────────────────────
export async function aiChat(
  messages: AIMessage[],
  complexity: 'simple' | 'complex' = 'complex'
): Promise<AIResponse> {
  const attempts: Array<() => Promise<AIResponse>> = [
    async () => ({
      text: await callGroq(messages, MODELS.groq[complexity]),
      provider: 'groq', model: MODELS.groq[complexity], usedFallback: false,
    }),
    async () => ({
      text: await callOpenAI(messages, MODELS.openai[complexity]),
      provider: 'openai', model: MODELS.openai[complexity], usedFallback: true,
    }),
    async () => ({
      text: await callClaude(messages, MODELS.claude[complexity]),
      provider: 'claude', model: MODELS.claude[complexity], usedFallback: true,
    }),
  ]

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (err: any) {
      // If the error is "client not initialized", it means the API key is missing.
      // We skip this provider and try the next one.
      const isConfigError = err?.message?.includes("not initialized")
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.code === 'ETIMEDOUT'
      
      if (isConfigError || isRetryable) {
        console.warn(`[ai] provider skipped or failed, trying next...`, err?.message)
        continue
      }
      
      throw err // hard errors (auth, bad request) — don't retry
    }
  }
  throw new Error('All AI providers failed. Please try again later.')
}

// ── Transcription (Groq Whisper only — no fallback for voice) ─────────────
export async function aiTranscribe(audioFile: File, language: 'en' | 'np' = 'en'): Promise<string> {
  const client = getGroq()
  if (!client) throw new Error("Groq client not initialized for transcription")
  const res = await client.audio.transcriptions.create({
    file: audioFile,
    model: MODELS.groq.voice,
    language: language === 'np' ? 'ne' : 'en',
  })
  return res.text
}
