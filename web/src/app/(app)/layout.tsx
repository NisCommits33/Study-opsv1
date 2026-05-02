/**
 * @file app/layout.tsx
 * @description Layout for protected application routes.
 * Includes the persistent sidebar navigation.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  Timer, 
  BookOpen, 
  Mic2, 
  Gamepad2, 
  Archive, 
  Inbox, 
  History, 
  Settings,
  Sparkles,
  Menu,
  X
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'MAIN' },
  { label: 'Deadlines', href: '/deadlines', icon: Calendar, section: 'MAIN' },
  { label: 'Schedule', href: '/schedule', icon: Clock, section: 'MAIN' },
  { label: 'Timer', href: '/timer', icon: Timer, section: 'MAIN' },
  
  { label: 'Exams', href: '/exams', icon: BookOpen, section: 'STUDY' },
  { label: 'Interview Prep', href: '/interview', icon: Mic2, section: 'STUDY' },
  { label: 'Simulator', href: '/simulator', icon: Gamepad2, section: 'STUDY' },
  { label: 'Answer Archive', href: '/archive', icon: Archive, section: 'STUDY' },
  
  { label: 'Capture Inbox', href: '/capture', icon: Inbox, section: 'TOOLS' },
  { label: 'Sessions', href: '/sessions', icon: History, section: 'TOOLS' },
  { label: 'Settings', href: '/settings', icon: Settings, section: 'TOOLS' },
]

import { ThemeToggle } from '@/components/ThemeToggle'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sections = ['MAIN', 'STUDY', 'TOOLS']

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background relative text-foreground">
      
      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-[60]">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted/50 rounded-xl transition-all"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Overlay (only when drawer is open) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            key="mobile-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[70] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar Navigation ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[80] w-72 border-r border-border p-8 flex flex-col gap-8 bg-card transition-transform duration-300 ease-out",
        "lg:static lg:bg-transparent lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto lg:z-auto lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="hidden lg:flex items-center justify-between">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
        
        <nav className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section} className="space-y-2">
              <h3 className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] px-4 opacity-50 uppercase">
                {section}
              </h3>
              <div className="space-y-0.5">
                {navItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all group",
                          isActive 
                            ? "bg-primary/10 text-primary font-bold shadow-[inset_0_0_20px_hsl(var(--primary)/0.05)]" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                        {item.label}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Summary */}
        <div className="mt-auto flex flex-col gap-6">
          <div className="p-4 bg-muted/20 rounded-3xl border border-border group hover:border-primary/20 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                N
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-bold truncate">Nischal</div>
                <div className="text-[9px] text-muted-foreground truncate uppercase tracking-widest">Shift Worker</div>
              </div>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors text-muted-foreground"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-[8px] font-mono text-muted-foreground tracking-[0.3em] opacity-20 uppercase">
            <Sparkles className="w-2 h-2" />
            Sprint 3 · Active
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
