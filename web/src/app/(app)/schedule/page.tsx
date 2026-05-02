/**
 * @file schedule/page.tsx
 * @description Shift-Aware Study Calendar.
 * Visualizes shifts, study windows, and academic deadlines.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getShiftForDate, getFreeWindows, ShiftType, formatNepaliDate } from '@/lib/shiftUtils'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Zap,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [shiftConfig, setShiftConfig] = useState<any>(null)
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: shiftData } = await supabase.from('shift_configs').select('*').eq('id', user.id).single()
    const { data: deadData } = await supabase.from('deadlines').select('*').eq('user_id', user.id)

    setShiftConfig(shiftData)
    setDeadlines(deadData || [])
    setLoading(false)
  }

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const totalDays = daysInMonth(year, month)
    const startOffset = firstDayOfMonth(year, month)
    
    const days = []
    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="h-32 border-b border-r border-border bg-muted/5 opacity-20" />)

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d)
      const isToday = new Date().toDateString() === date.toDateString()
      
      let shift: ShiftType | null = null
      if (shiftConfig) {
        shift = getShiftForDate(date, new Date(shiftConfig.cycle_start_date), shiftConfig.first_shift_type as ShiftType)
      }

      const dayDeadlines = deadlines.filter(dead => {
        if (!dead.deadline_date) return false
        return new Date(dead.deadline_date).toDateString() === date.toDateString()
      })

      days.push(
        <div key={d} className={cn(
          "h-32 border-b border-r border-border p-3 transition-all hover:bg-muted/10 relative group",
          isToday && "bg-primary/[0.03]"
        )}>
          <div className="flex justify-between items-start">
            <span className={cn(
                "text-sm font-bold",
                isToday ? "w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center -mt-1 -ml-1" : "text-foreground/40"
            )}>{d}</span>
            {shift && (
                <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest",
                    shift === 'morning' ? "bg-teal/10 text-teal border border-teal/20" : 
                    shift === 'day' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
                    "bg-muted text-muted-foreground"
                )}>
                    {shift}
                </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1">
            {dayDeadlines.map(dead => (
                <div key={dead.id} className="text-[8px] font-bold bg-rose text-white px-2 py-1 rounded truncate shadow-sm">
                    {dead.title}
                </div>
            ))}
            {shift && shift !== 'off' && (
                <div className="text-[7px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2 h-2" /> Study Window Open
                </div>
            )}
          </div>

          {isToday && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#F4A118]" />}
        </div>
      )
    }

    return days
  }

  if (loading) return <div className="p-10 space-y-10 h-screen"><Skeleton className="h-10 w-48" /><Skeleton className="h-[60vh] rounded-[3rem]" /></div>

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-10 pb-24 text-foreground bg-background">
      
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground tracking-tight leading-none">Schedule</h1>
          <p className="text-muted-foreground text-sm">Visualize your shift cycles and study windows.</p>
        </div>
        <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-[2rem] border border-border">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-muted rounded-full transition-all"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-xs font-bold uppercase tracking-widest min-w-[120px] text-center">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-muted rounded-full transition-all"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </header>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-6 px-4">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-teal/20 border border-teal/40" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Morning Shift</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Day Shift</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Deadline</span>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="bg-card border-l border-t border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 bg-muted/20 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-4 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {renderCalendar()}
        </div>
      </div>

      {/* ── Today's Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[3rem] bg-primary/10 border border-primary/20 space-y-6 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles className="w-48 h-48 text-primary" /></div>
                <div className="space-y-1 relative z-10">
                    <h3 className="text-2xl font-bold text-foreground">{formatNepaliDate(new Date())}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Status: {shiftConfig ? 'Monitoring Shift Cycle' : 'Awaiting Config'}</p>
                </div>
                <div className="flex items-center gap-8 relative z-10">
                    <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Shift</div>
                        <div className="text-lg font-bold text-primary">{shiftConfig ? getShiftForDate(new Date(), new Date(shiftConfig.cycle_start_date), shiftConfig.first_shift_type as ShiftType) : '-'}</div>
                    </div>
                    <div className="w-px h-10 bg-primary/20" />
                    <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Study Hours</div>
                        <div className="text-lg font-bold text-foreground">~6.5 Hours</div>
                    </div>
                </div>
            </div>

            <div className="p-10 rounded-[3rem] bg-card border border-border flex items-center justify-center text-center">
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/30"><Target className="w-8 h-8" /></div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-[200px]">More schedule analytics coming in next update.</p>
                </div>
            </div>
      </div>

    </main>
  )
}
