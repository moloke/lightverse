import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getTwilioConfig, sendSMS } from '../_shared/twilio.ts'
import { corsHeaders } from '../_shared/cors.ts'
import {
  candidateSignatureUrls,
  isValidTwilioSignatureForAnyUrl,
} from '../_shared/core/twilio-signature.ts'
import { nextStreak, streakWritePayload } from '../_shared/core/streaks.ts'

// Helper to return an empty TwiML response (Twilio expects XML, not JSON)
function twimlResponse(status = 200): Response {
  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  return new Response(twiml, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml',
    },
  })
}

// Text validation logic
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1)
  const normalized2 = normalizeText(text2)
  const maxLength = Math.max(normalized1.length, normalized2.length)
  
  if (maxLength === 0) return 1.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  return (maxLength - distance) / maxLength
}

function validateResponse(userResponse: string, expectedText: string): boolean {
  const similarity = calculateSimilarity(userResponse, expectedText)
  return similarity >= 0.85 // 85% threshold
}

// Update progress logic
async function updateProgress(
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string,
  userId: string,
  currentStep: number
) {
  const nextStep = currentStep + 1
  const isCompleted = nextStep > 7

  // Update session
  const updates: {
    current_step: number
    awaiting_reply: boolean
    updated_at: string
    completed_at?: string
  } = {
    current_step: isCompleted ? 7 : nextStep,
    awaiting_reply: false,
    updated_at: new Date().toISOString(),
  }

  if (isCompleted) {
    updates.completed_at = new Date().toISOString()
  }

  await supabase.from('verse_sessions').update(updates).eq('id', sessionId)

  // Update XP
  let xpGain = 10
  if (isCompleted) xpGain += 100

  const { data: userData } = await supabase
    .from('users')
    .select('total_xp')
    .eq('id', userId)
    .single()

  const currentXp = userData?.total_xp || 0
  await supabase
    .from('users')
    .update({ total_xp: currentXp + xpGain })
    .eq('id', userId)

  // Update streak
  //
  // Uses the same decision as the web path (_shared/core/streaks.ts) rather than a second copy.
  // The copy that used to live here had already drifted: it compared last_activity_date by exact
  // string equality, so a row holding a full ISO timestamp reset the streak here while the web
  // path incremented it. It also computed "yesterday" with local-time arithmetic
  // (setDate(getDate() - 1) then toISOString()), correct only because this runtime happens to be
  // UTC — the shared helper does pure calendar arithmetic instead.
  const today = new Date().toISOString().split('T')[0]

  const { data: streakData } = await supabase
    .from('streaks')
    .select('current_streak, last_activity_date')
    .eq('user_id', userId)
    .single()

  const streakDecision = nextStreak({
    lastActivityDate: streakData?.last_activity_date,
    todayKey: today,
    currentStreak: streakData?.current_streak,
  })

  if (streakDecision.shouldWrite) {
    const { error: streakError } = streakData
      ? await supabase
          .from('streaks')
          .update(streakWritePayload(streakDecision, today))
          .eq('user_id', userId)
      : await supabase.from('streaks').insert({
          user_id: userId,
          ...streakWritePayload(streakDecision, today),
        })

    // Log rather than throw: a streak write failing must not stop the user's reply being
    // acknowledged. Discarding this result is what hid the web-side bug (#12) for months.
    if (streakError) {
      console.error('Failed to write streak', { userId, error: streakError.message })
    }
  }

  return { isCompleted, nextStep, xpGain }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const twilioConfig = getTwilioConfig()

    // Parse the form body. Needed before verification, because the POST parameters are part of
    // what Twilio signs.
    const formData = await req.formData()
    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') params[key] = value
    }

    // ── Authentication gate ──────────────────────────────────────────────────────────────────
    // Nothing above this line touches the database or sends anything. Nothing below it runs for
    // an unauthenticated request.
    //
    // This function is deployed --no-verify-jwt because Twilio sends no JWT, which is exactly why
    // this check has to exist (gap S-1). Do not remove either half of that pairing.
    //
    // Verify against the PUBLIC url, not req.url. Behind Supabase's edge proxy req.url is
    // `http://<ref>.supabase.co/receive-sms-webhook` — TLS terminates upstream and the
    // `/functions/v1` prefix is stripped — while Twilio signs the console URL, which has both.
    // Comparing against req.url rejected every genuine request in production. See
    // docs/runbook.md and the candidate list in _shared/core/twilio-signature.ts.
    const signatureValid = await isValidTwilioSignatureForAnyUrl(
      twilioConfig.authToken,
      candidateSignatureUrls({
        requestUrl: req.url,
        hostHeader: req.headers.get('host'),
        forwardedProto: req.headers.get('x-forwarded-proto'),
        configuredUrl: twilioConfig.webhookUrl,
      }),
      params,
      req.headers.get('X-Twilio-Signature'),
    )

    if (!signatureValid) {
      // Deliberately silent: no SMS, no database write, no detail in the response. An
      // unauthenticated caller learns nothing and costs nothing.
      console.warn('Rejected inbound request with an invalid or missing Twilio signature')
      return twimlResponse(403)
    }
    // ─────────────────────────────────────────────────────────────────────────────────────────

    const supabase = createServiceClient()

    const from = params.From
    const body = params.Body
    const messageSid = params.MessageSid

    console.log('Received SMS from:', from, 'Body:', body)

    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', from)
      .single()

    if (userError || !user) {
      // Log it, but send nothing back.
      //
      // This used to reply "Sorry, we couldn't find your account…" to whatever number appeared in
      // `From`. Combined with an unauthenticated endpoint that made the webhook an open SMS relay:
      // one POST, one paid message to any number on earth. The signature check above closes the
      // unauthenticated half; dropping the reply closes the reflector itself, so a request that
      // is signed but carries an unknown sender still costs nothing.
      await supabase.from('sms_logs').insert({
        direction: 'inbound',
        phone_number: from,
        message: body,
        status: 'unknown_user',
        twilio_sid: messageSid,
      })

      return twimlResponse()
    }

    // Find active session
    const { data: session, error: sessionError } = await supabase
      .from('verse_sessions')
      .select(`
        id,
        current_step,
        bible_verses (
          reference,
          text,
          translation
        )
      `)
      .eq('user_id', user.id)
      .is('completed_at', null)
      .single()

    if (sessionError || !session) {
      await supabase.from('sms_logs').insert({
        user_id: user.id,
        direction: 'inbound',
        phone_number: from,
        message: body,
        status: 'no_active_session',
        twilio_sid: messageSid,
      })

      await sendSMS(
        twilioConfig,
        from,
        "You don't have an active verse. Visit lightverse.org to select one!"
      )

      return twimlResponse()
    }

    // Validate response - handle both array and object formats from Supabase
    const bibleVerse = Array.isArray(session.bible_verses)
      ? session.bible_verses[0]
      : session.bible_verses
    
    if (!bibleVerse || !bibleVerse.text) {
      console.error('No bible verse data found for session:', session.id)
      return twimlResponse(500)
    }
    
    const isCorrect = validateResponse(body, bibleVerse.text)

    // Log SMS
    await supabase.from('sms_logs').insert({
      user_id: user.id,
      direction: 'inbound',
      phone_number: from,
      message: body,
      status: isCorrect ? 'correct' : 'incorrect',
      twilio_sid: messageSid,
    })

    // Get translation (default to ESV if not specified)
    const translation = bibleVerse.translation || 'ESV'
    const verseWithTranslation = `${bibleVerse.reference} (${translation})`

    if (isCorrect) {
      // Update progress
      const result = await updateProgress(
        supabase,
        session.id,
        user.id,
        session.current_step
      )

      // Send success message
      let responseMsg = ''
      if (result.isCompleted) {
        responseMsg = `🎉 Congratulations! You've memorized ${verseWithTranslation}! +${result.xpGain} XP

Visit lightverse.org to choose your next verse! 🙏`
      } else {
        responseMsg = `✅ Correct! +${result.xpGain} XP

You're on step ${result.nextStep}/7 of ${verseWithTranslation}. Keep going! 💪`
      }

      await sendSMS(twilioConfig, from, responseMsg)
    } else {
      // Send encouragement
      const hint = bibleVerse.text
        .split(/\s+/)
        .slice(0, 5)
        .join(' ')

      const responseMsg = `Not quite right. Keep trying! 💪

Hint: "${hint}..."

Reply with the full verse for ${verseWithTranslation}`

      await sendSMS(twilioConfig, from, responseMsg)
    }

    return twimlResponse()
  } catch (error) {
    console.error('Error in receive-sms-webhook:', error)
    return twimlResponse(500)
  }
})
