"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OTPVerificationForm } from "@/components/auth/OTPVerificationForm";

export default function VerifyPage() {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Get phone number from session storage
        const storedPhone = sessionStorage.getItem("phoneNumber");
        if (!storedPhone) {
            // Redirect back to login if no phone number
            router.push("/login");
            return;
        }
        setPhoneNumber(storedPhone);
    }, [router]);

    const handleVerifySubmit = async (code: string) => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phoneNumber, code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Invalid verification code");
            }

            // Clear session storage
            sessionStorage.removeItem("phoneNumber");

            // Redirect to dashboard
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phoneNumber }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to resend code");
            }

            // Show success message (you could add a toast notification here)
            alert("Verification code resent!");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to resend code");
        } finally {
            setIsLoading(false);
        }
    };

    if (!phoneNumber) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    LightVerse
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Memorize Scripture, one verse at a time
                </p>
            </div>

            <OTPVerificationForm
                phoneNumber={phoneNumber}
                onSubmit={handleVerifySubmit}
                onResend={handleResend}
                isLoading={isLoading}
            />

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md w-full">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}
        </div>
    );
}
