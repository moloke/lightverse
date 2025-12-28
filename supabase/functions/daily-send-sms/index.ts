import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getTwilioConfig, sendSMS } from '../_shared/twilio.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Cloze deletion logic with random word hiding
function generateClozeText(verseText: string, step: number): string {
  const words = verseText.split(/\s+/)
  const totalWords = words.length
  
  // Progressive hiding: 0%, 15%, 30%, 45%, 60%, 75%, 90%
  const percentages = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90]
  const hidePercentage = percentages[step - 1] || 0
  
  const wordsToHideCount = Math.floor(totalWords * hidePercentage)
  
  if (step === 1 || wordsToHideCount === 0) {
    return verseText
  }
  
  // Create array of all word indices
  const indices = Array.from({ length: totalWords }, (_, i) => i)
  
  // Fisher-Yates shuffle to randomize
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  
  // Take first N indices as the ones to hide
  const indicesToHide = new Set(indices.slice(0, wordsToHideCount))
  
  // Build the cloze text with blanks
  return words
    .map((word, index) => {
      if (indicesToHide.has(index)) {
        return '_____' // Replace with blank
      }
      return word
    })
    .join(' ')
}

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

        // Skip if already sent today
        if (session.last_message_at) {
          const lastSent = new Date(session.last_message_at)
          const today = new Date()
          if (
            lastSent.getFullYear() === today.getFullYear() &&
            lastSent.getMonth() === today.getMonth() &&
            lastSent.getDate() === today.getDate()
          ) {
            results.skipped++
            continue
          }
        }

        // Handle bible_verses data - can be object or array
        const bibleVerse = Array.isArray(session.bible_verses)
          ? session.bible_verses[0]
          : session.bible_verses
        const clozeText = generateClozeText(
          bibleVerse.text,
          session.current_step
        )

        // Create SMS message
        const message = `📖 ${bibleVerse.reference} - Step ${session.current_step}/${session.total_steps}

${clozeText}

Reply with the full verse to continue! 💪`

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
