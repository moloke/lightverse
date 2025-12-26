# Daily Send SMS Function

## Purpose
Sends daily Bible verse SMS messages to all users with active memorization sessions.

## Schedule
Runs daily at 8:00 AM UTC via Supabase cron job.

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Deployment
```bash
supabase functions deploy daily-send-sms
```

## Manual Testing
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/daily-send-sms \
  -H "Authorization: Bearer [anon-key]"
```
