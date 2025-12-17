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
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Welcome to LightVerse</CardTitle>
                <CardDescription>
                    Enter your phone number to get started with Bible verse memorization
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={phoneNumber}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={error ? "border-red-500" : ""}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <p className="text-xs text-muted-foreground">
                            Include your country code (e.g., +1 for US, +44 for UK)
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Sending code..." : "Continue"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
