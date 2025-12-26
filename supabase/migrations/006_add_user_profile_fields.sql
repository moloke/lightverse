-- Add profile fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS paused_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_disabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to update updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON COLUMN public.users.name IS 'User display name (optional)';
COMMENT ON COLUMN public.users.paused_until IS 'SMS paused until this datetime (NULL = not paused)';
COMMENT ON COLUMN public.users.account_disabled IS 'If true, no SMS will be sent';
COMMENT ON COLUMN public.users.updated_at IS 'Last update timestamp';
