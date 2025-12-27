"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startSession } from "@/app/actions/verse-actions";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Verse {
    id: string;
    reference: string;
    text: string;
    translation: string;
}

interface VerseCardProps {
    verse: Verse;
}

export function VerseCard({ verse }: VerseCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSelect = async () => {
        setIsLoading(true);
        try {
            await startSession(verse.id);
        } catch (error) {
            setIsLoading(false);
        }
    };

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="text-xl text-primary">{verse.reference}</CardTitle>
                <CardDescription>{verse.translation}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-gray-700 dark:text-gray-300 italic">
                    "{verse.text}"
                </p>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    onClick={handleSelect}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner size="sm" />
                            <span>Starting...</span>
                        </div>
                    ) : (
                        "Memorize This"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
