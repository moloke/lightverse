import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Pause for 7 days
        const pausedUntil = new Date();
        pausedUntil.setDate(pausedUntil.getDate() + 7);

        const { error } = await supabase
            .from("users")
            .update({ paused_until: pausedUntil.toISOString() })
            .eq("id", user.id);

        if (error) {
            return NextResponse.json({ error: "Failed to pause account" }, { status: 500 });
        }

        revalidatePath("/profile");

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
