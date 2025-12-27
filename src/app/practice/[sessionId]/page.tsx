"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PracticeInterface } from "@/components/practice/PracticeInterface";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { createClient } from "@/lib/supabase/client";

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default function PracticePage({ params }: PageProps) {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const loadSession = async () => {
            const resolvedParams = await params;
            const id = resolvedParams.sessionId;
            setSessionId(id);

            const supabase = createClient();
            const { data: sessionData, error } = await supabase
                .from("verse_sessions")
                .select(`
                    *,
                    bible_verses (
                        reference,
                        text,
                        translation
                    )
                `)
                .eq("id", id)
                .single();

            if (error || !sessionData) {
                router.push("/dashboard");
                return;
            }

            setSession(sessionData);
            setLoading(false);
        };

        loadSession();
    }, [params, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading practice session..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
            <PracticeInterface session={session} />
        </div>
    );
}
