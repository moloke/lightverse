"use client";

import { useState } from "react";
import { ClozeDisplay } from "./ClozeDisplay";
import { updateProgress } from "@/app/actions/verse-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

interface PracticeInterfaceProps {
    session: any; // Using any for now to avoid complex type imports, but should be typed
}

export function PracticeInterface({ session }: PracticeInterfaceProps) {
    const [currentStep, setCurrentStep] = useState(session.current_step);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSessionComplete, setIsSessionComplete] = useState(session.current_step > 7);

    const handleStepComplete = async () => {
        setIsUpdating(true);

        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        try {
            const result = await updateProgress(session.id, currentStep);

            if (result.isCompleted) {
                setIsSessionComplete(true);
            } else {
                setCurrentStep(result.nextStep);
            }
        } catch (error) {
            // Error updating progress
        } finally {
            setIsUpdating(false);
        }
    };

    if (isSessionComplete) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="mb-8 flex justify-center">
                    <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full">
                        <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                    Memorization Complete!
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                    You've successfully memorized:
                    <br />
                    <span className="font-semibold text-primary mt-2 block">
                        {session.bible_verses.reference}
                    </span>
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/dashboard">
                        <Button size="lg">Return to Dashboard</Button>
                    </Link>
                    <Link href="/verses">
                        <Button variant="outline" size="lg">Pick New Verse</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const progress = ((currentStep - 1) / 7) * 100;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Exit
                        </Button>
                    </Link>
                    <div className="text-sm font-medium text-muted-foreground">
                        Step {currentStep} of 7
                    </div>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <Card className="p-8 md:p-12 shadow-lg">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-primary mb-2">
                        {session.bible_verses.reference}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {session.bible_verses.translation}
                    </p>
                </div>

                <ClozeDisplay
                    text={session.bible_verses.text}
                    step={currentStep}
                    onComplete={handleStepComplete}
                />
            </Card>
        </div>
    );
}
