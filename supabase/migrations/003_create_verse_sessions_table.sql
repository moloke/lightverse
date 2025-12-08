-- Create verse_sessions table
-- Tracks each user's active verse memorization session

CREATE TABLE IF NOT EXISTS public.verse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  verse_id UUID NOT NULL REFERENCES public.bible_verses(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1 NOT NULL CHECK (current_step >= 1 AND current_step <= 7),
  total_steps INTEGER DEFAULT 7 NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  awaiting_reply BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.verse_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.verse_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.verse_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.verse_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.verse_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS verse_sessions_user_id_idx ON public.verse_sessions(user_id);
CREATE INDEX IF NOT EXISTS verse_sessions_completed_at_idx ON public.verse_sessions(completed_at);
CREATE INDEX IF NOT EXISTS verse_sessions_active_idx ON public.verse_sessions(user_id, completed_at) 
  WHERE completed_at IS NULL;

-- Ensure only one active session per user
CREATE UNIQUE INDEX IF NOT EXISTS verse_sessions_one_active_per_user_idx 
  ON public.verse_sessions(user_id) 
  WHERE completed_at IS NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_verse_sessions_updated_at
  BEFORE UPDATE ON public.verse_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.verse_sessions IS 'Tracks user verse memorization progress';
