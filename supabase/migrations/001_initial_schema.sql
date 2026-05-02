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
-- DAILY PLANS
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
-- SESSION OBJECTIVES
-- ════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════
-- ASSISTANT MESSAGES
-- ════════════════════════════════════════════════

CREATE TABLE assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL,                   -- 'user' | 'assistant'
  content text NOT NULL,
  context_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════
-- EXAMS
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
-- QUICK CAPTURE
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
-- MOCK EXAM RESULTS
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
-- ANSWER ARCHIVE
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
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_frequency ENABLE ROW LEVEL SECURITY;
ALTER TABLE openmaic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_archive ENABLE ROW LEVEL SECURITY;

-- Common policy for all tables using 'user_id'
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name NOT IN ('notification_log', 'profiles', 'exam_templates')
  LOOP
    EXECUTE format('CREATE POLICY "users_own_data" ON %I FOR ALL USING (auth.uid() = user_id);', t);
  END LOOP;
END $$;

-- profiles uses 'id' instead of 'user_id'
CREATE POLICY "users_own_profile" ON profiles FOR ALL USING (auth.uid() = id);

-- exam_templates uses 'created_by'
CREATE POLICY "users_own_templates" ON exam_templates FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "public_templates" ON exam_templates FOR SELECT USING (is_public = true);


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
-- INDEXES
-- ════════════════════════════════════════════════

CREATE INDEX idx_deadlines_user ON deadlines(user_id);
CREATE INDEX idx_subjects_user ON subjects(user_id);
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_subject ON study_sessions(subject_id);
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
CREATE INDEX idx_session_objectives_plan ON session_objectives(plan_id);
CREATE INDEX idx_assistant_messages_user ON assistant_messages(user_id);
CREATE INDEX idx_exams_user ON exams(user_id);
CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX idx_exam_notes_section ON exam_notes(section_id);
CREATE INDEX idx_exam_progress_section ON exam_progress(section_id);
CREATE INDEX idx_question_bank_exam ON question_bank(exam_id);
CREATE INDEX idx_question_bank_section ON question_bank(section_id);
CREATE INDEX idx_chapter_frequency_exam ON chapter_frequency(exam_id);
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
-- NOTIFICATION LOG
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
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_notifications" ON notification_log FOR SELECT USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-materials', 'study-materials', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for study-materials bucket
CREATE POLICY "authenticated_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'study-materials');
CREATE POLICY "authenticated_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'study-materials');
CREATE POLICY "authenticated_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'study-materials');
CREATE POLICY "authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'study-materials');
