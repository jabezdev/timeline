import { Settings, LogOut, Trash2, RefreshCw } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useTimelineMutations } from "@/hooks/useTimelineMutations"
import { useStructureQuery } from "@/hooks/useTimelineQueries"

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

const ACCENTS = [
  { name: 'Red', value: '1', cssVar: 'var(--workspace-1)' },
  { name: 'Orange', value: '2', cssVar: 'var(--workspace-2)' },
  { name: 'Amber', value: '3', cssVar: 'var(--workspace-3)' },
  { name: 'Olive', value: '4', cssVar: 'var(--workspace-4)' },
  { name: 'Green', value: '5', cssVar: 'var(--workspace-5)' },
  { name: 'Emerald', value: '6', cssVar: 'var(--workspace-6)' },
  { name: 'Cyan', value: '7', cssVar: 'var(--workspace-7)' },
  { name: 'Sky', value: '8', cssVar: 'var(--workspace-8)' },
  { name: 'Blue', value: '9', cssVar: 'var(--workspace-9)' },
  { name: 'Purple', value: '10', cssVar: 'var(--workspace-10)' },
  { name: 'Magenta', value: '11', cssVar: 'var(--workspace-11)' },
  { name: 'Pink', value: '12', cssVar: 'var(--workspace-12)' },
  { name: 'Black/White', value: '13', cssVar: 'var(--workspace-13)' },
  { name: 'Neutral', value: '14', cssVar: 'var(--workspace-14)' },
];

const CURATED_ACCENTS = [
  { name: 'Ocean', value: 'ocean', cssVar: 'var(--accent-ocean)' },
  { name: 'Forest', value: 'forest', cssVar: 'var(--accent-forest)' },
  { name: 'Violet', value: 'violet', cssVar: 'var(--accent-violet)' },
  { name: 'Sunset', value: 'sunset', cssVar: 'var(--accent-sunset)' },
  { name: 'Berry', value: 'berry', cssVar: 'var(--accent-berry)' },
  { name: 'Slate', value: 'slate', cssVar: 'var(--accent-slate)' },
];

const TEMPLATES = [
  {
    name: 'Everforest',
    theme: 'dark',
    accent: 'forest',
    mode: 'monochromatic'
  },
  {
    name: 'Minimal',
    theme: 'light',
    accent: 'slate',
    mode: 'monochromatic'
  },
  {
    name: 'Midnight',
    theme: 'dark',
    accent: 'ocean',
    mode: 'monochromatic'
  },
  {
    name: 'Native',
    theme: 'system',
    accent: '9', // Blue
    mode: 'full'
  }
];

export function PreferencesContent() {
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

  const { data: structure } = useStructureQuery();
  const mutations = useTimelineMutations();
  const userSettings = structure?.userSettings;

  const currentAccent = userSettings?.systemAccent || '9';
  const colorMode = userSettings?.colorMode || 'full';

  // Effect to sync --primary with system accent in monochromatic mode
  useEffect(() => {
    if (colorMode === 'monochromatic' && currentAccent) {
      let accentVar = `var(--workspace-${currentAccent})`;

      const curated = CURATED_ACCENTS.find(a => a.value === currentAccent);
      if (curated) {
        accentVar = curated.cssVar;
      } else {
        const standard = ACCENTS.find(a => a.value === currentAccent);
        if (standard) accentVar = standard.cssVar;
      }

      // We need to strip 'var(' and ')' if we are setting it as a value for another var that listens? 
      // No, setProperty('--primary', 'var(--accent-ocean)') works.
      document.documentElement.style.setProperty('--primary', accentVar);
      document.documentElement.style.setProperty('--ring', accentVar);
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%'); // Force white text for accents
    } else {
      // Revert to default theme values by removing inline overrides
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--primary-foreground');
    }
  }, [colorMode, currentAccent]);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTheme(t.theme);
    mutations.updateUserSettings.mutate({
      theme: t.theme as any,
      systemAccent: t.accent,
      colorMode: t.mode as any
    });
  };

  return (
    <div className="flex flex-col gap-6">

      {/* 1. Data Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data & Cache</h4>
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-xs font-normal"
            onClick={() => queryClient.invalidateQueries()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 opacity-70" />
            Refresh Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-xs font-normal hover:text-destructive"
            onClick={() => {
              queryClient.removeQueries()
              window.location.reload()
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" />
            Clear Cache
          </Button>
        </div>
      </div>

      {/* 2. Styling Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h4>

        {/* Templates */}
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="flex flex-col items-start p-2 rounded border border-border/50 hover:bg-secondary/50 hover:border-border transition-all text-left"
            >
              <span className="text-xs font-medium">{t.name}</span>
              <span className="text-[10px] text-muted-foreground opacity-70">
                {t.mode === 'monochromatic' ? 'Mono' : 'Full'} • {t.theme}
              </span>
            </button>
          ))}
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="theme" className="text-xs font-normal text-muted-foreground">Theme</Label>
            <div className="grid grid-cols-3 gap-1 bg-secondary/20 p-1 rounded-md">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`text-[10px] py-1 px-2 rounded-sm transition-all ${theme === t ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-normal text-muted-foreground">Color Mode</Label>
            <div className="grid grid-cols-2 gap-1 bg-secondary/20 p-1 rounded-md">
              {[
                { value: 'full', label: 'Full Color' },
                { value: 'monochromatic', label: 'Monochromatic' }
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => mutations.updateUserSettings.mutate({ colorMode: m.value as any })}
                  className={`text-[10px] py-1 px-2 rounded-sm transition-all ${colorMode === m.value ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-normal text-muted-foreground">System Accent</Label>

            {/* Curated Accents */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CURATED_ACCENTS.map(a => (
                <button
                  key={a.value}
                  onClick={() => mutations.updateUserSettings.mutate({ systemAccent: a.value })}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${currentAccent === a.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`}
                  style={{ backgroundColor: `hsl(${a.cssVar})` }}
                  title={a.name}
                />
              ))}
            </div>

            {/* Standard Accents */}
            <div className="flex flex-wrap gap-1.5">
              {ACCENTS.map(a => (
                <button
                  key={a.value}
                  onClick={() => mutations.updateUserSettings.mutate({ systemAccent: a.value })}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${currentAccent === a.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`}
                  style={{ backgroundColor: a.value === '13' ? 'hsl(var(--workspace-13))' : `hsl(${a.cssVar})` }}
                  title={a.name}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="font" className="text-xs font-normal text-muted-foreground">Font Family</Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger id="font" className="h-8 text-xs bg-background/50 border-border/50">
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
      </div>

      <div className="mt-auto pt-4 border-t border-dashed border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Log out
        </Button>
      </div>

    </div>
  )
}

export function PreferencesPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Settings">
          <Settings className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[80vh] overflow-y-auto p-4" align="start">
        <PreferencesContent />
      </PopoverContent>
    </Popover>
  )
}
