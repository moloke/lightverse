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

    return [];

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
        throw new Error("Failed to start memorization session");
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

export async function getSession(sessionId: string) {
    const supabase = await createClient();

    const { data: session, error } = await supabase
        .from("verse_sessions")
        .select(`
      *,
      bible_verses (
        reference,
        text,
        translation
      )
    `)
        .eq("id", sessionId)
        .single();

    if (error) {
        return null;
    }

    return session;
}

export async function updateProgress(sessionId: string, currentStep: number) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const nextStep = currentStep + 1;
    const isCompleted = nextStep > 7;

    // 1. Update Session Progress
    const updates: any = {
        current_step: isCompleted ? 7 : nextStep,
        updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
        updates.completed_at = new Date().toISOString();
    }

    const { error: sessionError } = await supabase
        .from("verse_sessions")
        .update(updates)
        .eq("id", sessionId);

    if (sessionError) {
        throw new Error("Failed to update progress");
    }

    // 2. Handle Stats (XP & Streak)
    // XP Logic: 10 XP per step, 100 XP bonus for completion
    let xpGain = 10;
    if (isCompleted) xpGain += 100;

    // Update XP
    const { data: userData } = await supabase
        .from("users")
        .select("total_xp")
        .eq("id", user.id)
        .single();

    const currentXp = userData?.total_xp || 0;
    await supabase
        .from("users")
        .update({ total_xp: currentXp + xpGain })
        .eq("id", user.id);

    // Streak Logic
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: streakData } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (streakData) {
        const lastActivity = (streakData.date || streakData.last_activity_date).split('T')[0];

        if (lastActivity !== today) {
            // Check if it's consecutive (yesterday)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            let newStreak = streakData.current_streak;
            if (lastActivity === yesterdayStr) {
                newStreak += 1;
            } else {
                newStreak = 1; // Reset if missed a day
            }

            const { error: updateError } = await supabase
                .from("streaks")
                .update({
                    current_streak: newStreak,
                    date: new Date().toISOString()
                })
                .eq("user_id", user.id);

            // Error updating streak
        }
    } else {
        // Create first streak record
        const { error: insertError } = await supabase
            .from("streaks")
            .insert({
                user_id: user.id,
                current_streak: 1,
                date: new Date().toISOString()
            });

        // Error creating streak
    }

    revalidatePath(`/practice/${sessionId}`);
    revalidatePath("/dashboard");

    return { success: true, isCompleted, nextStep, xpGain };
}
