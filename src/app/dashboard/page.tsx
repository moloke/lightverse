import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Activity } from "lucide-react";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user profile
    const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    // Get active session
    const { data: activeSession } = await supabase
        .from("verse_sessions")
        .select(`
      *,
      bible_verses (
        reference,
        text,
        translation
      )
    `)
        .eq("user_id", user.id)
        .is("completed_at", null)
        .single();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Dashboard
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                Welcome back!
                            </p>
                        </div>
                        <div className="text-sm text-gray-500">
                            {profile?.phone_number}
                        </div>
                    </header>

                    {activeSession ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8 border-l-4 border-blue-500">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        Current Focus
                                    </h2>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                                        {activeSession.bible_verses.reference}
                                    </p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                                    Step {activeSession.current_step} / {activeSession.total_steps}
                                </div>
                            </div>

                            <p className="text-xl text-gray-700 dark:text-gray-300 italic mb-6 leading-relaxed">
                                "{activeSession.bible_verses.text}"
                            </p>

                            <div className="flex gap-4">
                                <Button className="w-full md:w-auto">
                                    Practice Now
                                </Button>
                                <Link href="/verses">
                                    <Button variant="outline" className="w-full md:w-auto">
                                        Change Verse
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center mb-8">
                            <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                No Active Verse
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                                You don't have a verse selected yet. Choose one from the library to start your memorization journey.
                            </p>
                            <Link href="/verses">
                                <Button size="lg" className="px-8">
                                    Browse Library
                                </Button>
                            </Link>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Verses
                                </CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">
                                    Memorized so far
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Current Streak
                                </CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">
                                    Days in a row
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total XP
                                </CardTitle>
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">
                                    Experience points
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
