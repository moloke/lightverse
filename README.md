# LightVerse - Bible Verse Memorization App

A lightweight web application that helps Christians memorize Bible verses through daily SMS messages using progressive cloze deletion.

## 🌟 Features

- **Phone-based Authentication**: Secure OTP verification via Supabase Auth
- **Verse Selection**: Choose from a curated library of Bible verses
- **Automated SMS System**: Fully automated daily verse delivery via Supabase Edge Functions
- **Daily SMS Reminders**: Scheduled messages sent via Twilio every morning
- **Progressive Learning**: 7-step cloze deletion gradually removes words
- **SMS Reply Validation**: Reply directly to messages to check your progress
- **Smart Validation**: Fuzzy matching validates user responses with helpful feedback
- **Streak Tracking**: Monitor your daily progress and consistency
- **Dashboard**: View current verse, progress, and completed verses

## 📱 SMS Automation

LightVerse features a complete SMS automation system powered by Supabase Edge Functions:

### How It Works

1. **Daily SMS Delivery**: A scheduled cron job triggers the [`daily-send-sms`](supabase/functions/daily-send-sms/index.ts) Edge Function every morning at 8 AM
2. **Verse Delivery**: Users receive their current verse with progressive cloze deletion (7 steps from 100% to 0% visibility)
3. **Reply & Validate**: Users reply via SMS, triggering the [`receive-sms-webhook`](supabase/functions/receive-sms-webhook/index.ts) function
4. **Smart Feedback**: The system validates responses using fuzzy matching and provides instant feedback
5. **Progress Tracking**: Correct answers advance users to the next step and award XP points
6. **Streak Management**: Daily participation maintains and builds memorization streaks

### SMS Flow Example

```
📖 John 3:16 - Step 1/7

For God so loved the ____ that he gave his one and only Son...

Reply with the full verse to continue! 💪
```

User replies → System validates → User receives:
```
✅ Correct! +10 XP

You're on step 2/7 of John 3:16. Keep going! 💪
```

**For detailed deployment and testing instructions, see [`DEPLOYMENT_GUIDE.md`](supabase/functions/DEPLOYMENT_GUIDE.md)**

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **SMS**: Twilio
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 20+ installed (current version: 18.20.4 - consider upgrading)
- A Supabase account and project
- A Twilio account with a phone number
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd LightVerse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in your credentials in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio Configuration (for Next.js app)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note:** Edge Functions require separate environment configuration (see Step 5 below).

### 4. Set Up Supabase Database

#### Create Tables

Run the SQL migrations in your Supabase SQL Editor (found in `supabase/migrations/`):

1. `001_create_users_table.sql`
2. `002_create_bible_verses_table.sql`
3. `003_create_verse_sessions_table.sql`
4. `004_create_sms_logs_table.sql`
5. `005_create_streaks_table.sql`

#### Seed Bible Verses

Run `supabase/seed.sql` to populate initial verses.

### 5. Set Up Supabase Edge Functions

The SMS automation system runs entirely on Supabase Edge Functions. Follow these steps:

#### Install Supabase CLI

The Supabase CLI is separate from the npm package. Install via package manager:

**macOS:**
```bash
brew install supabase/tap/supabase
supabase --version
```

**Windows (with Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Or as dev dependency (use with `npx`):**
```bash
npm install supabase@">=1.8.1" --save-dev
npx supabase --version
```

**Note:** `npm install -g supabase` installs the JavaScript client library, NOT the CLI.

#### Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project (get project-ref from Supabase Dashboard → Settings → API)
supabase link --project-ref your-project-ref
```

If using npx, prefix commands with `npx`:
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
```

#### Set Environment Secrets

Edge Functions use encrypted secrets for Twilio credentials:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

**Required Environment Variables for Edge Functions:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number in E.164 format (+1234567890)

Verify secrets are set:
```bash
supabase secrets list
```

#### Deploy Edge Functions

```bash
# Deploy both SMS functions
supabase functions deploy daily-send-sms
supabase functions deploy receive-sms-webhook
```

### 6. Configure Twilio Webhook

Set up Twilio to forward incoming SMS to your Edge Function:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers → Manage → Active numbers**
3. Click on your Twilio phone number
4. Scroll to **Messaging Configuration**
5. Under "A MESSAGE COMES IN":
   - Select: **Webhook**
   - URL: `https://your-project-ref.supabase.co/functions/v1/receive-sms-webhook`
   - Method: **POST**
6. Click **Save**

### 7. Set Up Automated Cron Job

Schedule daily SMS delivery using Supabase cron jobs:

1. Go to Supabase Dashboard → **Database → Cron Jobs**
2. Click **Create a new cron job**
3. Configure:
   - **Name**: `daily-verse-sms`
   - **Schedule**: `0 8 * * *` (8 AM UTC daily)
   - **Command**:
     ```sql
     SELECT
       net.http_post(
         url:='https://your-project-ref.supabase.co/functions/v1/daily-send-sms',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb
       ) as request_id;
     ```
4. Click **Create cron job**

**For detailed deployment instructions, see [`DEPLOYMENT_GUIDE.md`](supabase/functions/DEPLOYMENT_GUIDE.md)**

### 8. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
LightVerse/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/             # Authentication pages
│   │   ├── verify/
│   │   ├── dashboard/         # User dashboard
│   │   ├── verse/             # Verse selection
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── auth/             # Auth components
│   │   ├── dashboard/        # Dashboard components
│   │   └── verse/            # Verse components
│   └── lib/                   # Utilities and configurations
│       ├── supabase/         # Supabase clients
│       ├── twilio/           # Twilio client
│       └── utils/            # Helper functions
├── supabase/
│   ├── migrations/           # Database migrations
│   ├── functions/            # Edge Functions
│   └── seed.sql             # Initial data
└── public/                   # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Database Schema

See `ARCHITECTURE.md` for detailed database schema and system architecture.

## 🧪 Testing

### Test Phone OTP Flow
1. Visit [`/login`](src/app/login/page.tsx)
2. Enter your phone number
3. Receive OTP via SMS
4. Enter code on [`/verify`](src/app/verify/page.tsx)

### Test Verse Selection
1. Navigate to `/verses`
2. Choose a verse from the library
3. Verify session is created in database

### Test SMS Automation Flow

#### 1. Manual Daily SMS Trigger
Manually trigger the daily SMS function to test delivery:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/daily-send-sms \
  -H "Authorization: Bearer your-anon-key"
```

**Expected Result:**
- SMS received on your phone with current verse and step
- Message includes verse reference, step number, and cloze-deleted text

#### 2. Test SMS Reply Validation
Once you receive the SMS, test the reply system:

**Correct Answer Test:**
1. Reply to the SMS with the complete verse
2. Expected response: `✅ Correct! +10 XP` with progress update

**Incorrect Answer Test:**
1. Reply with incomplete or wrong text
2. Expected response: Helpful hint and encouragement to try again

#### 3. Verify Progress Tracking
After replying:
1. Check your dashboard at `/dashboard`
2. Verify XP increased by 10
3. Confirm current step advanced
4. Check database logs in `sms_logs` table

#### 4. Test Complete Verse Cycle
Complete all 7 steps to verify full memorization flow:
- Step 1: Full verse (100% visible)
- Step 2-6: Progressive cloze deletion (85% → 15%)
- Step 7: Minimal hints (0% visible)
- Completion: Congratulatory message with bonus XP

### Monitor Function Logs

View real-time logs for debugging:

```bash
# Daily SMS function logs
supabase functions logs daily-send-sms --tail

# Webhook receiver logs
supabase functions logs receive-sms-webhook --tail
```

**For comprehensive testing instructions, see [`DEPLOYMENT_GUIDE.md`](supabase/functions/DEPLOYMENT_GUIDE.md)**

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Make sure to set all environment variables in your Vercel project settings.

### Production Checklist

- [ ] Set up production Supabase project
- [ ] Run all migrations on production database
- [ ] Set Twilio secrets in production: `supabase secrets set`
- [ ] Deploy Edge Functions to production: `supabase functions deploy`
- [ ] Configure Twilio webhook to production URL
- [ ] Set up cron job in production Supabase dashboard
- [ ] Add environment variables to Vercel
- [ ] Test SMS flow end-to-end in production
- [ ] Monitor first week of automated SMS delivery
- [ ] Check function logs for errors

### Edge Functions Deployment

The SMS automation system runs independently on Supabase Edge Functions:

```bash
# Deploy to production
supabase functions deploy daily-send-sms --project-ref your-prod-ref
supabase functions deploy receive-sms-webhook --project-ref your-prod-ref

# Set production secrets
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxx --project-ref your-prod-ref
supabase secrets set TWILIO_AUTH_TOKEN=xxx --project-ref your-prod-ref
supabase secrets set TWILIO_PHONE_NUMBER=+1xxx --project-ref your-prod-ref
```

## 📚 Additional Documentation

- **[`DEPLOYMENT_GUIDE.md`](supabase/functions/DEPLOYMENT_GUIDE.md)** - Comprehensive SMS automation deployment and testing guide
- **[`daily-send-sms/README.md`](supabase/functions/daily-send-sms/README.md)** - Daily SMS function documentation
- **[`receive-sms-webhook/README.md`](supabase/functions/receive-sms-webhook/README.md)** - SMS webhook receiver documentation
- **[Database Migrations](supabase/migrations/)** - SQL migration files for database schema

## 🔍 Key Files

### Edge Functions
- [`daily-send-sms/index.ts`](supabase/functions/daily-send-sms/index.ts) - Scheduled function that sends daily verses
- [`receive-sms-webhook/index.ts`](supabase/functions/receive-sms-webhook/index.ts) - Webhook handler for SMS replies
- [`_shared/twilio.ts`](supabase/functions/_shared/twilio.ts) - Shared Twilio client utilities
- [`_shared/supabase.ts`](supabase/functions/_shared/supabase.ts) - Shared Supabase client

### Core Application
- [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) - User dashboard with progress tracking
- [`src/lib/utils/cloze-deletion.ts`](src/lib/utils/cloze-deletion.ts) - Cloze deletion algorithm
- [`src/app/actions/verse-actions.ts`](src/app/actions/verse-actions.ts) - Server actions for verse management

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ for Bible memorization
