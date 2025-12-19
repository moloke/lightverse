"use client";

import { useState, useEffect } from "react";
import { createClozeTest } from "@/lib/utils/cloze-deletion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClozeDisplayProps {
    text: string;
    step: number;
    onComplete: () => void;
}

export function ClozeDisplay({ text, step, onComplete }: ClozeDisplayProps) {
    const [clozeData, setClozeData] = useState<any>(null);
    const [inputs, setInputs] = useState<{ [key: number]: string }>({});
    const [results, setResults] = useState<{ [key: number]: boolean | null }>({});
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        // Generate cloze test when text or step changes
        const data = createClozeTest(text, step);
        setClozeData(data);
        setInputs({});
        setResults({});
        setShowFeedback(false);
    }, [text, step]);

    const handleInputChange = (index: number, value: string) => {
        setInputs((prev) => ({ ...prev, [index]: value }));
        // Clear result for this field when user types
        if (results[index] !== null) {
            setResults((prev) => ({ ...prev, [index]: null }));
        }
    };

    const checkAnswers = () => {
        if (!clozeData) return;

        const newResults: { [key: number]: boolean } = {};
        let allCorrect = true;

        clozeData.parts.forEach((part: any, index: number) => {
            if (part.hidden) {
                const userInput = inputs[index]?.trim().toLowerCase() || "";
                const correctWord = part.word.toLowerCase();
                // Remove punctuation for comparison if needed, but for now strict match
                // Actually, let's strip punctuation from the end for comparison
                const cleanInput = userInput.replace(/[.,;!?]$/, "");
                const cleanTarget = correctWord.replace(/[.,;!?]$/, "");

                const isCorrect = cleanInput === cleanTarget;
                newResults[index] = isCorrect;
                if (!isCorrect) allCorrect = false;
            }
        });

        setResults(newResults);
        setShowFeedback(true);

        if (allCorrect) {
            // Small delay to show success state before moving on
            setTimeout(() => {
                onComplete();
            }, 1000);
        }
    };

    if (!clozeData) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="text-xl md:text-2xl leading-loose font-serif">
                {clozeData.parts.map((part: any, index: number) => {
                    if (!part.hidden) {
                        return <span key={index}>{part.word} </span>;
                    }

                    const isCorrect = results[index] === true;
                    const isWrong = results[index] === false;

                    return (
                        <span key={index} className="inline-block mx-1 relative">
                            <Input
                                type="text"
                                value={inputs[index] || ""}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                className={cn(
                                    "w-24 h-8 px-2 text-center inline-flex border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 bg-transparent transition-colors",
                                    isCorrect && "border-green-500 text-green-600 font-bold",
                                    isWrong && "border-red-500 text-red-600",
                                    !isCorrect && !isWrong && "border-gray-400 focus:border-blue-500"
                                )}
                                placeholder={step === 1 ? part.word : "___"} // Show word in step 1 if needed, but usually step 1 is full text
                                disabled={isCorrect}
                                autoComplete="off"
                            />
                            {isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-green-500 absolute -top-2 -right-2" />
                            )}
                        </span>
                    );
                })}
            </div>

            <div className="flex justify-center pt-4">
                <Button
                    size="lg"
                    onClick={checkAnswers}
                    className="min-w-[200px]"
                >
                    Check Answers
                </Button>
            </div>

            {showFeedback && !Object.values(results).every(r => r === true) && (
                <div className="text-center text-red-500 animate-pulse">
                    Some answers are incorrect. Keep trying!
                </div>
            )}
        </div>
    );
}
