"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { nextStreak, streakWritePayload } from "@core/streaks.ts";
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

    return verses || [];
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
    //
    // This wrote to a `streaks.date` column that migration 009 dropped, on both the update and the
    // insert path, and bound the resulting error to an unused variable. Practising on the web
    // therefore built no streak at all, silently (gap C-1). The decision now lives in
    // `_shared/core/streaks.ts` so it is testable and shared rather than restated per runtime.
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: streakData } = await supabase
        .from("streaks")
        .select("current_streak, last_activity_date")
        .eq("user_id", user.id)
        .single();

    const decision = nextStreak({
        lastActivityDate: streakData?.last_activity_date,
        todayKey: today,
        currentStreak: streakData?.current_streak,
    });

    if (decision.shouldWrite) {
        const { error: streakError } = streakData
            ? await supabase
                .from("streaks")
                .update(streakWritePayload(decision, today))
                .eq("user_id", user.id)
            : await supabase
                .from("streaks")
                .insert({
                    user_id: user.id,
                    ...streakWritePayload(decision, today),
                });

        // Log rather than throw: a streak write failing must not discard the practice the user
        // just completed. Silence here is what hid this bug for months.
        if (streakError) {
            console.error("Failed to write streak", {
                userId: user.id,
                error: streakError.message,
            });
        }
    }

    revalidatePath(`/practice/${sessionId}`);
    revalidatePath("/dashboard");

    return { success: true, isCompleted, nextStep, xpGain };
}
