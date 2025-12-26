# Receive SMS Webhook Function

## Purpose
Processes incoming SMS replies from users, validates responses, and updates progress.

## Trigger
Called by Twilio webhook when user sends SMS reply.

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Deployment
```bash
supabase functions deploy receive-sms-webhook
```

## Twilio Configuration
1. Go to Twilio Console → Phone Numbers
2. Select your number
3. Under "Messaging", set webhook URL:
   ```
   https://[project-ref].supabase.co/functions/v1/receive-sms-webhook
   ```
4. Method: POST
5. Save

## Testing
Use Twilio's SMS test feature or send actual SMS to your Twilio number.
