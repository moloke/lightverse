import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  updateProfile,
  pauseAccount,
  resumeAccount,
  disableAccount,
  enableAccount
} from "@/app/actions/profile-actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SupportTicketButton } from "@/components/support/SupportTicketButton"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  console.log('[Profile] Auth check:', { user: user?.id, authError })

  if (!user) {
    console.log('[Profile] No user found, redirecting to login')
    redirect("/login")
  }

  // Fetch user profile with stats
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(`
      *,
      verse_sessions (
        id,
        completed_at
      )
    `)
    .eq("id", user.id)
    .single()

  console.log('[Profile] Profile fetch:', { profile: !!profile, profileError })

  if (!profile) {
    console.log('[Profile] No profile found for user, error:', profileError)
    redirect("/login")
  }

  // Calculate stats
  const sessions = profile.verse_sessions || []
  const completedSessions = sessions.filter((s: any) => s.completed_at)
  const totalXP = profile.total_xp || 0
  
  // Handle optional fields (may not exist if migration hasn't run)
  const isPaused = profile.paused_until ? new Date(profile.paused_until) > new Date() : false
  const isDisabled = profile.account_disabled || false

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Account Status Card */}
          {(isPaused || isDisabled) && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-6">
                {isDisabled ? (
                  <div className="text-yellow-800 dark:text-yellow-200">
                    ⚠️ Your account is disabled. No SMS messages will be sent.
                  </div>
                ) : isPaused ? (
                  <div className="text-yellow-800 dark:text-yellow-200">
                    ⏸️ Your account is paused until {new Date(profile.paused_until!).toLocaleDateString()}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-600 dark:text-gray-400">Phone Number</Label>
                <div className="text-lg font-medium">{profile.phone_number}</div>
              </div>

              <div>
                <Label className="text-gray-600 dark:text-gray-400">Member Since</Label>
                <div className="text-lg font-medium">
                  {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </div>

              <form action={updateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your name (optional)"
                      defaultValue={profile.name || ""}
                      className="flex-1"
                    />
                    <Button type="submit">Save</Button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {profile.name ? `Current: ${profile.name}` : "Not set"}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {sessions.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total Verses
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {completedSessions.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Completed
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {totalXP}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total XP
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>SMS Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Pause Status</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isPaused 
                    ? `Paused until ${new Date(profile.paused_until!).toLocaleDateString()}`
                    : "Active - You will receive daily SMS reminders"}
                </p>
                <div className="flex gap-2">
                  {isPaused ? (
                    <form action={resumeAccount}>
                      <Button type="submit" variant="outline">
                        Resume SMS
                      </Button>
                    </form>
                  ) : (
                    <form action={pauseAccount}>
                      <Button type="submit" variant="outline">
                        Pause for 7 Days
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone Card */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Account Status</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {isDisabled 
                    ? "Your account is currently disabled. No SMS messages will be sent."
                    : "Your account is active."}
                </p>
                {isDisabled ? (
                  <form action={enableAccount}>
                    <Button 
                      type="submit" 
                      variant="outline"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      Re-enable Account
                    </Button>
                  </form>
                ) : (
                  <form action={disableAccount}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Disable Account
                    </Button>
                  </form>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Disabling your account will stop all SMS messages. You can log back in to re-enable it.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Floating Support Button */}
      <SupportTicketButton />
    </div>
  )
}
