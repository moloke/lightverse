"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")
  
  const name = formData.get("name") as string
  
  const { error } = await supabase
    .from("users")
    .update({ name: name.trim() || null })
    .eq("id", user.id)
  
  if (error) throw new Error("Failed to update profile")
  
  revalidatePath("/profile")
  revalidatePath("/dashboard")
}

export async function pauseAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")
  
  // Pause for 7 days
  const pausedUntil = new Date()
  pausedUntil.setDate(pausedUntil.getDate() + 7)
  
  const { error } = await supabase
    .from("users")
    .update({ paused_until: pausedUntil.toISOString() })
    .eq("id", user.id)
  
  if (error) throw new Error("Failed to pause account")
  
  revalidatePath("/profile")
}

export async function resumeAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")
  
  const { error } = await supabase
    .from("users")
    .update({ paused_until: null })
    .eq("id", user.id)
  
  if (error) throw new Error("Failed to resume account")
  
  revalidatePath("/profile")
}

export async function disableAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")
  
  const { error } = await supabase
    .from("users")
    .update({ account_disabled: true })
    .eq("id", user.id)
  
  if (error) throw new Error("Failed to disable account")
  
  revalidatePath("/profile")
}

export async function enableAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")
  
  const { error } = await supabase
    .from("users")
    .update({ account_disabled: false })
    .eq("id", user.id)
  
  if (error) throw new Error("Failed to enable account")
  
  revalidatePath("/profile")
}
