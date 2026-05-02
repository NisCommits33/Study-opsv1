# Study Ops — Sprint Roadmap

This document outlines the phased development of the Study Ops platform, broken down into 5 focused sprints based on the project specification.

## 🎯 Objective: MVP by Sprint 3 (May Exams)

---

### 🏃 Sprint 1: The Foundation (Steps 1-6)
**Goal:** Setup environment, database, and user onboarding.
- [] **Step 1:** Supabase Setup (Run Schema, RLS, Storage Buckets)
- [ ] **Step 2:** Google OAuth Configuration
- [ ] **Step 3:** Next.js Scaffold (Tailwind, shadcn/ui, Zustand, Zod)
- [ ] **Step 4:** Supabase Client & Type Generation
- [ ] **Step 5:** Auth Flow (Login, Callback, Middleware Protection)
- [ ] **Step 6:** Onboarding Wizard (4-step setup: profile + shift config)

---

### 🏃 Sprint 2: Assistant & Core Dashboard (Steps 7-12)
**Goal:** Implement the AI engine and the shift-aware dashboard.
- [x] **Step 7:** Merge OpenMAIC (Merge deps, configure Groq, modify Classroom.tsx)
- [x] **Step 8:** AI Assistant Sidebar (Groq chat, context builder, history)
- [x] **Step 9:** Dashboard (Shift calculator, free window, risk scores, streak)
- [x] **Step 10:** Deadlines Page (Countdown cards, status toggle, TBD support)
- [x] **Step 11:** Pomodoro Timer + Session Auto-log
- [x] **Step 12:** Study Sessions Heatmap (GitHub-style)

---

### 🏃 Sprint 3: The Knowledge Base — MVP (Steps 13-18)
**Goal:** Core study functionality for the May exams.
- [x] **Step 13:** Exam Module (Syllabus PDF upload, chapter generation)
- [x] **Step 14:** Notes Editor (Bilingual markdown, reader, language toggle)
- [x] **Step 15:** OpenMAIC Lesson Tab (Wire component, onComplete callback)
- [x] **Step 16:** OpenMAIC Quiz Engine (Wire to section completion)
- [x] **Step 17:** Past Paper Upload (Extract questions, frequency analysis)
- [x] **Step 18:** Error Boundaries & Graceful Handling
- [x] **🚀 MVP COMPLETE**

---

### 🏃 Sprint 4: Intelligence & Accountability (Steps 19-25)
**Goal:** Smart planning and active reminders.
- [x] **Step 19:** Interview Prep (Text mode, STAR builder, question bank)
- [ ] **Step 20:** Voice Mode (Groq Whisper, Nepali support)
- [ ] **Step 21:** Weak Spot Tracker (Cross-module persistence)
- [x] **Step 22:** AI Daily Planner + Risk Assessor
- [x] **Step 23:** Procrastination Detector + Push Notifications
- [ ] **Step 24:** Session Analyser (Weekly habit insights)
- [ ] **Step 25:** Exam Template System (Publish/Clone structures)

---

### 🏃 Sprint 5: Advanced Features & Polish (Steps 26-39)
**Goal:** Frictionless capture, offline support, and final refinements.
- [ ] **Step 26:** Quick Capture (Floating button, AI auto-tagging)
- [ ] **Step 27:** Study Energy Log (Post-session rating, trend charts)
- [ ] **Step 28:** Exam Day Simulator (Timed full paper, AI debrief)
- [ ] **Step 29:** Past Answer Archive (Comparison & growth tracking)
- [ ] **Step 30:** BS Calendar (Bikram Sambat Nepali date support)
- [ ] **Step 31:** Chapter Revision Heatmap (Gap visualization)
- [ ] **Step 32:** Focus Music (Ambient player, Pomodoro integration)
- [ ] **Step 33:** Tired Mode (Exhausted mood + AI tone adjustment)
- [ ] **Step 34:** Offline/PWA (Service worker caching, IndexedDB sync)
- [ ] **Step 35:** Data Export (ZIP download of all personal data)
- [ ] **Step 36-39:** Security, Monitoring, and Deployment

---

## 🛠 Tech Stack Recap
- **Frontend:** Next.js 14, Tailwind, shadcn/ui, Zustand
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** Groq (Llama 3.3/3.1, Whisper) + OpenAI/Claude Fallbacks
- **Utilities:** `nepali-date-converter`, `pdf-parse`, `idb` (IndexedDB)
