# LightVerse - Bible Verse Memorization App

A lightweight web application that helps Christians memorize Bible verses through daily SMS messages using progressive cloze deletion.

## 🌟 Features

- **Phone-based Authentication**: Secure OTP verification via Supabase Auth
- **Verse Selection**: Choose from a curated library of Bible verses
- **Daily SMS Reminders**: Automated messages sent via Twilio every morning
- **Progressive Learning**: 7-step cloze deletion gradually removes words
- **Smart Validation**: Fuzzy matching validates user responses
- **Streak Tracking**: Monitor your daily progress and consistency
- **Dashboard**: View current verse, progress, and completed verses

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

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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

Deploy the Edge Functions for SMS automation:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy Edge Functions
supabase functions deploy daily-send-sms
supabase functions deploy receive-sms-webhook
```

### 6. Configure Twilio Webhook

In your Twilio console:

1. Go to your phone number settings
2. Set the webhook URL for incoming messages to:
   ```
   https://your-project-ref.supabase.co/functions/v1/receive-sms-webhook
   ```

### 7. Set Up Cron Job

In Supabase Dashboard:

1. Go to Database → Cron Jobs
2. Create a new cron job:
   - **Name**: Daily Verse SMS
   - **Schedule**: `0 8 * * *` (8 AM daily)
   - **Command**: Call the `daily-send-sms` Edge Function

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
1. Visit `/login`
2. Enter your phone number
3. Receive OTP via SMS
4. Enter code on `/verify`

### Test Verse Selection
1. Navigate to `/verse/select`
2. Choose a verse
3. Verify session is created in database

### Test Daily SMS (Manual)
1. Trigger the `daily-send-sms` Edge Function manually
2. Verify SMS is received
3. Reply with the verse
4. Check that validation works

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
- [ ] Deploy Edge Functions to production
- [ ] Configure Twilio webhook to production URL
- [ ] Set up cron job in production
- [ ] Add environment variables to Vercel
- [ ] Test complete flow in production

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ for Bible memorization
