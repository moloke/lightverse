-- Create bible_verses table
-- Stores the library of Bible verses available for memorization

CREATE TABLE IF NOT EXISTS public.bible_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT DEFAULT 'ESV' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can read verses
CREATE POLICY "Anyone can view bible verses"
  ON public.bible_verses
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete verses (service role)
-- This is handled via service role key, not RLS

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS bible_verses_reference_idx ON public.bible_verses(reference);
CREATE INDEX IF NOT EXISTS bible_verses_translation_idx ON public.bible_verses(translation);

-- Add comment
COMMENT ON TABLE public.bible_verses IS 'Library of Bible verses available for memorization';
