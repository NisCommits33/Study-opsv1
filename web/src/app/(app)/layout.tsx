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
  Sparkles
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const sections = ['MAIN', 'STUDY', 'TOOLS']

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-white/5 p-6 flex flex-col gap-8 sticky top-0 h-screen overflow-y-auto">
        <Logo size="sm" />
        
        <nav className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section} className="space-y-2">
              <h3 className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] px-3">
                {section}
              </h3>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
                          isActive 
                            ? "bg-saffron/10 text-saffron font-bold" 
                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full bg-current opacity-40 group-hover:opacity-100 transition-opacity",
                          !isActive && "invisible group-hover:visible"
                        )} />
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Summary & Logout */}
        <div className="mt-auto flex flex-col gap-4">
          <div className="p-4 glass rounded-2xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-saffron/20 border border-saffron/30 flex items-center justify-center font-display text-saffron text-xs">
                N
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-bold truncate">Nischal</div>
                <div className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">Shift Worker</div>
              </div>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="p-2 hover:bg-rose/10 hover:text-rose rounded-lg transition-colors text-muted-foreground"
                title="Logout"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-[8px] font-mono text-muted-foreground tracking-widest opacity-30">
            <Sparkles className="w-2 h-2" />
            STUDY OPS V1.0 · SPRINT 2
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
