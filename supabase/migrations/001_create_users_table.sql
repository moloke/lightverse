-- Create users table
-- This extends Supabase auth.users with additional profile information

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read and update their own data
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_phone_number_idx ON public.users(phone_number);

-- Add comment
COMMENT ON TABLE public.users IS 'User profiles with phone numbers for SMS functionality';
