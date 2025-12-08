-- Create sms_logs table
-- Logs all SMS messages for debugging and analytics

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT,
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only service role can access SMS logs (admin only)
-- No policies for regular users - they cannot access this table

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS sms_logs_user_id_idx ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS sms_logs_direction_idx ON public.sms_logs(direction);
CREATE INDEX IF NOT EXISTS sms_logs_created_at_idx ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS sms_logs_phone_number_idx ON public.sms_logs(phone_number);

-- Add comment
COMMENT ON TABLE public.sms_logs IS 'Logs all SMS messages for debugging and analytics';
