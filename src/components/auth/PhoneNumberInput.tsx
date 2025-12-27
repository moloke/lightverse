"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PhoneNumberInputProps {
    onSubmit: (phoneNumber: string) => void;
    isLoading?: boolean;
}

export function PhoneNumberInput({ onSubmit, isLoading = false }: PhoneNumberInputProps) {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");

    const validatePhoneNumber = (phone: string): boolean => {
        // Basic validation for international phone numbers
        // Must start with + and have 10-15 digits
        const phoneRegex = /^\+[1-9]\d{9,14}$/;
        return phoneRegex.test(phone);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!phoneNumber) {
            setError("Please enter your phone number");
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            setError("Please enter a valid phone number with country code (e.g., +1234567890)");
            return;
        }

        onSubmit(phoneNumber);
    };

    const formatPhoneNumber = (value: string) => {
        // Remove all non-digit characters except +
        let formatted = value.replace(/[^\d+]/g, "");

        // Ensure it starts with +
        if (formatted && !formatted.startsWith("+")) {
            formatted = "+" + formatted;
        }

        return formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
        if (error) setError("");
    };

    return (
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-2 border-indigo-200 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Get Started Free</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                    Enter your phone number to begin your scripture journey
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={phoneNumber}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={`text-center text-lg py-6 ${error ? "border-red-500" : ""}`}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <p className="text-xs text-gray-500">
                            Include your country code (e.g., +1 for US, +44 for UK)
                        </p>
                    </div>
                    <Button
                        type="submit"
                        className="w-full text-lg py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending code..." : "Send Verification Code"}
                    </Button>
                    <p className="text-xs text-center text-gray-500">No credit card required</p>
                </form>
            </CardContent>
        </Card>
    );
}
