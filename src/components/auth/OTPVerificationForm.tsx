"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OTPVerificationFormProps {
    phoneNumber: string;
    onSubmit: (code: string) => void;
    onResend: () => void;
    isLoading?: boolean;
}

export function OTPVerificationForm({
    phoneNumber,
    onSubmit,
    onResend,
    isLoading = false,
}: OTPVerificationFormProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!code) {
            setError("Please enter the verification code");
            return;
        }

        if (code.length !== 6) {
            setError("Verification code must be 6 digits");
            return;
        }

        onSubmit(code);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(value);
        if (error) setError("");
    };

    const handleResend = () => {
        setCode("");
        setError("");
        onResend();
    };

    return (
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-2 border-indigo-200 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Verify Your Number</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                    Enter the 6-digit code sent to {phoneNumber}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code" className="text-gray-700">Verification Code</Label>
                        <Input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            placeholder="000000"
                            value={code}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={`text-lg py-6 text-center tracking-widest ${error ? "border-red-500" : ""}`}
                            maxLength={6}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <Button
                        type="submit"
                        className="w-full text-lg py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                        disabled={isLoading || code.length !== 6}
                    >
                        {isLoading ? "Verifying..." : "Verify & Continue"}
                    </Button>
                    <div className="text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResend}
                            disabled={isLoading}
                            className="text-sm w-full"
                        >
                            Didn't receive a code? Resend
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
