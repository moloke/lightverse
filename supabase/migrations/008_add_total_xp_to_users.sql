-- Add total_xp column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.total_xp IS 'Total experience points earned by the user';
