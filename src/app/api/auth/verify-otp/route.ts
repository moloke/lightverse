import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const { phoneNumber, code } = await request.json();

        if (!phoneNumber || !code) {
            return NextResponse.json(
                { error: "Phone number and verification code are required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Verify OTP
        const { data, error } = await supabase.auth.verifyOtp({
            phone: phoneNumber,
            token: code,
            type: "sms",
        });

        if (error) {
            console.error("Supabase verify OTP error:", error);
            return NextResponse.json(
                { error: error.message || "Invalid verification code" },
                { status: 400 }
            );
        }

        if (!data.user) {
            return NextResponse.json(
                { error: "Verification failed" },
                { status: 400 }
            );
        }

        // Check if user profile exists in our users table
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.user.id)
            .single();

        // If user doesn't exist, create profile
        if (!existingUser) {
            const { error: insertError } = await supabase
                .from("users")
                .insert({
                    id: data.user.id,
                    phone_number: phoneNumber,
                });

            if (insertError) {
                console.error("Error creating user profile:", insertError);
                // Don't fail the request, user is still authenticated
            }
        }

        return NextResponse.json({
            success: true,
            message: "Verification successful",
            user: {
                id: data.user.id,
                phone: phoneNumber,
            },
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
