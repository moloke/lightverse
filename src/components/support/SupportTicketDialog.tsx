"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Bug, HelpCircle, Lightbulb } from "lucide-react";

interface SupportTicketDialogProps {
    trigger?: React.ReactNode;
    variant?: "button" | "icon";
}

export function SupportTicketDialog({ trigger, variant = "button" }: SupportTicketDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    
    const [ticketType, setTicketType] = useState("help");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");

    const resetForm = () => {
        setTicketType("help");
        setEmail("");
        setSubject("");
        setDescription("");
        setError("");
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/support/submit-ticket", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ticketType,
                    email: email.trim(),
                    subject: subject.trim(),
                    description: description.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit ticket");
            }

            setSuccess(true);
            setTimeout(() => {
                setOpen(false);
                resetForm();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const defaultTrigger = variant === "icon" ? (
        <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white border-0"
        >
            <MessageCircle className="h-6 w-6" />
        </Button>
    ) : (
        <Button variant="outline" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Help & Support
        </Button>
    );

    const getIcon = (type: string) => {
        switch (type) {
            case "bug":
                return <Bug className="h-4 w-4" />;
            case "help":
                return <HelpCircle className="h-4 w-4" />;
            case "feature":
                return <Lightbulb className="h-4 w-4" />;
            default:
                return <MessageCircle className="h-4 w-4" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) resetForm();
        }}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                        Get Help
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Submit a bug report, ask for help, or suggest a feature. We'll get back to you soon!
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-green-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Ticket Submitted!</h3>
                            <p className="text-sm text-gray-600 mt-2">
                                We've received your request and will respond as soon as possible.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ticket-type">Type</Label>
                            <Select value={ticketType} onValueChange={setTicketType}>
                                <SelectTrigger id="ticket-type">
                                    <SelectValue placeholder="Select ticket type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="help" className="gap-2">
                                        <div className="flex items-center gap-2">
                                            {getIcon("help")}
                                            <span>Help & Support</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="bug" className="gap-2">
                                        <div className="flex items-center gap-2">
                                            {getIcon("bug")}
                                            <span>Bug Report</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="feature" className="gap-2">
                                        <div className="flex items-center gap-2">
                                            {getIcon("feature")}
                                            <span>Feature Request</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="other" className="gap-2">
                                        <div className="flex items-center gap-2">
                                            {getIcon("other")}
                                            <span>Other</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Your Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500">
                                We'll use this to respond to your ticket
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                placeholder="Brief description of your issue"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                                disabled={loading}
                                maxLength={200}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Please provide as much detail as possible..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                disabled={loading}
                                rows={6}
                                className="resize-none"
                            />
                            <p className="text-xs text-gray-500">
                                {description.length}/1000 characters
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || !email.trim() || !subject.trim() || !description.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {loading ? "Submitting..." : "Submit Ticket"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
