import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const { phoneNumber } = await request.json();

        if (!phoneNumber) {
            return NextResponse.json(
                { error: "Phone number is required" },
                { status: 400 }
            );
        }

        // Validate phone number format
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return NextResponse.json(
                { error: "Invalid phone number format. Must include country code (e.g., +1234567890)" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Send OTP via Supabase Auth
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phoneNumber,
        });

        if (error) {
            return NextResponse.json(
                { error: error.message || "Failed to send verification code" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Verification code sent successfully",
        });
    } catch (error) {
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
