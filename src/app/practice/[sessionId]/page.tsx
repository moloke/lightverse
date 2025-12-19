import { getSession } from "@/app/actions/verse-actions";
import { PracticeInterface } from "@/components/practice/PracticeInterface";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default async function PracticePage({ params }: PageProps) {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    if (!session) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
            <PracticeInterface session={session} />
        </div>
    );
}
