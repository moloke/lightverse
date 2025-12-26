import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getTwilioConfig, sendSMS } from '../_shared/twilio.ts'
import { corsHeaders } from '../_shared/cors.ts'

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
  supabase: any,
  sessionId: string,
  userId: string,
  currentStep: number
) {
  const nextStep = currentStep + 1
  const isCompleted = nextStep > 7

  // Update session
  const updates: any = {
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
  const today = new Date().toISOString().split('T')[0]

  const { data: streakData } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (streakData) {
    const lastActivity = streakData.last_activity_date

    if (lastActivity !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      let newStreak = streakData.current_streak
      if (lastActivity === yesterdayStr) {
        newStreak += 1
      } else {
        newStreak = 1
      }

      await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          last_activity_date: today,
        })
        .eq('user_id', userId)
    }
  } else {
    await supabase.from('streaks').insert({
      user_id: userId,
      current_streak: 1,
      last_activity_date: today,
    })
  }

  return { isCompleted, nextStep, xpGain }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createServiceClient()
    const twilioConfig = getTwilioConfig()

    // Parse Twilio webhook data
    const formData = await req.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    console.log('Received SMS from:', from, 'Body:', body)

    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', from)
      .single()

    if (userError || !user) {
      // Log unknown sender
      await supabase.from('sms_logs').insert({
        direction: 'inbound',
        phone_number: from,
        message: body,
        status: 'unknown_user',
        twilio_sid: messageSid,
      })

      // Send response
      await sendSMS(
        twilioConfig,
        from,
        "Sorry, we couldn't find your account. Please sign up at lightverse.app first!"
      )

      return new Response(
        JSON.stringify({ message: 'Unknown user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find active session
    const { data: session, error: sessionError } = await supabase
      .from('verse_sessions')
      .select(`
        id,
        current_step,
        bible_verses (
          reference,
          text
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
        "You don't have an active verse. Visit lightverse.app to select one!"
      )

      return new Response(
        JSON.stringify({ message: 'No active session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate response
    const isCorrect = validateResponse(body, session.bible_verses.text)

    // Log SMS
    await supabase.from('sms_logs').insert({
      user_id: user.id,
      direction: 'inbound',
      phone_number: from,
      message: body,
      status: isCorrect ? 'correct' : 'incorrect',
      twilio_sid: messageSid,
    })

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
        responseMsg = `🎉 Congratulations! You've memorized ${session.bible_verses.reference}! +${result.xpGain} XP

Visit lightverse.app to choose your next verse! 🙏`
      } else {
        responseMsg = `✅ Correct! +${result.xpGain} XP

You're on step ${result.nextStep}/7 of ${session.bible_verses.reference}. Keep going! 💪`
      }

      await sendSMS(twilioConfig, from, responseMsg)
    } else {
      // Send encouragement
      const hint = session.bible_verses.text
        .split(/\s+/)
        .slice(0, 5)
        .join(' ')

      const responseMsg = `Not quite right. Keep trying! 💪

Hint: "${hint}..."

Reply with the full verse for ${session.bible_verses.reference}`

      await sendSMS(twilioConfig, from, responseMsg)
    }

    return new Response(
      JSON.stringify({ message: 'Processed successfully', isCorrect }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in receive-sms-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
