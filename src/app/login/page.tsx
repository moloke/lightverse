"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneNumberInput } from "@/components/auth/PhoneNumberInput";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handlePhoneSubmit = async (phoneNumber: string) => {
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

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server error. Please try again later.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send verification code");
            }

            // Store phone number in session storage for the verify page
            sessionStorage.setItem("phoneNumber", phoneNumber);

            // Redirect to verify page
            router.push("/verify");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

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

            <PhoneNumberInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md w-full">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}
        </div>
    );
}
