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

        const { error } = await supabase
            .from("users")
            .update({ account_disabled: false })
            .eq("id", user.id);

        if (error) {
            return NextResponse.json({ error: "Failed to enable account" }, { status: 500 });
        }

        revalidatePath("/profile");

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
