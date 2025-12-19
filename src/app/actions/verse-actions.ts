"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getVerses() {
    const supabase = await createClient();

    const { data: verses, error } = await supabase
        .from("bible_verses")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching verses:", error);
        return [];
    }

    return verses;
}

export async function startSession(verseId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 1. Check if there's already an active session
    const { data: activeSession } = await supabase
        .from("verse_sessions")
        .select("id")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .single();

    // 2. If there is, mark it as completed (or we could delete it/pause it)
    // For MVP, we'll just mark it as "abandoned" by setting completed_at to now
    // but logically it means they switched. Or we can just delete it.
    // Let's actually DELETE the old active session to keep it simple: "One active focus"
    if (activeSession) {
        await supabase
            .from("verse_sessions")
            .delete()
            .eq("id", activeSession.id);
    }

    // 3. Create new session
    const { error } = await supabase.from("verse_sessions").insert({
        user_id: user.id,
        verse_id: verseId,
        current_step: 1,
        total_steps: 7,
    });

    if (error) {
        console.error("Error creating session:", error);
        throw new Error("Failed to start memorization session");
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
}
