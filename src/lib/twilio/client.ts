import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials not configured. SMS functionality will not work.");
}

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendSMSParams {
    to: string;
    message: string;
}

export async function sendSMS({ to, message }: SendSMSParams) {
    if (!twilioClient || !twilioPhoneNumber) {
        throw new Error("Twilio is not configured");
    }

    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to,
        });

        return {
            success: true,
            messageId: result.sid,
            status: result.status,
        };
    } catch (error) {
        console.error("Failed to send SMS:", error);
        throw error;
    }
}

export async function sendOTP(phoneNumber: string, code: string) {
    return sendSMS({
        to: phoneNumber,
        message: `Your LightVerse verification code is: ${code}`,
    });
}

export async function sendDailyVerse(phoneNumber: string, verseText: string, reference: string) {
    return sendSMS({
        to: phoneNumber,
        message: `Good morning! 🌅\n\n${reference}\n"${verseText}"\n\nReply with the verse to continue your streak!`,
    });
}

export async function sendCongratulations(phoneNumber: string, isComplete: boolean = false) {
    const message = isComplete
        ? "🎉 Congratulations! You've completed this verse! Check your dashboard to choose your next verse."
        : "✅ Correct! Great job! Keep up the good work.";

    return sendSMS({
        to: phoneNumber,
        message,
    });
}

export async function sendEncouragement(phoneNumber: string, hint?: string) {
    const message = hint
        ? `Not quite right. Here's a hint: ${hint}\n\nTry again tomorrow!`
        : "Not quite right, but keep trying! You'll get it tomorrow. 💪";

    return sendSMS({
        to: phoneNumber,
        message,
    });
}
