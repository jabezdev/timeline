import { Settings, LogOut, Trash2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const FONTS = [
  { name: "Inter", value: "inter", family: "'Inter', sans-serif" },
  { name: "Plus Jakarta Sans", value: "jakarta", family: "'Plus Jakarta Sans', sans-serif" },
  { name: "Manrope", value: "manrope", family: "'Manrope', sans-serif" },
]

export function PreferencesPopover() {
  const { theme, setTheme } = useTheme()
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const [font, setFont] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('font-family') || 'inter'
    }
    return 'inter'
  })

  useEffect(() => {
    // Apply font family
    const selectedFont = FONTS.find(f => f.value === font)
    if (selectedFont) {
      document.documentElement.style.setProperty('--font-family', selectedFont.family)
      document.body.style.fontFamily = selectedFont.family
    }
    localStorage.setItem('font-family', font)
  }, [font])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Settings">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium leading-none">Settings</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Customize the appearance of the app.
            </p>
          </div>

          {/* Theme */}
          <div className="grid gap-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font */}
          <div className="grid gap-2">
            <Label htmlFor="font">Font</Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger id="font">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-2" />

          {/* Clear Cache */}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => {
              queryClient.removeQueries()
              // Optional: You could reload the page or show a toast here
              window.location.reload()
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache
          </Button>

          <Separator className="my-2" />

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
