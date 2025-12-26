"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"

interface UserMenuProps {
  displayName: string
}

export function UserMenu({ displayName }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleProfile = () => {
    router.push("/profile")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {displayName}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleProfile}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
