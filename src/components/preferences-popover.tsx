import { Settings, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

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

const ACCENT_COLORS = [
  { name: "Blue", value: "blue", color: "hsl(217 91% 60%)" },
  { name: "Purple", value: "purple", color: "hsl(280 65% 60%)" },
  { name: "Green", value: "green", color: "hsl(160 84% 39%)" },
  { name: "Orange", value: "orange", color: "hsl(32 95% 55%)" },
  { name: "Rose", value: "rose", color: "hsl(340 82% 52%)" },
  { name: "Teal", value: "teal", color: "hsl(172 66% 50%)" },
]

const FONTS = [
  { name: "Inter", value: "inter", family: "'Inter', sans-serif" },
  { name: "Plus Jakarta Sans", value: "jakarta", family: "'Plus Jakarta Sans', sans-serif" },
  { name: "Manrope", value: "manrope", family: "'Manrope', sans-serif" },
]

export function PreferencesPopover() {
  const { theme, setTheme } = useTheme()
  const [accent, setAccent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accent-color') || 'blue'
    }
    return 'blue'
  })
  const [font, setFont] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('font-family') || 'inter'
    }
    return 'inter'
  })

  useEffect(() => {
    // Apply accent color
    const accentColor = ACCENT_COLORS.find(c => c.value === accent)
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-color', accentColor.color)
      document.documentElement.setAttribute('data-accent', accent)
    }
    localStorage.setItem('accent-color', accent)
  }, [accent])

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
        <Button variant="outline" size="icon" title="Preferences">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Preferences</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Preferences</h4>
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

          {/* Color Accent */}
          <div className="grid gap-2">
            <Label>Color Accent</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccent(color.value)}
                  className="relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ 
                    backgroundColor: color.color,
                    borderColor: accent === color.value ? 'hsl(var(--foreground))' : 'transparent'
                  }}
                  title={color.name}
                >
                  {accent === color.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
