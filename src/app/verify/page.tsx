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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
            <div className="container mx-auto px-4 py-12 md:py-20">
                <div className="flex flex-col items-center gap-8">
                    {/* Hero Section */}
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent !leading-[3.5rem]">
                            LightVerse
                        </h1>
                        <p className="text-lg text-gray-700">
                            Memorize Scripture, one verse at a time
                        </p>
                    </div>

                    {/* Verification Form */}
                    <div className="w-full max-w-md">
                        <OTPVerificationForm
                            phoneNumber={phoneNumber}
                            onSubmit={handleVerifySubmit}
                            onResend={handleResend}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg max-w-md w-full shadow-lg">
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Trust Indicators */}
                    <div className="mt-8 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-green-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>Secure verification</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Code expires in 10 minutes
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
