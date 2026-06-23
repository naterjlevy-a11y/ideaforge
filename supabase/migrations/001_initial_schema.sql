-- IdeaForge Initial Schema
-- Run this in Supabase: SQL Editor → paste entire file → Run

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE idea_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed');
CREATE TYPE idea_visibility AS ENUM ('public', 'private');
CREATE TYPE section_type AS ENUM (
  'executive_summary', 'problem_statement', 'target_users',
  'features_mvp', 'features_v2', 'user_stories',
  'system_architecture', 'data_model', 'api_design',
  'security', 'performance', 'error_handling',
  'deployment', 'testing', 'roadmap',
  'open_questions', 'sanity_check', 'next_steps'
);

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      SPLIT_PART(NEW.email, '@', 1)
    ) || '_' || SUBSTR(NEW.id::TEXT, 1, 4)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- IDEAS
-- ─────────────────────────────────────────────
CREATE TABLE ideas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 3 AND 120),
  raw_input              TEXT NOT NULL CHECK (LENGTH(raw_input) BETWEEN 20 AND 2000),
  status                 idea_status DEFAULT 'pending',
  visibility             idea_visibility DEFAULT 'private',
  duration_minutes       INTEGER NOT NULL CHECK (duration_minutes BETWEEN 60 AND 1440),
  iteration_count        INTEGER DEFAULT 0,
  max_iterations         INTEGER NOT NULL,
  iteration_interval_min INTEGER DEFAULT 30,
  next_expansion_at      TIMESTAMPTZ,
  started_at             TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  paused_at              TIMESTAMPTZ,
  view_count             INTEGER DEFAULT 0,
  fork_count             INTEGER DEFAULT 0,
  like_count             INTEGER DEFAULT 0,
  forked_from_id         UUID REFERENCES ideas(id),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX ideas_user_id_idx ON ideas(user_id);
CREATE INDEX ideas_status_next_expansion_idx ON ideas(status, next_expansion_at)
  WHERE deleted_at IS NULL;
CREATE INDEX ideas_visibility_created_idx ON ideas(visibility, created_at DESC)
  WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER ideas_touch_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────
-- TRD SECTIONS
-- ─────────────────────────────────────────────
CREATE TABLE trd_sections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  type       section_type NOT NULL,
  content    TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  iteration  INTEGER NOT NULL,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idea_id, type)
);

CREATE INDEX trd_sections_idea_id_idx ON trd_sections(idea_id);

-- Auto word count
CREATE OR REPLACE FUNCTION update_word_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.word_count := ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(TRIM(NEW.content), '\s+'), 1);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trd_sections_word_count
  BEFORE INSERT OR UPDATE ON trd_sections
  FOR EACH ROW EXECUTE FUNCTION update_word_count();

-- ─────────────────────────────────────────────
-- TRD SECTION HISTORY
-- ─────────────────────────────────────────────
CREATE TABLE trd_section_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES trd_sections(id) ON DELETE CASCADE,
  idea_id    UUID NOT NULL,
  type       section_type NOT NULL,
  content    TEXT NOT NULL,
  version    INTEGER NOT NULL,
  iteration  INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION archive_trd_section()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO trd_section_history (section_id, idea_id, type, content, version, iteration)
    VALUES (OLD.id, OLD.idea_id, OLD.type, OLD.content, OLD.version, OLD.iteration);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_trd_section_update
  BEFORE UPDATE ON trd_sections
  FOR EACH ROW EXECUTE FUNCTION archive_trd_section();

-- ─────────────────────────────────────────────
-- FLOWCHARTS
-- ─────────────────────────────────────────────
CREATE TABLE flowcharts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  mermaid_source TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  iteration      INTEGER NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX flowcharts_idea_id_version_idx ON flowcharts(idea_id, version DESC);

-- ─────────────────────────────────────────────
-- QUESTIONS
-- ─────────────────────────────────────────────
CREATE TABLE questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id          UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  iteration        INTEGER NOT NULL,
  question_text    TEXT NOT NULL,
  question_context TEXT,
  answer_text      TEXT,
  auto_assumed     BOOLEAN DEFAULT FALSE,
  auto_assumption  TEXT,
  answered_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX questions_idea_id_idx ON questions(idea_id, created_at DESC);

-- ─────────────────────────────────────────────
-- EXPANSION LOGS
-- ─────────────────────────────────────────────
CREATE TABLE expansion_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id           UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  iteration         INTEGER NOT NULL,
  model_used        TEXT NOT NULL,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  cost_usd          NUMERIC(10,6) DEFAULT 0,
  sections_updated  TEXT[],
  questions_asked   INTEGER DEFAULT 0,
  duration_ms       INTEGER,
  success           BOOLEAN NOT NULL,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX expansion_logs_idea_id_idx ON expansion_logs(idea_id, iteration);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE trd_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trd_section_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowcharts ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expansion_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "owner_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "public_read_profile" ON profiles FOR SELECT USING (TRUE);

-- ideas
CREATE POLICY "owner_ideas" ON ideas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public_read_ideas" ON ideas FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);

-- trd_sections (access follows idea visibility)
CREATE POLICY "trd_owner" ON trd_sections FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = trd_sections.idea_id AND user_id = auth.uid()));
CREATE POLICY "trd_public_read" ON trd_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = trd_sections.idea_id AND visibility = 'public' AND deleted_at IS NULL));

-- flowcharts
CREATE POLICY "flowchart_owner" ON flowcharts FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = flowcharts.idea_id AND user_id = auth.uid()));
CREATE POLICY "flowchart_public_read" ON flowcharts FOR SELECT
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = flowcharts.idea_id AND visibility = 'public' AND deleted_at IS NULL));

-- questions (owner only — contains assumptions that may be private)
CREATE POLICY "questions_owner" ON questions FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = questions.idea_id AND user_id = auth.uid()));

-- expansion logs (owner only)
CREATE POLICY "logs_owner" ON expansion_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = expansion_logs.idea_id AND user_id = auth.uid()));

-- trd_section_history (owner only)
CREATE POLICY "history_owner" ON trd_section_history FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE id = trd_section_history.idea_id AND user_id = auth.uid()));
