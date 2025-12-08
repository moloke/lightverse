-- Create streaks table
-- Tracks daily user activity for streak counting

CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  succeeded BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own streaks
CREATE POLICY "Users can view own streaks"
  ON public.streaks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON public.streaks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Prevent duplicate entries for same user and date
CREATE UNIQUE INDEX IF NOT EXISTS streaks_user_date_idx ON public.streaks(user_id, date);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS streaks_user_id_idx ON public.streaks(user_id);
CREATE INDEX IF NOT EXISTS streaks_date_idx ON public.streaks(date DESC);

-- Add comment
COMMENT ON TABLE public.streaks IS 'Tracks daily user activity for streak counting';
