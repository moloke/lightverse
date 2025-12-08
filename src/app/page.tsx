import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <main className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                    Welcome to LightVerse
                </h1>
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                    Memorize Bible verses through daily SMS reminders with progressive cloze deletion.
                    Build your spiritual discipline one verse at a time.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/login"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Get Started
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                        Dashboard
                    </Link>
                </div>
            </main>
        </div>
    );
}
