import { getVerses } from "@/app/actions/verse-actions";
import { VerseCard } from "@/components/verses/VerseCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupportTicketButton } from "@/components/support/SupportTicketButton";

export default async function VerseLibraryPage() {
    const verses = await getVerses();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="mr-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Verse Library
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                            Select a verse to start memorizing
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {verses.map((verse) => (
                        <VerseCard key={verse.id} verse={verse} />
                    ))}
                </div>

                {verses.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No verses found in the library.</p>
                    </div>
                )}
            </div>
            
            {/* Floating Support Button */}
            <SupportTicketButton />
        </div>
    );
}
