-- Fix streaks table schema to match code expectations
-- The code expects current_streak and last_activity_date columns

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.streaks CASCADE;

CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
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

CREATE POLICY "Users can update own streaks"
  ON public.streaks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Ensure only one streak record per user
CREATE UNIQUE INDEX streaks_user_id_idx ON public.streaks(user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS streaks_last_activity_idx ON public.streaks(last_activity_date DESC);

-- Add comment
COMMENT ON TABLE public.streaks IS 'Tracks user streaks with current streak count and last activity date';
COMMENT ON COLUMN public.streaks.current_streak IS 'Current consecutive days of activity';
COMMENT ON COLUMN public.streaks.last_activity_date IS 'Date of last activity (NULL = no activity yet)';
