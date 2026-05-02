# Study Ops — Complete Project Specification
> Last updated: May 2026  
> Status: Ready to build  
> Owner: Nischal (ARFF, PIA)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [User Context](#3-user-context)
4. [Features & Modules](#4-features--modules)
5. [OpenMAIC Integration](#5-openmaic-integration)
6. [Bilingual System](#6-bilingual-system)
7. [PDF Upload System](#7-pdf-upload-system)
8. [AI Features](#8-ai-features)
9. [Database Schema](#9-database-schema)
10. [Folder Structure](#10-folder-structure)
11. [Build Order](#11-build-order)
12. [Pre-Build Checklist](#12-pre-build-checklist)
13. [Architecture Patterns](#13-architecture-patterns)
14. [AI Coding Prompt](#14-ai-coding-prompt)

---

## 1. Project Overview

**Study Ops** is a full-stack, AI-powered personal study assistant and exam preparation platform. It is designed for shift workers who study on the side — specifically built around the context of Nepal government service (Loksewa) candidates, aviation firefighting professionals (ARFF/CAAN), and final-year university students.

### Core Problem It Solves
- Inconsistent study habits due to irregular shift work
- No tool exists that is shift-aware and Loksewa-specific
- Gap between passive reading and active exam preparation
- No structured way to track weak spots across subjects

### Who It's For
**Primary users:**
- Nepal Loksewa Level 5 candidates (CAAN, aviation fire service)
- ARFF/PIA staff preparing for promotion exams
- Final-year BSc Computer Science students juggling jobs

**Secondary users:**
- Any shift worker who studies on the side
- Government service exam candidates in Nepal
- Self-learners who want AI-powered structured study

### Vision
Start as a personal tool → evolve into a public platform for Nepal exam prep. Bilingual (English + Nepali), multi-user, scalable from day one.

---

## 2. Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, scalable, OpenMAIC compatible |
| Language | TypeScript (strict mode) | Product-grade, scalable, better AI tooling support |
| Styling | Tailwind CSS | Utility-first, consistent |
| UI Components | shadcn/ui | Already used by OpenMAIC, consistent design system |
| Database | Supabase PostgreSQL | Row Level Security, multi-tenant ready, free tier |
| Auth | Supabase Auth + Google OAuth | One-click login, shared across merged OpenMAIC |
| AI — Main | Groq API (Llama 3.3 70B) | Free tier, fast, OpenAI-compatible format |
| AI — Fast tasks | Groq (Llama 3.1 8B Instant) | Flashcards, summaries, simple generation |
| AI — Voice/OCR | Groq Whisper large-v3 | Transcription EN + NP, PDF OCR |
| AI — Fallback 1 | OpenAI (GPT-4o mini / GPT-4o) | Groq rate limit or outage fallback |
| AI — Fallback 2 | Anthropic Claude (Haiku / Sonnet) | Final fallback; best for Nepali quality & complex reasoning |
| State management | Zustand | Simple, scalable global state |
| Validation | Zod | Runtime type safety on all API routes |
| Package manager | pnpm | Fast, monorepo-ready |
| Notifications | Web Push API + Supabase Edge Functions | Serverless, no extra cost |
| Storage | Supabase Storage | PDF uploads, profile photos |
| Hosting | Vercel | Auto-deploy from GitHub, free tier |
| Repo | GitHub (private → public later) | Version control |

### AI Provider Notes

#### Fallback Chain
All AI calls follow a priority chain. If a provider fails (rate limit, outage, timeout), the system automatically retries with the next provider — no manual intervention needed.

```
Primary   → Groq       (Llama 3.3 70B / 8B Instant / Whisper)
Fallback 1 → OpenAI    (GPT-4o mini for simple, GPT-4o for complex)
Fallback 2 → Anthropic (claude-haiku-4-5 for simple, claude-sonnet-4-5 for complex)
```

**Why this order:**
- Groq: free tier (14,400 req/day), fastest, OpenAI-compatible format
- OpenAI: most compatible API format (near-zero code change from Groq), reliable uptime
- Claude: best Nepali language quality, strongest reasoning — used as final safety net

**Trigger conditions for fallback:**
- Groq returns 429 (rate limit) or 503 (outage)
- Response timeout > 15 seconds
- Groq daily quota exhausted

#### Provider Configuration
All providers are configured in a single file: `lib/ai.ts` (replaces original `lib/groq.ts`)

```typescript
// lib/ai.ts — unified AI provider with automatic fallback
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
const MODELS = {
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
    complex: 'claude-sonnet-4-5',
    simple:  'claude-haiku-4-5',
  },
}

const groq      = new Groq({ apiKey: process.env.GROQ_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Primary: Groq ──────────────────────────────────────────────────────────
async function callGroq(messages: AIMessage[], model: string): Promise<string> {
  const res = await groq.chat.completions.create({ model, messages, max_tokens: 1000 })
  return res.choices[0].message.content ?? ''
}

// ── Fallback 1: OpenAI ─────────────────────────────────────────────────────
async function callOpenAI(messages: AIMessage[], model: string): Promise<string> {
  const res = await openai.chat.completions.create({ model, messages, max_tokens: 1000 })
  return res.choices[0].message.content ?? ''
}

// ── Fallback 2: Claude ─────────────────────────────────────────────────────
async function callClaude(messages: AIMessage[], model: string): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const userMsgs = messages.filter(m => m.role !== 'system')
  const res = await anthropic.messages.create({
    model,
    max_tokens: 1000,
    system,
    messages: userMsgs as Anthropic.MessageParam[],
  })
  return (res.content[0] as Anthropic.TextBlock).text
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
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.code === 'ETIMEDOUT'
      if (!isRetryable) throw err   // hard errors (auth, bad request) — don't retry
      console.warn(`[ai] provider failed, trying next...`, err?.message)
    }
  }
  throw new Error('All AI providers failed. Please try again later.')
}

// ── Transcription (Groq Whisper only — no fallback for voice) ─────────────
export async function aiTranscribe(audioFile: File, language: 'en' | 'np' = 'en'): Promise<string> {
  const res = await groq.audio.transcriptions.create({
    file: audioFile,
    model: MODELS.groq.voice,
    language: language === 'np' ? 'ne' : 'en',
  })
  return res.text
}
```

#### Usage Throughout the App
Every API route that calls AI now uses `aiChat()` instead of calling Groq directly:

```typescript
// Before (old — Groq only)
const res = await groq.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages })

// After (new — automatic fallback)
const { text, provider, usedFallback } = await aiChat(messages, 'complex')
if (usedFallback) console.warn(`[ai] used fallback provider: ${provider}`)
```

#### Logging Fallback Events
When a fallback fires, log it to `ai_logs` table for monitoring:

```typescript
// In every API route, after aiChat() resolves:
await supabase.from('ai_logs').insert({
  user_id: userId,
  feature,
  provider,          // 'groq' | 'openai' | 'claude'
  model,
  used_fallback: usedFallback,
  tokens_used: text.length,  // approximate
})
```

This lets you see in production how often Groq is failing and whether you're burning OpenAI/Anthropic credits unexpectedly.

---

## 3. User Context

### Shift Configuration (Nischal / default setup)
- **Shift A (Day):** 12:30 PM – 7:00 PM, possible OT up to 3.5 hrs
- **Shift B (Morning):** 6:00 AM – 12:30 PM
- **Cooldown:** 30 minutes before and after each shift
- **Cycle:** Alternates every 15 days
- **Cycle start example:** April 14 = Day shift, April 29 = Morning shift

### Study Windows (auto-calculated by shiftUtils.ts)
| Shift | Free Window | Usable Hours |
|---|---|---|
| Morning shift | 1:00 PM – 10:00 PM | ~9 hours |
| Day shift (no OT) | 6:00 AM – 12:00 PM + 7:30–9:30 PM | ~8 hours |
| Day shift (max OT) | 6:00 AM – 12:00 PM only | ~6 hours |

### Current Deadlines (Nischal)
| Item | Date | Priority |
|---|---|---|
| Big Data & Data Mining Viva | May 5, 2026 | CRITICAL |
| Computer Vision Project Submission | May 22, 2026 | High |
| Big Data Written Exam | May 29, 2026 | High |
| Computer Vision Exam | June 1, 2026 | High |
| Final Year Project (Lokai) Viva | TBD | Medium |
| Loksewa Level 5 — Paper 1 & 2 | TBD | Medium |

---

## 4. Features & Modules

### 4.1 Dashboard
- Today's shift status (auto-calculated)
- Free study window for today
- "Do this now" — AI recommendation based on deadlines + hours studied
- Deadline risk scores per subject (colour coded: red / amber / green)
- Study streak counter
- Quick access to today's plan

### 4.2 AI Personal Assistant (Persistent Sidebar)
The core feature. Always visible on the left side of every page.

**Behaviour:**
- Greets user based on time of day and shift
- User types naturally: `"I want to study Chemistry of Fire and Hose Fitting today"`
- AI reads: shift schedule, deadlines, past sessions, weak spots, chapter frequency
- AI generates a specific session plan with objectives, times, and order
- Plan is fully editable: drag to reorder, change time, swap topic, remove
- Mood selector before plan generation:
  - ⚡ Focused — hard topics first
  - 😐 Okay — normal plan
  - 😴 Low energy — light reading only
  - 🔥 Motivated — pack it in
- AI adjusts plan density and difficulty based on mood

**Natural language examples:**
| You type | AI does |
|---|---|
| "Chemistry of Fire and Hose Fitting" | Plan for both with sub-objectives |
| "Something light, 30 mins" | Easiest pending topic, short session |
| "Continue from yesterday" | Resumes incomplete objectives |
| "Mock test on Section A" | Skips study, launches full test |
| "I'm free for 2 hours" | Picks what fits in 2 hrs by priority |
| "Surprise me" | Picks highest risk topic automatically |

**Session plan format:**
```
Today's Study Plan — 1:00 PM
① Chemistry of Fire         45 min
   - Combustion of fire
   - Classification of fire
   - Fire extinction method
② Break                      5 min
③ Hose and Hose Fitting      40 min
   - Type of hose
   - Use of hose
④ Test — both topics         15 min
```

### 4.3 Deadlines
- All deadlines with live countdown
- TBD support (no date set)
- Status toggle: not started / in progress / done
- Priority: high / medium / low
- Type: exam / viva / submission / interview

### 4.4 Schedule
- Calendar view showing shift per day (auto-calculated from cycle)
- Study windows highlighted per day
- Colour-coded: morning shift days vs day shift days

### 4.5 Pomodoro Timer
- 25 min work / 5 min short break / 20 min long break
- Subject tag before starting
- Auto-logs session to study_sessions on completion
- Prompts "which subject?" if not pre-tagged

### 4.6 Study Sessions
- Manual + auto-log (from timer and OpenMAIC)
- GitHub-style weekly heatmap
- Hours per subject breakdown
- Source tracking: manual / timer / openmaic / interview

### 4.7 Study Documentation System (Core Content Engine)
The heart of Study Ops. Users build a structured, searchable, AI-enhanced documentation site from their study materials — like GitBook or Docusaurus, but for exam prep.

#### Import Flow — How Content Gets In

**Option 1 — Paste Text**
- User pastes raw text (from a textbook, notes, website, etc.)
- AI analyses and suggests chapter/topic structure
- User reviews, edits, reorganises → confirms
- Content saved as structured documentation pages

**Option 2 — Upload PDF**
- Syllabus PDF → AI extracts bilingual chapter structure
- Notes/textbook PDF → AI splits into chapters and topics
- Past paper PDF → AI extracts questions + frequency analysis
- Digital PDF → `pdf-parse` for text extraction
- Scanned PDF → Groq Vision (send as base64 image pages)

**Option 3 — Manual Creation**
- User creates chapters and topics manually
- Types or pastes content directly into the editor
- Builds structure from scratch

#### Documentation Structure (3-level hierarchy)

```
Subject (e.g. Big Data & Data Mining)
├── Chapter 1: MapReduce
│   ├── Topic 1.1: Introduction to MapReduce
│   ├── Topic 1.2: Map Function
│   ├── Topic 1.3: Reduce Function
│   └── Topic 1.4: Combiner & Partitioner
├── Chapter 2: Hadoop HDFS
│   ├── Topic 2.1: Architecture
│   ├── Topic 2.2: Replication
│   └── Topic 2.3: Fault Tolerance
└── Chapter 3: NoSQL Databases
    ├── Topic 3.1: CAP Theorem
    ├── Topic 3.2: Column-Family Stores
    └── Topic 3.3: Document Stores
```

Each topic is a **page** with rich content — text, images, code blocks, tables, and AI-generated enhancements.

#### Documentation Reader (like GitBook)

The primary reading experience. Not a raw editor — a polished, readable documentation site.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  📚 Big Data & Data Mining              [EN] [NP] [☀🌙] │
├──────────┬───────────────────────────────────────────────┤
│          │  Ch 1 > MapReduce > Map Function              │
│ Ch 1 ▾   │──────────────────────────────────────────────│
│  1.1     │                                               │
│  1.2 ◀── │  ## Map Function                              │
│  1.3     │                                               │
│  1.4     │  The Map function takes a key-value pair      │
│          │  and produces a set of intermediate           │
│ Ch 2 ▸   │  key-value pairs...                           │
│ Ch 3 ▸   │                                               │
│          │  [AI-generated diagram of Map flow]           │
│ ───────  │                                               │
│ Progress │  The mapper processes each record             │
│ ████░ 60%│  independently, which enables...              │
│          │                                               │
│          │  ◀ Previous: Introduction    Next: Reduce ▶   │
├──────────┴───────────────────────────────────────────────┤
│  ✏️ Edit  │  🔍 Search  │  ✅ Mark Complete  │  📊 67%   │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Left sidebar: collapsible chapter tree with progress indicators
- Breadcrumb navigation: Subject > Chapter > Topic
- Previous / Next buttons at page bottom
- Full-text search across all topics
- Mark complete button per topic
- Progress bar per chapter and overall
- Dark/light mode toggle
- Side-by-side English + Nepali view (or single language)
- AI translate button (EN→NP or NP→EN)

#### AI Context Menu (Text Selection Actions)

When the user **selects any text** on a topic page, a floating toolbar appears with AI-powered actions. This is the core AI enhancement — contextual, zero-friction, and mode-based.

**Floating toolbar on text selection:**
```
┌─────────────────────────────────────────────────────────┐
│ 🧒 ELI5 │ 📝 Summarize │ 🔍 Elaborate │ 🖼️ Add Image │
│ 💡 Example │ 🇳🇵 Translate │ ❓ Quiz Me │ 📌 Capture  │
└─────────────────────────────────────────────────────────┘
```

**Mode details:**

| Action | What It Does | Output |
|---|---|---|
| 🧒 **Explain Like I'm 5** | Ultra-simple explanation using everyday analogies | Inline expansion below selected text |
| 📝 **Summarize** | Condense to 2-3 key bullet points | Inline expansion |
| 🔍 **Elaborate** | Expand with more detail, examples, and edge cases | Inline expansion |
| 🖼️ **Add Image** | AI generates a relevant diagram, flowchart, or illustration | Image inserted below selected text |
| 💡 **Give Example** | Real-world analogy or concrete scenario | Inline expansion |
| 🇳🇵 **Translate** | Translate selected text EN↔NP | Inline expansion (toggle language) |
| ❓ **Quiz Me** | Generate a quiz question about the selected text | Modal with question + answer input |
| 📌 **Capture** | Save selected text as a quick capture for later review | Saved to quick_captures |

**ELI5 example:**
```
Selected text: "HDFS uses a replication factor of 3 to ensure fault tolerance.
Each block is replicated across multiple DataNodes."

🧒 ELI5 response:
"Imagine you have an important photo. Instead of keeping just one copy,
you make 3 copies and give them to 3 different friends. If one friend
loses their copy, you still have 2 more. HDFS does exactly this with
your data — it keeps 3 copies on 3 different computers."
```

**All AI mode outputs are:**
- Inserted inline (not in a popup) — they become part of the page content
- Marked with a subtle AI badge so user knows what's AI-generated vs original
- Editable — user can modify, keep, or delete the AI addition
- Bilingual — generated in the user's active language
- Saved to the topic page content (persisted, not ephemeral)

#### AI Auto-Image Generation

When a topic is imported or created, AI analyses the content and suggests where images would help understanding.

**Auto-suggestion flow:**
1. User creates/imports a topic
2. AI scans content for concepts that benefit from visuals (processes, architectures, comparisons, hierarchies)
3. AI inserts placeholder badges: `[🖼️ Image suggested: MapReduce data flow diagram]`
4. User clicks badge → AI generates the image → inserted into page
5. User can also manually trigger "Add Image" from the context menu

**Image types AI can generate:**
- Flowcharts and process diagrams
- Architecture diagrams
- Comparison tables (visual)
- Concept maps
- Timeline/sequence diagrams
- Simplified illustrations for complex topics

**Image storage:** Supabase Storage → `study-images/{user_id}/{topic_id}/`

**DB change:** Add to `exam_notes`:
```sql
ai_images jsonb DEFAULT '[]',          -- [{ id, prompt, storage_path, position, alt_text }]
ai_enhancements jsonb DEFAULT '[]',    -- [{ id, type, selected_text, ai_response, position }]
```

#### Per-Chapter Features

**Progress tracking:**
- Status per topic: not started / in progress / done
- Confidence rating per chapter (1–5)
- Progress per chapter: auto-calculated from topic completion
- Overall subject progress: auto-calculated from chapter completion

**Past paper frequency analysis (from uploaded past papers):**
```
🔴 Ch 3. Chemistry of Fire      100% (3/3 papers)
🔴 Ch 11. Aircraft Fire         100% (3/3 papers)
🟠 Ch 6. PPE & SCBA              67% (2/3 papers)
🟡 Ch 1. Words of Command        33% (1/3 papers)
```
AI assistant uses frequency to prioritise planning.

#### Interactive Lesson (OpenMAIC)

Each topic has an "Interactive Lesson" mode powered by OpenMAIC:
- OpenMAIC classroom component loaded directly (no iframe)
- Pre-loaded with this topic's content from the documentation
- AI teacher, AI classmates, whiteboard, voice narration
- Quiz engine with grading
- On completion → logs session to Supabase automatically

#### Quiz (via OpenMAIC)

- OpenMAIC's built-in quiz engine generates questions from the topic content
- Format matches real exam: short answer (5-mark), long answer (10-mark)
- Results logged to weak_spots table via the `onComplete` callback
- No separate quiz generator needed — OpenMAIC handles generation, grading, and feedback

#### Study Templates (public)

- User can publish their subject structure as a public template
- Other users clone it with one click — gets the full chapter/topic structure (content optional)
- Pre-seeded: CAAN Aviation Fire Service Level 5 Paper 2

### 4.8 Interview Prep
For Loksewa interview, promotion boards, and general interviews.

**Mock interview room:**
- Language toggle: English / Nepali (per session)
- Context selector: Loksewa / ARFF Promotion / General
- Text mode: type answers
- Voice mode: browser mic → Groq Whisper transcribes → AI gives feedback

**Question bank (pre-loaded + user-added):**
- Personal background questions
- Service knowledge (from exam chapters)
- Situational / scenario (ARFF-specific emergency scenarios)
- Leadership and discipline

**ARFF scenario example:**
> "A Category 3 aircraft has belly-landed on Runway 02 at PIA. Walk me through your response."
> AI checks answer against user's typed Chapter 11 and Chapter 13 notes.

**STAR answer builder:**
- User describes experience from ARFF
- AI structures into Situation / Task / Action / Result format
- Saved to personal answer bank

**Weak area tracker:**
- Every AI-flagged weakness logged per session
- Builds persistent list: "You've struggled with response procedures 3 times"

**Nepali mode:**
- Questions shown in both EN + NP
- User answers in Nepali (typed or voice)
- AI feedback in Nepali

### 4.9 Notifications
- Browser push notifications (works when app is closed)
- Supabase Edge Function runs daily at 8:00 AM NPT
- Triggers for: deadline ≤ 5 days, no session logged in 24hrs, daily plan ready

### 4.10 Quick Capture
A floating action button (bottom-right corner) present on every page. One tap → type a thought → saved instantly. Zero friction, zero context switching.

**Behaviour:**
- Single text input, no category required
- AI auto-tags on save: weak spot / note / todo / question
- Tagged to current subject if a session is active
- Surfaces in AI assistant at next planning session: "You captured 3 things yesterday — want to review them?"
- Can be promoted to a proper chapter note, exam question, or deadline from the capture inbox

**Capture inbox:**
- Dedicated view under `/capture` or in the sidebar
- Filter by tag, subject, date
- Bulk actions: promote to note / add to question bank / dismiss

**DB table:** `quick_captures`
```sql
CREATE TABLE quick_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  ai_tag text,                            -- 'weak_spot' | 'note' | 'todo' | 'question'
  subject_id uuid REFERENCES subjects,
  session_id uuid REFERENCES study_sessions,
  promoted boolean DEFAULT false,
  promoted_to text,                       -- 'note' | 'question' | 'deadline'
  created_at timestamptz DEFAULT now()
);
```

### 4.11 Study Energy Log
After every completed Pomodoro or study session, a one-tap energy rating prompt appears (1–5 stars). Takes 2 seconds. Over weeks, this builds a real performance dataset the AI planner uses instead of assumed best times.

**How it works:**
- After session ends: "How was that session?" → 1–5 tap rating
- Stored alongside `study_sessions.mood` (pre-session) as `energy_after` (post-session)
- AI analyses: which days/times/subjects produce highest energy ratings
- Dashboard insight card: "Your best study window is 2–4 PM on morning shift days (avg 4.2/5)"
- Planner uses this to schedule hard topics during your historically high-energy windows

**Energy trend view:**
- Weekly bar chart: avg energy by day of week
- Overlay with shift type (morning/day) to reveal patterns
- Subject breakdown: which subjects drain you most

**DB change:** Add to `study_sessions`:
```sql
energy_after int,                         -- 1-5 post-session rating
energy_rated_at timestamptz
```

### 4.12 Exam Day Simulator
A full timed mock exam generated from the question bank. Different from the per-chapter quiz — this simulates real exam conditions across the entire paper.

**Behaviour:**
- User selects: exam, paper type (Paper 1 / Paper 2), duration
- AI selects questions weighted by chapter frequency (high-frequency chapters appear more)
- Strict mode: no pause, no hints, timer visible and counts down
- Auto-submits when time expires
- Question types match real exam format: short answer (5-mark), long answer (10-mark)

**Post-exam debrief (AI-generated):**
```
Exam Complete — Big Data & Data Mining Mock Paper
Score: 62/100 | Time used: 47/60 min

Strong areas:   MapReduce, Hadoop Architecture
Weak areas:     HDFS fault tolerance, NoSQL CAP theorem
Time wasted:    Q4 (spent 18 min on a 5-mark question)

Recommendation: Review HDFS and NoSQL before May 29.
You have 3 days. Focus 2 sessions on weak areas.
```

**Results logged to:**
- `mock_exam_results` table (new)
- Weak areas → `weak_spots` table automatically
- AI assistant references debrief in next planning session

**DB table:** `mock_exam_results`
```sql
CREATE TABLE mock_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exam_id uuid REFERENCES exams NOT NULL,
  score int,
  max_score int,
  duration_minutes int,
  time_used_minutes int,
  answers_json jsonb,                     -- { question_id, user_answer, score, time_spent }
  debrief_text text,
  taken_at timestamptz DEFAULT now()
);
```

### 4.13 Past Answer Archive
Every answer given in a quiz or mock interview is stored and reviewable. Shows growth over time and surfaces patterns the user can't see in the moment.

**What's stored:**
- Question (bilingual)
- User's answer (text or Whisper transcript)
- AI feedback / correct answer
- Score / rating
- Date and session context

**Archive view:**
- Filter by subject, question type, date range, score
- Side-by-side comparison: "Your answer 3 weeks ago vs today"
- Flagged answers: mark for re-review later
- AI summary card: "You've answered this topic 5 times. Your score improved from 2/5 to 4/5."

**DB table:** `answer_archive`
```sql
CREATE TABLE answer_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  question_id uuid REFERENCES question_bank,
  source text NOT NULL,                   -- 'quiz' | 'interview' | 'mock_exam'
  source_session_id uuid,
  user_answer text,
  ai_feedback text,
  score int,                              -- raw score (e.g. 3 out of 5)
  max_score int,
  flagged_for_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### 4.14 Bikram Sambat (BS) Calendar Integration
Nepal government exams, Loksewa schedules, and official notices use Bikram Sambat dates. This feature removes the daily friction of manually converting between BS and AD.

**What it does:**
- All deadline input fields accept both BS and AD dates
- BS date shown alongside AD date throughout the app: `Jestha 16, 2083 (May 29, 2026)`
- Schedule calendar view has a BS/AD toggle
- Loksewa exam notices pasted as text → AI extracts and converts BS dates automatically
- NPT timezone enforced across all date displays

**Implementation:**
- Use `nepali-date-converter` npm package (lightweight, no API calls)
- Wrap in a `bsUtils.ts` utility file alongside `shiftUtils.ts`
- All dates stored as AD in the database (PostgreSQL date type stays clean)
- BS conversion happens at display layer only

```typescript
// lib/bsUtils.ts
import NepaliDate from 'nepali-date-converter'

export function adToBS(date: Date): string {
  const nd = new NepaliDate(date)
  return nd.format('MMMM DD, YYYY')        // e.g. "Jestha 16, 2083"
}

export function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay)
  return nd.toJsDate()
}
```

### 4.15 Chapter Revision Heatmap
A visual coverage map per exam — each chapter is a cell, colour shows recency and frequency of study. Gives an instant read of where the gaps are across an entire syllabus.

**Visual layout:**
```
Big Data & Data Mining — Revision Coverage

Ch 1  MapReduce          ████████  Last reviewed: 2 days ago   🟢
Ch 2  Hadoop HDFS        ████░░░░  Last reviewed: 8 days ago   🟠
Ch 3  NoSQL Databases    ██░░░░░░  Last reviewed: 14 days ago  🔴
Ch 4  Spark              ░░░░░░░░  Never studied               🔴
Ch 5  Data Warehousing   ██████░░  Last reviewed: 4 days ago   🟢
...
```

**Colour logic:**
- 🟢 Green: studied in last 3 days
- 🟠 Amber: studied 4–10 days ago
- 🔴 Red: 10+ days ago or never touched
- Cell fill % = cumulative time spent on chapter

**Where it appears:**
- Exam overview page (full heatmap)
- Dashboard widget (top 3 most neglected chapters)
- AI assistant uses it to prioritise planning: "Ch 4 Spark has never been studied. Loksewa exam in 22 days."

**Data source:** Derived from `study_sessions` + `session_objectives` — no new table needed. Computed on-demand via a Supabase view or API route.

### 4.16 Focus Music & Ambient Sound
Lofi beats, rain, white noise, and café ambience — built into the app. No tab switching to YouTube. Integrates with the Pomodoro timer automatically.

**Behaviour:**
- Sound picker in the Pomodoro timer panel: 🎵 Lofi / 🌧 Rain / ☕ Café / 🤫 White noise / Off
- Timer starts → music plays. Break starts → music fades. Session resumes → music returns.
- Volume control, persisted to user preferences
- Preference saved to `profiles.focus_sound` column

**Implementation:**
- Use royalty-free audio files hosted on Supabase Storage (small MP3 loops, ~1–3MB each)
- Web Audio API for seamless looping with no gaps
- No external service dependency — fully self-hosted

**DB change:** Add to `profiles`:
```sql
focus_sound text DEFAULT 'lofi',          -- 'lofi' | 'rain' | 'cafe' | 'whitenoise' | 'off'
focus_volume int DEFAULT 60               -- 0-100
```

### 4.17 AI Tutor "Explain Like I'm Tired" Mode
A low-cognitive-load variant of the AI lesson triggered when the user flags high fatigue — typically after a long shift with OT. The AI switches to a simpler, more narrative explanation style.

**How it's triggered:**
- Mood selector gets a new option: 🛌 Exhausted (added alongside existing ⚡😐😴🔥)
- Or manually via a "Tired mode" toggle in the AI assistant sidebar
- Or automatically suggested: "You just finished a 10.5-hour shift. Want a lighter session?"

**What changes in AI output:**
- Shorter paragraphs, one idea at a time
- More analogies ("HDFS replication is like keeping 3 copies of a file in 3 different offices")
- No bullet-heavy dense lists
- Slower pacing: one concept → one example → one question → move on
- Nepali explanations prioritised if language is set to NP

**Prompt change in `lib/ai.ts`:**
```typescript
const tiredModeInstruction = isTired
  ? `The user is exhausted after a long shift. Explain in a very simple, friendly, narrative style. 
     Use analogies. Keep each paragraph to 2-3 sentences max. 
     Avoid dense lists. One concept at a time. Be encouraging.`
  : ''
```

**No new DB table needed** — stored as session mood in `study_sessions.mood` with a new value: `'exhausted'`.

### 4.18 Offline/PWA Support
Shift workers often study in areas with poor or no connectivity (fire station bunks, airport remote areas). The app must gracefully handle offline scenarios.

**What works offline:**
- All previously loaded notes (cached via service worker)
- Pomodoro timer (runs client-side, syncs session on reconnect)
- Quick capture (saved to IndexedDB, pushed to Supabase when back online)
- Study plan for today (cached when generated)

**What requires connectivity:**
- AI assistant, quiz generation, OpenMAIC lessons
- PDF upload and processing
- Push notifications (receiving new ones)

**Implementation:**
- Extend existing `public/sw.js` (already needed for push notifications) with cache-first strategy for notes and plans
- Use IndexedDB (via `idb` npm package) as offline write buffer
- Add a `SyncManager` utility in `lib/syncManager.ts` that flushes IndexedDB → Supabase on reconnect
- Show offline indicator badge in the sidebar when `navigator.onLine === false`

```typescript
// lib/syncManager.ts
import { openDB } from 'idb'

const DB_NAME = 'studyops-offline'
const STORES = ['quick_captures', 'study_sessions', 'session_objectives']

export async function queueOfflineWrite(store: string, data: any) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      STORES.forEach(s => db.createObjectStore(s, { keyPath: 'id' }))
    },
  })
  await db.put(store, { ...data, id: crypto.randomUUID(), _synced: false })
}

export async function flushOfflineQueue(supabase: any) {
  const db = await openDB(DB_NAME, 1)
  for (const store of STORES) {
    const items = await db.getAll(store)
    for (const item of items.filter(i => !i._synced)) {
      const { _synced, ...row } = item
      await supabase.from(store).insert(row)
      await db.delete(store, item.id)
    }
  }
}
```

**No new DB table needed** — offline data uses the same tables, just synced later.

### 4.19 Data Export
Users own their data. They must be able to export everything they've created.

**Export options:**
- **Notes** → Markdown files (one per chapter), zipped
- **Study sessions** → CSV with date, subject, duration, mood, energy
- **Question bank** → JSON (bilingual, with marks and frequency)
- **Interview answers** → JSON (with STAR format and AI feedback)
- **Full account** → Single ZIP with all of the above

**Where it lives:**
- Settings page → "Export My Data" section
- API route: `app/api/export/route.ts`
- Uses streaming response for large exports

**Privacy compliance:**
This also satisfies GDPR-style data portability requirements if the app scales to international users.

---

## 5. OpenMAIC Integration

### What is OpenMAIC
Open Multi-Agent Interactive Classroom by Tsinghua University.
GitHub: `github.com/THU-MAIC/OpenMAIC`

Turns any topic or PDF into an interactive classroom with:
- AI teacher with voice narration and whiteboard
- AI classmates who debate and ask questions
- Auto-generated quizzes with real-time grading
- Interactive simulations

### Integration Approach: Full Merge (One Codebase)

OpenMAIC is **not** deployed separately. It is forked, merged into Study Ops, and deployed as one single Vercel project.

**Why merge instead of iframe:**
- No cross-origin issues
- No JWT passing in URLs
- Direct React component import
- Shared Supabase session (one auth)
- Direct function calls instead of postMessage
- One git push deploys everything

### Merge Steps

```
1. Fork github.com/THU-MAIC/OpenMAIC to your GitHub
2. Clone OpenMAIC separately (as reference)
3. Copy into Study Ops:
   cp -r openmaic/app/classroom        study-ops/app/classroom
   cp -r openmaic/components           study-ops/components/openmaic
   cp -r openmaic/lib                  study-ops/lib/openmaic
   cp -r openmaic/app/api/classroom    study-ops/app/api/classroom
4. Merge package.json dependencies
5. Merge tailwind.config.ts and next.config.ts
6. Configure OpenMAIC to use Groq:
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   OPENAI_MODEL=llama-3.3-70b-versatile
7. Remove OpenMAIC's own auth system
8. Replace with Supabase session (passed as prop)
9. Add onComplete() callback prop
```

### What is Modified in OpenMAIC (~80 lines total)

| Change | Where |
|---|---|
| Remove OpenMAIC auth | `lib/openmaic/auth.ts` — delete |
| Accept userId prop | `components/openmaic/Classroom.tsx` |
| Accept chapter prop | `components/openmaic/Classroom.tsx` |
| Add onComplete callback | `components/openmaic/Classroom.tsx` |
| Save session to Supabase | `components/openmaic/Classroom.tsx` |

Everything else (AI pipeline, teacher agents, classmates, whiteboard, quiz engine, TTS, animations) — **untouched**.

### Usage in Study Ops

```tsx
// app/(app)/exam/[examId]/[sectionId]/page.tsx

import { OpenMaicClassroom } from '@/components/openmaic/Classroom'

<OpenMaicClassroom
  chapter={section.sectionNumber}
  userId={user.id}
  contentText={section.notes?.content?.en}  // your typed notes as source
  onComplete={(sessionData) => {
    // direct function call — no postMessage needed
    saveOmSession(sessionData)
    updateWeakSpots(sessionData.weakTopics)
    updateHeatmap(sessionData.duration)
  }}
/>
```

---

## 6. Bilingual System

### Core Principle
Every piece of user-facing content is stored and displayed in both English and Nepali.

### BilingualText Type

```typescript
// types/index.ts
type BilingualText = {
  en: string
  np: string
}

// Helper used everywhere
function t(text: BilingualText, lang: 'en' | 'np'): string {
  return text[lang] || text.en  // fallback to English if np missing
}
```

### Which Fields Are Bilingual

```
Bilingual (jsonb { en, np }):
  exam_sections.title
  exam_sections.subsections[].title
  exam_notes.content
  question_bank.question
  question_bank.topic
  exam_templates.name
  exam_templates.description
  interview_sessions.qa_log[].question
  interview_sessions.qa_log[].answer

Single language (stays as text):
  Emails, URLs, status enums, dates, UUIDs
```

### Language Toggle
- Global toggle in sidebar: [EN] [NP]
- Persists to `profiles.language` in Supabase
- All content switches instantly via Zustand store
- Zustand: `const { language, setLanguage } = useAppStore()`

### PDF Extraction — Bilingual Prompt
When user uploads a Nepali syllabus PDF:

```
Prompt to Groq Vision:
"You are reading a scanned Nepali government exam syllabus.
 Extract all chapters and subsections.
 Return JSON with both Nepali (original text) and English
 (translated) for every title.
 Format: { sections: [{ number, title: { np, en }, subsections: [...] }] }"
```

### Notes Editor — Both Languages
- Three modes: [English only] [Nepali only] [Both side-by-side]
- AI translate button in editor toolbar
- Both versions saved to `exam_notes.content` as `{ en: "...", np: "..." }`

### AI Responses — Language-Aware
```typescript
const systemPrompt = language === 'np'
  ? `तपाईं एक अध्ययन सहायक हुनुहुन्छ। सधैं नेपालीमा जवाफ दिनुहोस्।`
  : `You are a study assistant. Always respond in English.`
```

---

## 7. PDF Upload System

### Two PDF Types

**Type 1 — Syllabus PDF**
- User uploads → AI extracts bilingual structure → exam skeleton created
- User reviews + edits before confirming
- Original PDF stored in Supabase Storage

**Type 2 — Past Paper / Question Sample PDF**
- User uploads multiple years
- AI extracts all questions with marks, chapter tags, year
- Chapter frequency analysis computed automatically
- Questions added to question_bank

### Processing Pipeline

```
Upload PDF (browser)
      ↓
Supabase Storage (exam-pdfs/{user_id}/...)
      ↓
API route: /api/upload/syllabus or /api/upload/questions
      ↓
Text extraction:
  Digital PDF → pdf-parse npm library (fast, accurate)
  Scanned PDF → Groq Vision (send as base64 image)
      ↓
Groq structures the text into JSON
      ↓
Zod validates the schema
      ↓
Save to exam_sections / question_bank tables
      ↓
chapter_frequency computed from all uploaded papers
```

### Supabase Storage Buckets

```
exam-pdfs/
  {user_id}/
    syllabus/
      {pdf_id}.pdf
    past-papers/
      {pdf_id}_2079.pdf
      {pdf_id}_2078.pdf

study-images/
  {user_id}/
    {topic_id}/
      {image_id}.png               ← AI-generated diagrams, flowcharts, illustrations
```

Storage RLS: Users can only access their own folder.

---

## 8. AI Features

### 8.1 Smart Daily Planner
- Reads: shift config, free window, deadlines, sessions, weak spots, chapter frequency
- Outputs: specific timed plan with editable objectives
- Mood-aware: adjusts difficulty and density
- Triggered: morning (auto) or when user asks

### 8.2 Procrastination Detector
- Monitors session logs passively
- If no session logged in 24hrs AND deadline < 5 days:
  → Push notification with personalised message using real data
  → "You have 3 days until Big Data viva. You studied 0 minutes yesterday."

### 8.3 Deadline Risk Assessor
- Per-subject risk score: Red / Amber / Green
- Inputs: days remaining, hours studied, chapter frequency, confidence rating
- Updates daily
- Shown on dashboard as always-visible scorecard

### 8.4 Study Session Analyser
- Weekly report generated every Sunday night
- Shows: total hours, subject breakdown, avoidance patterns, best study times
- Compares planned vs actual
- Identifies which subjects are being skipped

### 8.5 Viva Weak Spot Tracker
- Every wrong/weak answer in quiz or interview logged
- Builds per-subject weak list with frequency count
- AI assistant surfaces these in next planning session
- "You've struggled with HDFS fault tolerance 3 times. Review before May 5."

### 8.6 Auto Flashcard Generator
- Paste any text → AI generates Q&A pairs
- Saved to question_bank for the relevant chapter
- Removes friction from making flashcards

### 8.7 Public Speaking & Interview Coach
- Mock interview with structured AI feedback
- STAR answer builder from ARFF experience
- Voice mode: mic → Groq Whisper → AI feedback
- Full Nepali mode for Loksewa interview simulation

### 8.8 Confidence Calibrator (Phase 2)
- User rates confidence per topic (1–5)
- AI compares self-rating vs actual quiz performance
- Flags overconfidence (dangerous) vs underconfidence (wasted worry)

### 8.9 AI Context Assembly Strategy
The AI assistant sidebar is the core feature. It needs rich context to generate useful plans — but context windows have limits and costs. This section defines how context is assembled for every AI call.

**Context budget:** Max 2,000 tokens of context per assistant call (leaves room for response).

**Context builder function:** `lib/contextBuilder.ts`

```typescript
// lib/contextBuilder.ts
import { SupabaseClient } from '@supabase/supabase-js'

export type AssistantContext = {
  shift: { type: string; freeWindowStart: string; freeWindowEnd: string }
  deadlines: Array<{ title: string; daysLeft: number; priority: string; status: string }>
  recentSessions: Array<{ subject: string; date: string; duration: number; mood: string }>
  weakSpots: Array<{ topic: string; frequency: number; module: string }>
  topFrequencyChapters: Array<{ chapter: string; percentage: number }>
  energyPattern: { bestWindow: string; avgRating: number } | null
  pendingCaptures: number
}

export async function buildContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AssistantContext> {
  // All queries run in parallel for speed
  const [shift, deadlines, sessions, weakSpots, frequency, energy, captures] =
    await Promise.all([
      getShiftForToday(userId),
      getActiveDeadlines(supabase, userId, 5),          // top 5 by urgency
      getRecentSessions(supabase, userId, 7),            // last 7 days
      getUnresolvedWeakSpots(supabase, userId, 5),       // top 5 by frequency
      getTopFrequencyChapters(supabase, userId, 5),      // top 5 exam chapters
      getEnergyPattern(supabase, userId),                // best window
      getPendingCaptureCount(supabase, userId),
    ])

  return { shift, deadlines, recentSessions: sessions, weakSpots, topFrequencyChapters: frequency, energyPattern: energy, pendingCaptures: captures }
}

export function contextToPrompt(ctx: AssistantContext): string {
  return `
=== USER CONTEXT ===
Shift today: ${ctx.shift.type} | Free window: ${ctx.shift.freeWindowStart}–${ctx.shift.freeWindowEnd}

Upcoming deadlines:
${ctx.deadlines.map(d => `- ${d.title}: ${d.daysLeft} days left [${d.priority}] (${d.status})`).join('\n')}

Last 7 days study:
${ctx.recentSessions.map(s => `- ${s.subject}: ${s.duration}min on ${s.date} (mood: ${s.mood})`).join('\n')}

Weak spots (recurring mistakes):
${ctx.weakSpots.map(w => `- ${w.topic} (flagged ${w.frequency}x in ${w.module})`).join('\n')}

High-frequency exam chapters:
${ctx.topFrequencyChapters.map(c => `- ${c.chapter}: ${c.percentage}% of past papers`).join('\n')}

${ctx.energyPattern ? `Best study window: ${ctx.energyPattern.bestWindow} (avg energy: ${ctx.energyPattern.avgRating}/5)` : ''}
${ctx.pendingCaptures > 0 ? `User has ${ctx.pendingCaptures} unreviewed quick captures.` : ''}
=== END CONTEXT ===`
}
```

**Summarisation rules:**
- Deadlines: only show top 5 by urgency (closest + highest priority)
- Sessions: last 7 days only, summarised as subject + duration + mood
- Weak spots: top 5 by frequency, unresolved only
- Chapters: top 5 by exam frequency percentage
- Energy: single best-window summary, not raw data
- Captures: count only, not full content (user can ask to review)

**When context is refreshed:**
- On every new assistant message (freshest data)
- Cached for 5 minutes if multiple rapid messages (avoid hammering DB)

### AI Usage Limits (multi-user fairness)

```typescript
// Every AI route checks this first:
const usage = await getUsageToday(userId)
if (usage.requests_count >= FREE_TIER_LIMIT) {
  return { error: 'Daily AI limit reached. Resets tomorrow.' }
}
// FREE_TIER_LIMIT = 50 requests/day per user
```

---

## 9. Database Schema

```sql
-- ════════════════════════════════════════════════
-- PROFILES
-- ════════════════════════════════════════════════

CREATE TABLE profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text,
  avatar_url text,
  country text DEFAULT 'Nepal',
  language text DEFAULT 'en',           -- 'en' | 'np'
  onboarding_done boolean DEFAULT false,
  work_type text,                       -- 'shift' | 'regular' | 'student'
  focus_sound text DEFAULT 'lofi',      -- 'lofi' | 'rain' | 'cafe' | 'whitenoise' | 'off'
  focus_volume int DEFAULT 60,          -- 0-100
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- SHIFT CONFIGURATION
-- ════════════════════════════════════════════════

CREATE TABLE shift_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  cycle_start_date date NOT NULL,
  first_shift_type text NOT NULL,       -- 'morning' | 'day'
  shift_a_start time DEFAULT '12:30',
  shift_a_end time DEFAULT '19:00',
  shift_b_start time DEFAULT '06:00',
  shift_b_end time DEFAULT '12:30',
  cooldown_minutes int DEFAULT 30,
  cycle_days int DEFAULT 15,
  has_overtime boolean DEFAULT true,
  max_overtime_hours numeric DEFAULT 3.5,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- DEADLINES
-- ════════════════════════════════════════════════

CREATE TABLE deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  subject text,
  deadline_date date,
  is_tbd boolean DEFAULT false,
  status text DEFAULT 'not_started',    -- 'not_started' | 'in_progress' | 'done'
  priority text DEFAULT 'medium',       -- 'high' | 'medium' | 'low'
  type text,                            -- 'exam' | 'viva' | 'submission' | 'interview'
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- SUBJECTS
-- ════════════════════════════════════════════════

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  color text,
  confidence int DEFAULT 3,             -- 1-5
  exam_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- STUDY SESSIONS
-- ════════════════════════════════════════════════

CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  subject_id uuid REFERENCES subjects,
  plan_id uuid REFERENCES daily_plans,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  pomodoro_count int DEFAULT 0,
  mood text,                            -- 'focused' | 'okay' | 'low' | 'motivated' | 'exhausted'
  notes text,
  source text DEFAULT 'manual',         -- 'manual' | 'timer' | 'openmaic' | 'interview'
  energy_after int,                     -- 1-5 post-session rating
  energy_rated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- AI ASSISTANT & DAILY PLANS
-- ════════════════════════════════════════════════

CREATE TABLE daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  mood text,
  free_window_start time,
  free_window_end time,
  plan_json jsonb,                      -- full editable plan
  status text DEFAULT 'draft',          -- 'draft' | 'active' | 'completed' | 'abandoned'
  ai_reasoning text,
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE session_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES daily_plans NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  subject_id uuid REFERENCES subjects,
  title text NOT NULL,
  estimated_minutes int,
  order_index int,
  status text DEFAULT 'pending',        -- 'pending' | 'done' | 'skipped'
  completed_at timestamptz
);

CREATE TABLE assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL,                   -- 'user' | 'assistant'
  content text NOT NULL,
  context_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- EXAMS (generic exam system)
-- ════════════════════════════════════════════════

CREATE TABLE exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  template_id uuid,                     -- references exam_templates if cloned
  name text NOT NULL,
  description text,
  total_sections int,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exam_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  section_number text,                  -- '1', '3.1', '11.2'
  title jsonb NOT NULL,                 -- { "en": "...", "np": "..." }
  subsections jsonb,                    -- [{ number, title: { en, np }, done }]
  order_index int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE exam_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES exam_sections NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  content jsonb,                        -- { "en": "...", "np": "..." }
  word_count jsonb,                     -- { "en": 120, "np": 95 }
  ai_images jsonb DEFAULT '[]',         -- [{ id, prompt, storage_path, position, alt_text }]
  ai_enhancements jsonb DEFAULT '[]',   -- [{ id, type, selected_text, ai_response, position }]
  last_edited_at timestamptz DEFAULT now()
);

CREATE TABLE exam_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES exam_sections NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  status text DEFAULT 'not_started',    -- 'not_started' | 'in_progress' | 'done'
  confidence int,                       -- 1-5
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE exam_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users NOT NULL,
  name jsonb NOT NULL,                  -- { "en": "...", "np": "..." }
  description jsonb,                    -- { "en": "...", "np": "..." }
  category text,                        -- 'loksewa' | 'university' | 'professional'
  country text DEFAULT 'Nepal',
  is_public boolean DEFAULT false,
  sections_json jsonb,                  -- full bilingual structure
  clone_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- PDF UPLOADS
-- ════════════════════════════════════════════════

CREATE TABLE uploaded_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exam_id uuid REFERENCES exams,
  type text NOT NULL,                   -- 'syllabus' | 'past_paper' | 'notes'
  file_name text,
  storage_path text,                    -- Supabase Storage path
  file_size_kb int,
  processing_status text DEFAULT 'pending', -- 'pending' | 'processing' | 'done' | 'failed'
  extracted_text text,
  processed_json jsonb,
  year text,                            -- for past papers e.g. '2079'
  uploaded_at timestamptz DEFAULT now()
);

CREATE TABLE question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exam_id uuid REFERENCES exams,
  section_id uuid REFERENCES exam_sections,
  source_pdf_id uuid REFERENCES uploaded_pdfs,
  question jsonb NOT NULL,              -- { "en": "...", "np": "..." }
  topic jsonb,                          -- { "en": "...", "np": "..." }
  type text,                            -- 'short' | 'long' | 'mcq'
  marks int,
  chapter text,
  year text,
  frequency int DEFAULT 1,             -- times appeared across papers
  is_public boolean DEFAULT false,
  source text DEFAULT 'past_paper',     -- 'past_paper' | 'ai_generated' | 'manual' | 'flashcard'
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chapter_frequency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exam_id uuid REFERENCES exams NOT NULL,
  section_id uuid REFERENCES exam_sections NOT NULL,
  appearance_count int DEFAULT 0,
  total_papers_analysed int DEFAULT 0,
  frequency_percentage numeric,
  last_computed_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- OPENMAIC SESSIONS
-- ════════════════════════════════════════════════

CREATE TABLE openmaic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  section_id uuid REFERENCES exam_sections,
  study_session_id uuid REFERENCES study_sessions,
  duration_minutes int,
  quiz_score numeric,
  weak_topics jsonb,
  completed_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- INTERVIEW PREP
-- ════════════════════════════════════════════════

CREATE TABLE interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  context text,                         -- 'loksewa' | 'arff_promotion' | 'general'
  language text DEFAULT 'en',           -- 'en' | 'np'
  mode text,                            -- 'text' | 'voice'
  qa_log jsonb,                         -- [{ question: {en,np}, answer, feedback, score }]
  duration_minutes int,
  overall_score numeric,
  completed_at timestamptz DEFAULT now()
);

CREATE TABLE interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  question jsonb NOT NULL,              -- { "en": "...", "np": "..." }
  answer jsonb,                         -- { "en": "...", "np": "..." }
  star_format jsonb,                    -- { situation, task, action, result }
  is_saved boolean DEFAULT false,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- WEAK SPOTS (cross-module)
-- ════════════════════════════════════════════════

CREATE TABLE weak_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  module text NOT NULL,                 -- 'exam' | 'interview' | 'quiz'
  topic text NOT NULL,
  subject_id uuid REFERENCES subjects,
  section_id uuid REFERENCES exam_sections,
  frequency int DEFAULT 1,
  last_flagged_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false
);

-- ════════════════════════════════════════════════
-- NOTIFICATIONS & AI USAGE
-- ════════════════════════════════════════════════

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  requests_count int DEFAULT 0,
  tokens_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  feature text,                         -- 'planner' | 'quiz' | 'interview' | 'risk'
  provider text,                        -- 'groq' | 'openai' | 'claude'
  model text,                           -- model name used
  used_fallback boolean DEFAULT false,
  prompt_tokens int,
  completion_tokens int,
  estimated_cost numeric DEFAULT 0,     -- estimated USD cost for monitoring
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- QUICK CAPTURE (4.10)
-- ════════════════════════════════════════════════

CREATE TABLE quick_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  ai_tag text,                            -- 'weak_spot' | 'note' | 'todo' | 'question'
  subject_id uuid REFERENCES subjects,
  session_id uuid REFERENCES study_sessions,
  promoted boolean DEFAULT false,
  promoted_to text,                       -- 'note' | 'question' | 'deadline'
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- MOCK EXAM RESULTS (4.12)
-- ════════════════════════════════════════════════

CREATE TABLE mock_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  exam_id uuid REFERENCES exams NOT NULL,
  score int,
  max_score int,
  duration_minutes int,
  time_used_minutes int,
  answers_json jsonb,                     -- { question_id, user_answer, score, time_spent }
  debrief_text text,
  taken_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- ANSWER ARCHIVE (4.13)
-- ════════════════════════════════════════════════

CREATE TABLE answer_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  question_id uuid REFERENCES question_bank,
  source text NOT NULL,                   -- 'quiz' | 'interview' | 'mock_exam'
  source_session_id uuid,
  user_answer text,
  ai_feedback text,
  score int,
  max_score int,
  flagged_for_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- ROW LEVEL SECURITY (apply to all tables)
-- ════════════════════════════════════════════════

-- Enable RLS on every table, then add policy:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users_own_data" ON table_name
--   FOR ALL USING (auth.uid() = user_id);
--
-- exam_templates also needs a public read policy:
-- CREATE POLICY "public_templates" ON exam_templates
--   FOR SELECT USING (is_public = true);

-- ════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON daily_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════
-- INDEXES (performance-critical queries)
-- ════════════════════════════════════════════════

-- Core lookups by user
CREATE INDEX idx_deadlines_user ON deadlines(user_id);
CREATE INDEX idx_subjects_user ON subjects(user_id);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_subject ON study_sessions(subject_id);
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
CREATE INDEX idx_session_objectives_plan ON session_objectives(plan_id);
CREATE INDEX idx_assistant_messages_user ON assistant_messages(user_id);

-- Exam module
CREATE INDEX idx_exams_user ON exams(user_id);
CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX idx_exam_notes_section ON exam_notes(section_id);
CREATE INDEX idx_exam_progress_section ON exam_progress(section_id);
CREATE INDEX idx_question_bank_exam ON question_bank(exam_id);
CREATE INDEX idx_question_bank_section ON question_bank(section_id);
CREATE INDEX idx_chapter_frequency_exam ON chapter_frequency(exam_id);

-- Cross-module
CREATE INDEX idx_weak_spots_user ON weak_spots(user_id);
CREATE INDEX idx_weak_spots_subject ON weak_spots(subject_id);
CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_openmaic_sessions_user ON openmaic_sessions(user_id);
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, date);
CREATE INDEX idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX idx_quick_captures_user ON quick_captures(user_id);
CREATE INDEX idx_mock_exam_results_user ON mock_exam_results(user_id);
CREATE INDEX idx_answer_archive_user ON answer_archive(user_id);
CREATE INDEX idx_uploaded_pdfs_user ON uploaded_pdfs(user_id);

-- ════════════════════════════════════════════════
-- NOTIFICATION LOG (tracks sent notifications)
-- ════════════════════════════════════════════════

CREATE TABLE notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL,                     -- 'deadline_warning' | 'no_session' | 'plan_ready'
  title text,
  body text,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX idx_notification_log_user ON notification_log(user_id);
```

---

## 10. Folder Structure

```
study-ops/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── page.tsx
│   │
│   ├── (onboarding)/
│   │   └── onboarding/
│   │       └── page.tsx              ← 4-step setup wizard
│   │
│   ├── (app)/                        ← protected routes
│   │   ├── layout.tsx                ← sidebar + assistant panel
│   │   ├── error.tsx                 ← error boundary for protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── deadlines/
│   │   │   └── page.tsx
│   │   ├── schedule/
│   │   │   └── page.tsx
│   │   ├── timer/
│   │   │   └── page.tsx
│   │   ├── sessions/
│   │   │   └── page.tsx
│   │   ├── subjects/
│   │   │   └── page.tsx
│   │   ├── exam/
│   │   │   ├── page.tsx              ← all exams list
│   │   │   └── [examId]/
│   │   │       ├── page.tsx          ← exam overview + past papers
│   │   │       ├── error.tsx         ← exam-specific error boundary
│   │   │       └── [sectionId]/
│   │   │           └── page.tsx      ← notes + OpenMAIC (lessons + quiz)
│   │   ├── interview/
│   │   │   └── page.tsx
│   │   ├── capture/
│   │   │   └── page.tsx              ← quick capture inbox
│   │   ├── simulator/
│   │   │   └── page.tsx              ← exam day simulator
│   │   ├── archive/
│   │   │   └── page.tsx              ← past answer archive
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── error.tsx                     ← global error boundary
│   │
│   ├── api/
│   │   ├── ai/
│   │   │   ├── assistant/route.ts    ← sidebar chat
│   │   │   ├── planner/route.ts      ← daily plan generator
│   │   │   ├── enhance/route.ts      ← text selection AI actions (ELI5, summarize, elaborate, etc.)
│   │   │   ├── image/route.ts        ← AI image generation for topics
│   │   │   ├── interview/route.ts    ← mock interview
│   │   │   ├── analyse/route.ts      ← session analyser
│   │   │   ├── risk/route.ts         ← deadline risk scorer
│   │   │   ├── simulator/route.ts    ← exam day simulator generator
│   │   │   └── capture/route.ts      ← auto-tag quick captures
│   │   ├── classroom/                ← OpenMAIC API routes (merged)
│   │   │   ├── generate/route.ts
│   │   │   └── agent/route.ts
│   │   ├── upload/
│   │   │   ├── syllabus/route.ts
│   │   │   ├── questions/route.ts
│   │   │   └── process/route.ts      ← shared PDF processing
│   │   ├── export/route.ts           ← data export (4.19)
│   │   ├── push/
│   │   │   ├── subscribe/route.ts
│   │   │   └── send/route.ts
│   │   └── usage/route.ts            ← AI budget check
│   │
│   └── layout.tsx
│
├── components/
│   ├── studyops/
│   │   ├── Sidebar.tsx
│   │   ├── AssistantPanel.tsx        ← persistent AI sidebar
│   │   ├── LanguageToggle.tsx        ← EN / NP toggle
│   │   ├── DeadlineCard.tsx
│   │   ├── PomodoroTimer.tsx
│   │   ├── StudyHeatmap.tsx
│   │   ├── ChapterHeatmap.tsx        ← revision coverage heatmap (4.15)
│   │   ├── RiskBadge.tsx
│   │   ├── ShiftBadge.tsx
│   │   ├── ObjectiveList.tsx         ← draggable session plan
│   │   ├── NotesEditor.tsx           ← bilingual markdown editor
│   │   ├── DocumentationReader.tsx   ← GitBook-style reader with sidebar nav (4.7)
│   │   ├── AIContextMenu.tsx         ← floating toolbar on text selection (4.7)
│   │   ├── ImportWizard.tsx          ← text/PDF import + AI structure suggestion (4.7)
│   │   ├── W3Reader.tsx              ← W3Schools-style reader (legacy, may merge with DocumentationReader)
│   │   ├── FrequencyChart.tsx        ← chapter frequency from past papers
│   │   ├── MoodSelector.tsx          ← includes 'exhausted' for tired mode (4.17)
│   │   ├── EnergyRater.tsx           ← post-session 1-5 energy rating (4.11)
│   │   ├── QuickCapture.tsx          ← floating capture button + inbox (4.10)
│   │   ├── FocusSound.tsx            ← ambient sound player + timer integration (4.16)
│   │   ├── AnswerArchive.tsx         ← past answer viewer with comparison (4.13)
│   │   └── OfflineIndicator.tsx      ← offline status badge (4.18)
│   └── openmaic/                     ← OpenMAIC components (merged in)
│       ├── Classroom.tsx             ← modified: accepts userId, onComplete props
│       ├── Teacher.tsx
│       ├── Classmate.tsx
│       ├── Whiteboard.tsx
│       └── QuizEngine.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← browser Supabase client
│   │   ├── server.ts                 ← server Supabase client
│   │   └── types.ts                  ← auto-generated from schema (supabase gen types)
│   ├── ai.ts                         ← unified AI provider with fallback chain
│   ├── contextBuilder.ts             ← AI context assembly for assistant (8.9)
│   ├── rateLimit.ts                  ← in-memory API rate limiter (13.2)
│   ├── syncManager.ts                ← offline IndexedDB → Supabase sync (4.18)
│   ├── shiftUtils.ts                 ← shift cycle calculator
│   ├── bsUtils.ts                    ← Bikram Sambat ↔ AD date converter (4.14)
│   ├── notificationUtils.ts          ← Web Push helpers
│   ├── pdfUtils.ts                   ← PDF text extraction + OCR
│   ├── bilingualUtils.ts             ← t() helper, translation prompts
│   └── openmaic/                     ← OpenMAIC lib (merged in)
│       ├── agents.ts
│       ├── pipeline.ts
│       └── config.ts
│
├── hooks/
│   ├── useShift.ts                   ← current shift + free window
│   ├── useDeadlines.ts
│   ├── useSession.ts
│   └── useAssistant.ts
│
├── store/
│   └── useAppStore.ts                ← Zustand: language, user, sidebar state
│
├── types/
│   ├── index.ts                      ← BilingualText + all custom types
│   └── openmaic.ts                   ← OpenMAIC types (merged)
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    ← full schema above + RLS
│   └── edge-functions/
│       └── send-reminder/
│           └── index.ts              ← daily 8am NPT deadline checker
│
├── public/
│   ├── sw.js                         ← service worker for push + offline caching (4.18)
│   ├── audio/                        ← lofi/rain/cafe/whitenoise loops (4.16)
│   └── icons/
│
├── .env.local                        ← all environment variables
├── tailwind.config.ts
├── tsconfig.json                     ← strict: true
├── next.config.ts
└── package.json
```

---

## 11. Build Order

| Step | What to build | Output |
|---|---|---|
| 1 | Supabase: run schema SQL, enable RLS, create storage buckets | Database ready |
| 2 | Google OAuth: Cloud Console setup, add to Supabase Auth | Auth configured |
| 3 | Next.js scaffold: pnpm create next-app, add Tailwind, shadcn/ui, Zustand, Zod | Project running |
| 4 | Supabase client setup: client.ts, server.ts, generate types | DB connected |
| 5 | Auth flow: Google login page, callback route, middleware protection | Users can sign in |
| 6 | Onboarding wizard: 4-step setup, creates profile + shift_config | New users onboarded |
| 7 | Merge OpenMAIC: copy files, merge deps, configure Groq, modify ~80 lines | OpenMAIC integrated |
| 8 | AI assistant sidebar: Groq chat, context builder, message history | Core feature live |
| 9 | Dashboard: shift calculator, free window, risk scores, streak | Personalised home |
| 10 | Deadlines page: countdown cards, status toggle, TBD support | Urgency visible |
| 11 | Pomodoro timer + session auto-log | Tracking works |
| 12 | Study sessions heatmap | Progress visible |
| 13 | Exam module: create exam, upload syllabus PDF, section generation | Exam skeleton ready |
| 14 | Notes editor: bilingual markdown, W3Schools reader, language toggle | Notes system live |
| 15 | OpenMAIC tab in exam section: wire component, onComplete callback | Interactive lessons |
| 16 | OpenMAIC quiz in exam section: wire quiz engine via onComplete | Quiz system live |
| 17 | Past paper upload: extract questions, frequency analysis | Intelligence layer |
| 18 | Error boundaries: global + route-level error.tsx files | Graceful error handling |
| ── | **── MVP COMPLETE ── ship and use for May exams ──** | **── Milestone ──** |
| 19 | Interview prep: text mode, STAR builder, question bank | Interview prep live |
| 20 | Voice mode: Groq Whisper transcription, Nepali support | Voice interview |
| 21 | Weak spot tracker: cross-module, persistent, surfaces in assistant | Smart assistant |
| 22 | AI daily planner + risk assessor | Planning system live |
| 23 | Procrastination detector + push notifications | Accountability live |
| 24 | Session analyser (weekly report) | Habit insights |
| 25 | Exam template system: publish, clone, public templates | Multi-user value |
| 26 | Quick Capture: floating button, inbox, AI auto-tag | Frictionless capture |
| 27 | Study Energy Log: post-session rating, trend chart | Real performance data |
| 28 | Exam Day Simulator: timed full paper, AI debrief | Exam pressure training |
| 29 | Past Answer Archive: history, comparison, flagging | Growth visibility |
| 30 | BS Calendar: bsUtils.ts, deadline/schedule BS display | Nepal date support |
| 31 | Chapter Revision Heatmap: coverage view per exam | Gap visualisation |
| 32 | Focus Music: ambient player, Pomodoro integration | Low-friction sound |
| 33 | Tired Mode: exhausted mood + AI tone adjustment | Shift-worker UX |
| 34 | Offline/PWA: service worker caching, IndexedDB sync | Works without internet |
| 35 | Data Export: settings page, ZIP download of all data | User data ownership |
| 36 | Rate limiting + AI cost monitoring | Abuse prevention |
| 37 | AI usage limits per user | Production-ready |
| 38 | Accessibility audit: Lighthouse, keyboard nav, ARIA | Inclusive UX |
| 39 | Deploy to Vercel, set all env vars, test end-to-end | Live |

---

## 12. Pre-Build Checklist

```
□ Groq API key
  → console.groq.com → API Keys → Create key
  → Save as: GROQ_API_KEY

□ Supabase project (free tier)
  → supabase.com → New project → Choose a strong password
  → Save: NEXT_PUBLIC_SUPABASE_URL
  → Save: NEXT_PUBLIC_SUPABASE_ANON_KEY
  → Save: SUPABASE_SERVICE_ROLE_KEY (Settings → API)

□ Google OAuth credentials
  → console.cloud.google.com
  → New project → APIs & Services → Credentials
  → Create OAuth 2.0 Client ID → Web application
  → Authorised redirect URIs:
      http://localhost:3000/auth/callback
      https://your-app.vercel.app/auth/callback
  → Save: GOOGLE_CLIENT_ID
  → Save: GOOGLE_CLIENT_SECRET
  → Add both to Supabase → Authentication → Providers → Google

□ GitHub repository
  → github.com → New → name: "study-ops" → Private
  → git init, git remote add origin ...

□ Vercel project
  → vercel.com → Add New Project → Import "study-ops"
  → Don't deploy yet — add env vars first

□ OpenMAIC fork
  → github.com/THU-MAIC/OpenMAIC → Fork to your account

□ Web Push VAPID keys (for notifications)
  → Run: npx web-push generate-vapid-keys
  → Save: NEXT_PUBLIC_VAPID_PUBLIC_KEY
  → Save: VAPID_PRIVATE_KEY

□ Additional npm packages needed for new features
  → pnpm add nepali-date-converter       ← Bikram Sambat calendar (4.14)
  → pnpm add groq-sdk openai @anthropic-ai/sdk  ← AI providers
  → pnpm add idb                          ← IndexedDB wrapper for offline/PWA (4.18)
```

### .env.local template
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI — Primary
GROQ_API_KEY=

# AI — Fallback 1
OPENAI_API_KEY=

# AI — Fallback 2
ANTHROPIC_API_KEY=

# Google OAuth (also set in Supabase dashboard)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AI_DAILY_LIMIT=50
```

---

## 13. Architecture Patterns

### 13.1 Error Boundary Strategy

Every page and major component must handle errors gracefully. No white screens.

**Global error boundary:** `app/error.tsx` (Next.js convention)

```tsx
// app/error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  )
}
```

**Component-level error handling:**
- Every `async` component that fetches data wraps in try/catch
- Loading states: use Next.js `loading.tsx` per route segment
- AI failures: show "AI is temporarily unavailable" with a retry button, never crash the page
- Supabase errors: log to console in dev, show user-friendly message in prod

**Error hierarchy:**
```
app/error.tsx                    ← catches unhandled errors app-wide
app/(app)/error.tsx              ← catches errors in the protected layout
app/(app)/exam/[examId]/error.tsx ← catches exam-specific errors
```

### 13.2 Rate Limiting

Beyond the 50/day AI limit per user, add general API rate limiting to prevent abuse.

**Implementation:** Use `next-rate-limit` or a simple in-memory rate limiter on API routes:

```typescript
// lib/rateLimit.ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked
  entry.count++
  return true // allowed
}
```

**Limits per route category:**
| Route | Limit | Window |
|---|---|---|
| `/api/ai/*` | 50/day per user | 24 hours (via `ai_usage` table) |
| `/api/upload/*` | 10/hour per user | 1 hour |
| `/api/push/*` | 5/minute per user | 1 minute |
| All other API routes | 100/minute per user | 1 minute |

### 13.3 AI Cost Monitoring

When fallback providers fire, real money is spent. Monitor this proactively.

**Cost estimation in `lib/ai.ts`:**
```typescript
const COST_PER_1K_TOKENS: Record<string, number> = {
  'llama-3.3-70b-versatile': 0,       // Groq free tier
  'llama-3.1-8b-instant': 0,          // Groq free tier
  'gpt-4o': 0.005,                    // $5/1M input tokens
  'gpt-4o-mini': 0.00015,             // $0.15/1M input tokens
  'claude-sonnet-4-5': 0.003,           // $3/1M input tokens
  'claude-haiku-4-5': 0.0008,           // $0.80/1M input tokens
}

export function estimateCost(model: string, tokens: number): number {
  return (tokens / 1000) * (COST_PER_1K_TOKENS[model] ?? 0)
}
```

**Dashboard alert (future):**
When cumulative `estimated_cost` in `ai_logs` exceeds $5/month, surface a warning in the admin/settings view.

### 13.4 Accessibility

Ensure the app is usable by all users, including those with visual or motor impairments.

**Baseline requirements:**
- All interactive elements have `aria-label` or visible labels
- Keyboard navigation works for all primary flows (sidebar, timer, plan editing)
- Focus management: when modals open, focus traps inside; when closed, focus returns
- Colour contrast: all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Skip-to-content link on every page
- shadcn/ui components already include ARIA — do not override or remove

**Audit plan:**
- Run Lighthouse accessibility audit before each major release
- Test with keyboard-only navigation (no mouse) on all core flows
- Test with screen reader (NVDA on Windows) on dashboard, notes editor, and timer

---

## 14. AI Coding Prompt

> Copy this entire prompt into Cursor, Windsurf, Claude, or any AI coding tool to begin building. Update the placeholder values before pasting.

---

```
You are helping me build "Study Ops" — a full-stack AI-powered study assistant and exam preparation platform. This is a personal project that will scale to public users. Build everything production-ready, type-safe, and scalable from the start.

---

TECH STACK:
- Framework: Next.js 14 with App Router
- Language: TypeScript (strict mode — tsconfig strict: true)
- Styling: Tailwind CSS + shadcn/ui components
- Database: Supabase (PostgreSQL + Row Level Security + Storage)
- Auth: Supabase Auth with Google OAuth
- AI — Primary: Groq API — llama-3.3-70b-versatile for complex, llama-3.1-8b-instant for simple, whisper-large-v3 for voice
- AI — Fallback 1: OpenAI — gpt-4o for complex, gpt-4o-mini for simple
- AI — Fallback 2: Anthropic Claude — claude-sonnet-4-5 for complex, claude-haiku-4-5 for simple
- All AI calls go through lib/ai.ts which auto-retries down the fallback chain on 429/503/timeout
- State: Zustand
- Validation: Zod on all API routes
- Package manager: pnpm
- Hosting: Vercel

---

CORE CONTEXT:
The primary user is a shift worker (ARFF firefighter at PIA airport in Nepal) who is also a final-year BSc Computer Science student and Loksewa Level 5 exam candidate.

Shift configuration:
- Shift A (Day): 12:30 PM – 7:00 PM, OT possible up to 3.5 hrs
- Shift B (Morning): 6:00 AM – 12:30 PM
- 30-minute cooldown before and after each shift
- Cycles alternate every 15 days
- shiftUtils.ts must auto-calculate which shift and free study window for any given date

---

BILINGUAL SYSTEM:
Every content field (chapter titles, notes, questions, interview Q&A) is stored as:
  { "en": "English text", "np": "Nepali text" }
Using the TypeScript type: BilingualText = { en: string; np: string }

Helper function t(text: BilingualText, lang: 'en' | 'np'): string

Global language toggle stored in Zustand + persisted to profiles.language in Supabase.
AI responses must match user's chosen language.
PDF extraction must return bilingual JSON using Groq Vision.

---

KEY FEATURES TO BUILD:

1. AI PERSONAL ASSISTANT (persistent left sidebar on every page)
   - User types naturally: "I want to study Chemistry of Fire today"
   - AI reads: shift schedule, deadlines, past sessions, weak spots, chapter frequency from past papers
   - Context assembled via lib/contextBuilder.ts (max 2,000 tokens, top-5 per category)
   - AI generates specific timed study plan with editable objectives
   - Mood selector: Focused / Okay / Low energy / Motivated / Exhausted — adjusts plan
   - Objectives are draggable, editable, removable
   - All conversation history saved to assistant_messages table

2. EXAM MODULE (generic — not hardcoded)
   - User uploads syllabus PDF → Groq Vision extracts bilingual chapter structure
   - User uploads past papers → Groq extracts bilingual questions + computes chapter frequency
   - Per section: 3 tabs — My Notes / Interactive Lesson / Quiz
   - My Notes: bilingual markdown editor + W3Schools-style live reader (sidebar nav, breadcrumbs, prev/next)
   - Interactive Lesson: OpenMAIC classroom component (merged, not iframed)
   - Quiz: handled by OpenMAIC's built-in quiz engine (no separate quiz generator)
   - Public exam templates: users can publish and clone structures

3. OPENMAIC INTEGRATION (merged into same codebase)
   - Fork github.com/THU-MAIC/OpenMAIC
   - Copy app/classroom, components, lib/openmaic into Study Ops
   - Merge package.json dependencies
   - Configure OpenMAIC to use Groq via OpenAI-compatible base URL
   - Remove OpenMAIC's own auth — replace with Supabase session passed as prop
   - Modify Classroom.tsx to accept: userId prop, chapter prop, onComplete callback
   - onComplete writes directly to Supabase: openmaic_sessions, weak_spots, study_sessions
   - OpenMAIC's QuizEngine handles quiz generation, grading, and feedback for all exam sections
   - No iframe, no postMessage — direct React component import

4. PDF UPLOAD SYSTEM
   - Upload to Supabase Storage: exam-pdfs/{user_id}/syllabus/ and /past-papers/
   - Digital PDF → pdf-parse for text extraction
   - Scanned PDF → Groq Vision (send as base64 image pages)
   - Syllabus prompt: extract bilingual chapter structure as JSON
   - Past paper prompt: extract bilingual questions with marks, chapter, year
   - Compute chapter_frequency table after each past paper upload

5. INTERVIEW PREP MODULE
   - Mock interview: text mode + voice mode (Groq Whisper)
   - Language toggle: English / Nepali per session
   - Context: Loksewa / ARFF Promotion / General
   - STAR answer builder: user describes ARFF experience → AI formats it
   - Scenario questions cross-reference user's exam notes for answer validation
   - All sessions logged, weak areas tracked

6. AI FEATURES (across all modules)
   - Daily planner: shift-aware, deadline-aware, reads all user data
   - Risk assessor: per-subject score (Red/Amber/Green) on dashboard
   - Procrastination detector: push notification if no session in 24hrs + deadline close
   - Session analyser: weekly report, avoidance patterns, best study times
   - Weak spot tracker: cross-module, frequency count, surfaces in assistant
   - AI usage limit: 50 requests/day per user, checked before every AI call

7. PUSH NOTIFICATIONS
   - Web Push API + service worker (public/sw.js)
   - Supabase Edge Function runs daily at 8:00 AM Nepal time
   - Triggers: deadline ≤ 5 days, no session in 24hrs, daily plan ready

8. ARCHITECTURE PATTERNS
   - Error boundaries: app/error.tsx (global) + app/(app)/error.tsx + app/(app)/exam/[examId]/error.tsx
   - Rate limiting: lib/rateLimit.ts — in-memory per-user limiter on all API routes
   - AI cost monitoring: estimated_cost logged per AI call in ai_logs table
   - Offline/PWA: service worker caching for notes/plans, IndexedDB sync via lib/syncManager.ts
   - Data export: API route at app/api/export/route.ts, ZIP download of all user data
   - Accessibility: ARIA labels, keyboard navigation, WCAG AA contrast, Lighthouse audits

---

DATABASE:
All tables have user_id + Row Level Security enabled.
BilingualText fields stored as jsonb.
Schema includes indexes on all user_id, exam_id, section_id columns.
Schema includes updated_at triggers on profiles and daily_plans.
Run full schema from the spec file before starting.
Generate TypeScript types using: supabase gen types typescript --local > lib/supabase/types.ts

Key tables:
profiles, shift_configs, deadlines, subjects, study_sessions,
daily_plans, session_objectives, assistant_messages,
exams, exam_sections, exam_notes, exam_progress, exam_templates,
uploaded_pdfs, question_bank, chapter_frequency,
openmaic_sessions, interview_sessions, interview_answers,
weak_spots, push_subscriptions, ai_usage, ai_logs,
quick_captures, mock_exam_results, answer_archive, notification_log

Key lib files:
lib/ai.ts — unified AI provider with Groq → OpenAI → Claude fallback chain
lib/contextBuilder.ts — assembles user context for AI assistant (max 2,000 tokens)
lib/rateLimit.ts — in-memory API rate limiter
lib/syncManager.ts — offline IndexedDB → Supabase sync on reconnect
lib/shiftUtils.ts — shift cycle calculator
lib/bsUtils.ts — Bikram Sambat ↔ AD date converter
lib/bilingualUtils.ts — t() helper, translation prompts
lib/pdfUtils.ts — PDF text extraction + OCR
lib/notificationUtils.ts — Web Push helpers

---

CODE STANDARDS:
- TypeScript strict mode everywhere
- Zod schema validation on every API route input
- All Supabase calls use server client in API routes, browser client in components
- Error handling on every async operation
- Loading and error states on every UI component
- Error boundaries at global, layout, and feature-route levels
- Rate limiting on all API routes (50/day AI, 10/hr uploads, 100/min general)
- Mobile-first responsive design
- All content text goes through t(text, language) helper
- Accessibility: ARIA labels, keyboard nav, WCAG AA contrast

---

BUILD ORDER (do these in sequence):
Step 1: Supabase schema (with indexes + triggers) + RLS + storage buckets + Google OAuth
Step 2: Next.js project init + pnpm + Tailwind + shadcn/ui + Zustand + Zod
Step 3: Supabase client setup + type generation
Step 4: Auth: Google login + callback + middleware route protection
Step 5: Onboarding wizard (4 steps: exam type, deadlines, shift config, subjects)
Step 6: Merge OpenMAIC (copy files, merge deps, configure Groq, modify Classroom.tsx)
Step 7: AI assistant sidebar (Groq chat, context builder, persistent history)
Step 8: Dashboard (shift calculator, free window, risk scores, streak)
... continue per the full build order in the spec (39 steps, MVP at step 18)

---

START WITH: Step 1 — Generate the complete Supabase SQL migration file including all tables, indexes, triggers, RLS policies, and storage bucket setup. Then walk me through Google OAuth configuration in the Supabase dashboard.
```

---

*End of Study Ops Specification v1.1*
