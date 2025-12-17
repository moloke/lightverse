import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            Welcome to LightVerse! 🎉
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            You're successfully authenticated with phone number: {profile?.phone_number}
                        </p>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Dashboard Coming Soon
                            </h2>
                            <p className="text-blue-700 dark:text-blue-300">
                                The full dashboard with verse selection, progress tracking, and streak counter will be implemented in the next phase.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    Current Verse
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    No verse selected yet
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    Progress
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    0/7 steps
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    Streak
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    0 days
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
