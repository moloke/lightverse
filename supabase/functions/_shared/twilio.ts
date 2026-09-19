export interface TwilioConfig {
  accountSid: string
  authToken: string
  phoneNumber: string
  /**
   * The webhook URL exactly as configured in the Twilio console. Optional, but strongly
   * recommended: it is the URL Twilio signs, and `req.url` behind Supabase's proxy is not it.
   * See docs/runbook.md and _shared/core/twilio-signature.ts.
   */
  webhookUrl: string
}

export function getTwilioConfig(): TwilioConfig {
  return {
    accountSid: Deno.env.get('TWILIO_ACCOUNT_SID') ?? '',
    authToken: Deno.env.get('TWILIO_AUTH_TOKEN') ?? '',
    phoneNumber: Deno.env.get('TWILIO_PHONE_NUMBER') ?? '',
    webhookUrl: Deno.env.get('TWILIO_WEBHOOK_URL') ?? '',
  }
}

export async function sendSMS(
  config: TwilioConfig,
  to: string,
  body: string
): Promise<{ sid: string; status: string } | null> {
  const auth = btoa(`${config.accountSid}:${config.authToken}`)
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: config.phoneNumber,
        Body: `LIGHTVERSE: ${body}`,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Twilio error:', error)
    return null
  }

  const data = await response.json()
  return { sid: data.sid, status: data.status }
}
