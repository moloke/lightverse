"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoneNumberInput } from "@/components/auth/PhoneNumberInput";
import { Card } from "@/components/ui/card";
import { Smartphone, Zap, Trophy } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const verseSteps = [
        "I can do all things through Christ who strengthens me.",
        "I can do all ______ through Christ who strengthens me.",
        "I can __ all ______ through ______ who strengthens me.",
        "I ___ __ all ______ through ______ who ___________ me.",
    ];

    useEffect(() => {
        setIsVisible(true);
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % verseSteps.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const handlePhoneSubmit = async (phoneNumber: string) => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phoneNumber }),
            });

            // Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server error. Please try again later.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send verification code");
            }

            // Store phone number in session storage for the verify page
            sessionStorage.setItem("phoneNumber", phoneNumber);

            // Redirect to verify page
            router.push("/verify");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToSignup = () => {
        document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 md:py-20">
                <div
                    className={`flex flex-col items-center text-center gap-8 transition-all duration-1000 transform ${
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                    }`}
                >
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold text-lg shadow-lg animate-bounce-subtle">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Completely Free</span>
                    </div>

                    {/* Main Heading */}
                    <div className="flex flex-col gap-4 max-w-4xl">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                            Memorize Scripture
                            <br />
                            One Text at a Time
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-700 text-pretty leading-relaxed">
                            Master Bible verses through daily SMS practice. Progressive learning that fits your life - no apps to
                            open, just text and learn.
                        </p>
                    </div>

                    {/* Signup Form */}
                    <div id="signup-form" className="w-full max-w-md mt-4">
                        <PhoneNumberInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md w-full">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Demo Section - Animated Verse */}
                    <Card className="w-full max-w-2xl mt-8 p-8 bg-white/80 backdrop-blur-sm border-2 border-indigo-100 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Daily Practice Example</span>
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                    Step {currentStep + 1}/4
                                </span>
                            </div>
                            <div className="min-h-[120px] flex items-center justify-center">
                                <p
                                    key={currentStep}
                                    className="text-2xl md:text-3xl font-serif text-gray-800 text-center leading-relaxed animate-fade-in"
                                    style={{
                                        animation: "fadeIn 0.5s ease-in-out",
                                    }}
                                >
                                    {verseSteps[currentStep]}
                                </p>
                            </div>
                            <p className="text-sm text-center text-gray-500 italic">Philippians 4:13</p>
                        </div>
                    </Card>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
                    {[
                        {
                            icon: <Smartphone className="w-8 h-8 text-indigo-600" />,
                            title: "SMS-Based Learning",
                            description: "Receive daily verse practice via text. No apps to download or remember to open.",
                        },
                        {
                            icon: <Zap className="w-8 h-8 text-indigo-600" />,
                            title: "Progressive Method",
                            description:
                                "Words gradually disappear as you master each verse. Proven spaced repetition technique.",
                        },
                        {
                            icon: <Trophy className="w-8 h-8 text-indigo-600" />,
                            title: "Build Streaks",
                            description:
                                "Track your daily practice and build momentum with streak counters and completion badges.",
                        },
                    ].map((feature, index) => (
                        <Card
                            key={index}
                            className="p-6 bg-white/60 backdrop-blur-sm border border-indigo-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                            style={{
                                animation: `fadeInUp 0.6s ease-out ${index * 0.2}s both`,
                            }}
                        >
                            <div className="flex flex-col gap-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* How It Works Section */}
                <div className="mt-24 max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
                    <div className="space-y-8">
                        {[
                            {
                                step: "1",
                                title: "Choose Your Verse",
                                description: "Pick any Bible verse you want to memorize from our curated collection.",
                            },
                            {
                                step: "2",
                                title: "Receive Daily Texts",
                                description:
                                    "Get a text each morning with your verse. Words gradually disappear as you progress.",
                            },
                            {
                                step: "3",
                                title: "Reply & Build Streaks",
                                description:
                                    "Text back the missing words to check your memory. Build daily streaks and complete verses.",
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="flex gap-6 items-start"
                                style={{
                                    animation: `fadeInLeft 0.8s ease-out ${index * 0.3}s both`,
                                }}
                            >
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                                    {item.step}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-lg text-gray-600 leading-relaxed">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-24 text-center">
                    <Card className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-indigo-600 to-blue-600 text-white border-0 shadow-2xl">
                        <h2 className="text-4xl font-bold mb-4 text-balance">Ready to Start Your Journey?</h2>
                        <p className="text-xl mb-8 text-indigo-100 text-pretty">
                            Join others who are building lasting scripture memory through daily practice.
                        </p>
                        <button
                            onClick={scrollToSignup}
                            className="inline-flex items-center justify-center rounded-md text-lg px-8 py-6 bg-white text-indigo-600 hover:bg-gray-100 shadow-lg transition-colors font-semibold"
                        >
                            Get Started Now
                        </button>
                    </Card>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes bounce-subtle {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-5px);
                    }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
