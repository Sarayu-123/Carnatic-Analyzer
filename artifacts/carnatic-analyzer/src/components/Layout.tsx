import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { Music, BookOpen, Drum, AudioWaveform, PenLine, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Raga Identifier", icon: Music },
  { href: "/ragas", label: "Raga Browser", icon: BookOpen },
  { href: "/tala", label: "Tala Reference", icon: Drum },
  { href: "/detect", label: "Pitch Detect", icon: AudioWaveform },
  { href: "/compose", label: "Compose", icon: PenLine },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-sidebar sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">Carnatic Analyzer</span>
          </div>

          <nav className="flex items-center gap-1 flex-1" data-testid="main-nav">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            data-testid="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-4 text-xs text-muted-foreground text-center">
          Carnatic Analyzer — an interactive reference for Carnatic music
        </div>
      </footer>
    </div>
  );
}
