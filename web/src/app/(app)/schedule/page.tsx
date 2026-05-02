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
  AlertCircle,
  Sparkles,
  ChevronUp,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [shiftConfig, setShiftConfig] = useState<any>(null)
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [weakSpots, setWeakSpots] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rescheduling, setRescheduling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [shiftRes, deadRes, planRes, subRes, weakRes] = await Promise.all([
      supabase.from('shift_configs').select('*').eq('user_id', user.id).single(),
      supabase.from('deadlines').select('*').eq('user_id', user.id).order('deadline_date', { ascending: true }),
      supabase.from('daily_plans').select('*').eq('user_id', user.id).eq('status', 'active'),
      supabase.from('subjects').select('*'),
      supabase.from('weak_spots').select('*').eq('user_id', user.id).eq('resolved', false).limit(5)
    ])

    setShiftConfig(shiftRes.data)
    setDeadlines(deadRes.data || [])
    setPlans(planRes.data || [])
    setSubjects(subRes.data || [])
    setWeakSpots(weakRes.data || [])
    setLoading(false)
  }


  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM to 11 PM

  const getActivePlan = () => {
    const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    return plans.find(p => p.date === todayStr)
  }

  const getShiftForCurrent = () => {
    if (!shiftConfig) return null
    return getShiftForDate(currentDate, new Date(shiftConfig.cycle_start_date), shiftConfig.first_shift_type as ShiftType)
  }

  if (loading) return <div className="p-10 space-y-10 h-screen"><Skeleton className="h-10 w-48" /><Skeleton className="h-[60vh] rounded-3xl" /></div>

  const activePlan = getActivePlan()
  const currentShift = getShiftForCurrent()
  const isToday = new Date().toDateString() === currentDate.toDateString()

  return (
    <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 pb-24 text-foreground bg-background">
      
      {/* ── Top Bar ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold text-foreground tracking-tight leading-none">Schedule</h1>
            <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-border">
                <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))} className="p-1.5 hover:bg-muted rounded-xl transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[11px] font-bold uppercase tracking-widest min-w-[140px] text-center">{currentDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))} className="p-1.5 hover:bg-muted rounded-xl transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {currentShift && (
                <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full shadow-sm text-xs text-muted-foreground">
                    <div className={cn("w-2 h-2 rounded-full", currentShift === 'morning' ? "bg-teal" : currentShift === 'day' ? "bg-saffron" : "bg-muted")} />
                    <span className="font-bold uppercase tracking-wider">{currentShift} shift</span>
                    <span className="opacity-40">·</span>
                    <span>{currentShift === 'morning' ? '12:30–19:00' : currentShift === 'day' ? '06:30–13:00' : 'OFF'}</span>
                </div>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        
        {/* ── Timeline Column ── */}
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Today's Timeline
                    </h2>
                    <div className="label-mono opacity-50 flex gap-4">
                        <span>{activePlan ? '3h planned' : 'No plan'}</span>
                        <span>Mood: ⚡ {activePlan?.mood || 'focused'}</span>
                    </div>
                </div>
                
                <div className="p-6 lg:p-8 space-y-0">
                    {hours.map((hour) => {
                        const hourStr = `${hour.toString().padStart(2, '0')}:00`
                        const block = activePlan?.plan_json?.blocks?.find((b: any) => b.start.startsWith(hour.toString().padStart(2, '0')))
                        
                        return (
                            <div key={hour} className="flex gap-6 min-h-[80px] relative">
                                <div className="w-12 text-right pt-2">
                                    <span className="label-mono opacity-30">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'pm' : 'am'}</span>
                                </div>
                                <div className="flex-1 border-t border-border pt-4 pb-4 relative">
                                    {isToday && new Date().getHours() === hour && (
                                        <div className="absolute -top-3 left-0 right-0 flex items-center gap-2 z-10">
                                            <div className="w-2 h-2 rounded-full bg-rose shadow-[0_0_10px_var(--color-rose)]" />
                                            <div className="h-px flex-1 bg-rose/30" />
                                            <span className="label-mono text-rose text-[9px]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    )}

                                    {block ? (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-lg",
                                                block.type === 'study' ? "bg-teal/5 border-teal/20 border-l-4 border-l-teal" : 
                                                block.type === 'break' ? "bg-muted/10 border-transparent opacity-60" :
                                                "bg-rose/5 border-rose/20 border-l-4 border-l-rose"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-bold text-foreground">{block.topic}</div>
                                                <div className="text-[9px] font-mono opacity-50">{block.start} – {block.end}</div>
                                            </div>
                                            {block.type === 'study' && (
                                                <div className="flex flex-col gap-1.5 mt-3">
                                                    <div className="flex items-center gap-2 text-[10px] text-teal font-bold uppercase tracking-widest">
                                                        <Target className="w-3 h-3" /> Objectives
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                            <div className="w-1 h-1 rounded-full bg-teal" /> Essential Provisions
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                            <div className="w-1 h-1 rounded-full bg-teal" /> Past Paper Analysis
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div className="h-full flex items-center px-4">
                                            <div className="text-[10px] label-mono opacity-10 uppercase tracking-[0.3em]">Free Window</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* ── Sidebar Column ── */}
        <div className="space-y-6">
            
            {/* Stats Card */}
            <div className="p-6 rounded-[2.5rem] bg-card border border-border space-y-4">
                <div className="label-mono opacity-50">Today at a glance</div>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-3xl font-display text-primary leading-none">3h 10m</div>
                        <div className="text-[10px] label-mono opacity-60 mt-1">Planned Study</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-foreground leading-none">9h</div>
                        <div className="text-[10px] label-mono opacity-60 mt-1">Free</div>
                    </div>
                </div>
                <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full bg-teal w-1/3 rounded-full" />
                </div>
                <div className="text-[9px] label-mono opacity-40 text-center uppercase tracking-tighter">0 of 3h 10m completed</div>
            </div>

            {/* Deadlines */}
            <div className="p-6 rounded-[2.5rem] bg-card border border-border space-y-6">
                <div className="label-mono opacity-50">Deadlines</div>
                <div className="space-y-4">
                    {deadlines.slice(0, 3).map(dead => (
                        <div key={dead.id} className="flex items-center gap-4 group">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex flex-col items-center justify-center border",
                                dead.priority === 'critical' ? "bg-rose/10 border-rose/20 text-rose" : "bg-muted/20 border-border"
                            )}>
                                <span className="text-sm font-bold leading-none">
                                    {Math.ceil((new Date(dead.deadline_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))}
                                </span>
                                <span className="text-[7px] uppercase font-bold">days</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{dead.title}</div>
                                <div className="text-[9px] label-mono opacity-40 truncate">{new Date(dead.deadline_date).toLocaleDateString()}</div>
                            </div>
                            {dead.priority === 'critical' && <AlertCircle className="w-3 h-3 text-rose" />}
                        </div>
                    ))}
                </div>
            </div>


            {/* Weak Spots */}
            <div className="p-6 rounded-[2.5rem] bg-card border border-border space-y-4">
                <div className="label-mono opacity-50">Active Weak Spots</div>
                <div className="space-y-3">
                    {weakSpots.map((w, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose/60" />
                            <div className="text-[11px] text-foreground flex-1 truncate">{w.topic}</div>
                            <div className="label-mono text-[9px] opacity-40">{w.frequency}x</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Objectives */}
            <div className="p-6 rounded-[2.5rem] bg-card border border-border space-y-4">
                <div className="label-mono opacity-50">8:00 AM Objectives</div>
                <div className="space-y-2">
                    {[
                        { t: "HDFS architecture & namenode", d: true },
                        { t: "Replication factor & fault tolerance", d: false },
                        { t: "Block storage mechanism", d: false }
                    ].map((obj, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <button className={cn(
                                "w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-all",
                                obj.d ? "bg-teal border-teal text-white" : "border-border hover:border-teal"
                            )}>
                                {obj.d && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                            <span className={cn("text-[11px] leading-tight", obj.d ? "text-muted-foreground line-through" : "text-foreground")}>{obj.t}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>

      </div>

    </main>
  )
}
