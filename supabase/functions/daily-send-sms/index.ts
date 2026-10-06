import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getTwilioConfig, sendSMS } from '../_shared/twilio.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { dayKey, isSameDay } from '../_shared/core/dates.ts'
import { buildDailyVerseMessage } from '../_shared/core/messages.ts'

// Cloze generation and message copy live in _shared/core/ — imported above, shared with the
// web app and with fast-forward mode.

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createServiceClient()
    const twilioConfig = getTwilioConfig()

    // Fetch all active sessions (excluding disabled accounts)
    const { data: sessions, error: sessionsError } = await supabase
      .from('verse_sessions')
      .select(`
        id,
        current_step,
        total_steps,
        last_message_at,
        user_id,
        users!inner (
          phone_number,
          paused_until,
          account_disabled
        ),
        bible_verses!inner (
          reference,
          text,
          translation
        )
      `)
      .is('completed_at', null)
      .eq('users.account_disabled', false)

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
    }

    const results = {
      total: sessions?.length || 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active sessions found', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each session
    for (const session of sessions) {
      try {
        // Handle users data - can be object or array depending on Supabase version
        const userData = Array.isArray(session.users)
          ? session.users[0]
          : session.users
        
        if (!userData) {
          results.failed++
          results.errors.push(`Session ${session.id} has no associated user`)
          continue
        }

        // Check if account is paused
        if (userData.paused_until) {
          const pausedUntil = new Date(userData.paused_until)
          if (pausedUntil > new Date()) {
            results.skipped++
            continue
          }
        }

        // Skip if already sent today.
        //
        // This compared getFullYear/getMonth/getDate, which reads *runtime-local* time. It was
        // correct in production only because Supabase Edge happens to run UTC — in local dev, or
        // on any differently-configured runtime, it silently answered this question wrongly, and
        // a wrong answer here means either a duplicate paid SMS or a user who never gets their
        // verse (gap C-3).
        //
        // isSameDay resolves both instants in one explicit timezone instead. Every day-boundary
        // question in the product now goes through the same helper, so "what is a day?" has one
        // answer rather than three.
        if (session.last_message_at) {
          if (isSameDay(new Date(session.last_message_at), new Date())) {
            results.skipped++
            continue
          }
        }

        // Handle bible_verses data - can be object or array
        const bibleVerse = Array.isArray(session.bible_verses)
          ? session.bible_verses[0]
          : session.bible_verses
        // Composed by _shared/core/messages.ts, so fast-forward mode (#38) sends the identical
        // message rather than an approximation of it.
        const message = buildDailyVerseMessage({
          reference: bibleVerse.reference,
          translation: bibleVerse.translation,
          text: bibleVerse.text,
          step: session.current_step,
          totalSteps: session.total_steps,
        })

        // Send SMS
        const result = await sendSMS(
          twilioConfig,
          userData.phone_number,
          message
        )

        if (!result) {
          results.failed++
          results.errors.push(
            `Failed to send SMS to ${userData.phone_number}`
          )
          continue
        }

        // Log SMS
        await supabase.from('sms_logs').insert({
          user_id: session.user_id,
          direction: 'outbound',
          phone_number: userData.phone_number,
          message: message,
          status: result.status,
          twilio_sid: result.sid,
        })

        // Update session
        await supabase
          .from('verse_sessions')
          .update({
            last_message_at: new Date().toISOString(),
            awaiting_reply: true,
          })
          .eq('id', session.id)

        results.sent++
      } catch (error) {
        results.failed++
        results.errors.push(
          `Error processing session ${session.id}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Daily SMS sending completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in daily-send-sms:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
