/**
 * @file dashboard/page.tsx
 * @description Refined Dashboard following the StudyOps Design System.
 * Features shift awareness, stat cards, and activity overview with a premium aesthetic.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getShiftForDate, getFreeWindows, formatNepaliDate, ShiftType } from '@/lib/shiftUtils'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  Sparkles, 
  Target, 
  ChevronRight,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Dashboard Component.
 */
export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [shiftConfig, setShiftConfig] = useState<any>(null)
  const [currentShift, setCurrentShift] = useState<ShiftType | null>(null)
  const [mood, setMood] = useState<string>('focused')

  const [deadlines, setDeadlines] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [overallRisk, setOverallRisk] = useState<number>(0)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, shiftRes, deadRes, freqRes, progRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('shift_configs').select('*').eq('user_id', user.id).single(),
        supabase.from('deadlines').select('*').eq('user_id', user.id).order('deadline_date', { ascending: true }),
        supabase.from('chapter_frequency').select('*, section:section_id(title, section_number)'),
        supabase.from('exam_progress').select('*').eq('user_id', user.id)
      ])

      setProfile(profileRes.data)
      setShiftConfig(shiftRes.data)
      setDeadlines(deadRes.data || [])

      if (shiftRes.data) {
        const shift = getShiftForDate(
          new Date(),
          new Date(shiftRes.data.cycle_start_date),
          shiftRes.data.first_shift_type as ShiftType
        )
        setCurrentShift(shift)
      }

      // Calculate Risks & Recommendations
      if (freqRes.data) {
        const processed = freqRes.data.map(f => {
          const progress = progRes.data?.find(p => p.section_id === f.section_id)
          const confidence = progress?.status === 'done' ? 1.0 : 0.2 // Mock confidence logic
          const risk = f.frequency_count * (1.1 - confidence)
          return { ...f, risk, confidence }
        }).sort((a, b) => b.risk - a.risk)

        setRecommendations(processed.slice(0, 3))
        const avgRisk = processed.reduce((acc, curr) => acc + curr.risk, 0) / (processed.length || 1)
        setOverallRisk(Math.min(100, Math.round(avgRisk * 10)))
      }
      
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-10 space-y-10 bg-background h-screen">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
      </div>
    )
  }

  const freeWindows = currentShift ? getFreeWindows(currentShift) : []

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-10 pb-24 text-foreground bg-background">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
            Overview · {formatNepaliDate(new Date())}
          </div>
          <h1 className="text-4xl font-display text-foreground">
            Hi, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Scholar'}</span>
          </h1>
        </div>
        
        {/* Mood Selector from Design System */}
        <div className="flex gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border">
          {[
            { id: 'focused', emoji: '⚡', label: 'FOCUSED' },
            { id: 'okay', emoji: '😐', label: 'OKAY' },
            { id: 'low', emoji: '😴', label: 'LOW' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all border border-transparent",
                mood === m.id 
                  ? "bg-primary/10 border-primary/20" 
                  : "hover:bg-muted"
              )}
            >
              <span className="text-lg">{m.emoji}</span>
              <span className="font-mono text-[8px] text-muted-foreground tracking-widest">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stat Cards from Design System */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Study streak" 
          value="12" 
          sub="days · personal best 14" 
          accent 
        />
        <StatCard 
          label="Shift Status" 
          value={currentShift || 'Off'} 
          sub={currentShift === 'off' ? 'Free 6.5h today' : '12:30–19:00'} 
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard 
          label="Weak spots" 
          value="7" 
          sub="across 3 subjects" 
          color="text-rose" 
        />
        <StatCard 
          label="Days to exam" 
          value="27" 
          sub="Big Data · May 29" 
          color="text-primary" 
        />
      </section>

      {/* Main Focus Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Plan */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-10 relative overflow-hidden group shadow-sm flex flex-col">
          {!shiftConfig ? (
            <EmptyState 
              icon={Zap}
              title="Intelligence Engine Inactive"
              description="Configure your work shifts and study preferences to unlock automated planning and focus sessions."
              action={{
                label: "Setup Study Cycle",
                onClick: () => router.push('/onboarding'),
                icon: Plus
              }}
              className="border-none bg-transparent min-h-[300px]"
            />
          ) : (
            <>
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
              
              <div className="flex items-center justify-between relative z-10 mb-8">
                <h2 className="text-2xl font-display flex items-center gap-3 text-foreground">
                  <Target className="w-6 h-6 text-primary" />
                  Today's Focus Plan
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">STUDY RISK</div>
                    <div className="text-sm font-bold text-rose">HIGH</div>
                  </div>
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-rose shadow-[0_0_10px_#F45E6B]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10 flex-1">
                <PlanItem 
                  id="01" 
                  title="Aviation Fire Physics" 
                  sub="3 Sections · 45 mins" 
                  status="current" 
                />
                <PlanItem 
                  id="02" 
                  title="Nepal Constitution" 
                  sub="Fundamental Rights · 30 mins" 
                  status="pending" 
                />
                <PlanItem 
                  id="03" 
                  title="Big Data Concepts" 
                  sub="HDFS Replication · 15 mins" 
                  status="pending" 
                />
              </div>

              <div className="pt-8 relative z-10">
                <button className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  Start Focused Session <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Insight Sidebar */}
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-3xl space-y-4 shadow-sm">
            <div className="font-mono text-[9px] text-primary tracking-widest uppercase">AI INSIGHT</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You're on a <span className="text-foreground font-bold">morning shift</span> today. Your free window is <span className="text-primary font-bold">2:00–4:30 PM</span>. I've scheduled HDFS replication first — it's your highest weak spot.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display text-lg text-foreground">Next Deadline</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose/10 flex flex-col items-center justify-center text-rose border border-rose/20">
                <span className="text-xl font-display leading-none">3</span>
                <span className="text-[8px] font-mono font-bold">DAYS</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-bold truncate text-foreground">Big Data Viva</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Mon May 5 · High Priority</div>
              </div>
            </div>
          </div>

          <button className="w-full p-4 border border-border bg-muted/20 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-muted/40 transition-all uppercase tracking-widest text-foreground">
            <Plus className="w-4 h-4" /> Quick Capture
          </button>
        </div>
      </div>
    </main>
  )
}

/**
 * StatCard Sub-component from Design System.
 */
function StatCard({ label, value, sub, accent, color, icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-card border border-border p-6 rounded-[20px] space-y-2 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
        {icon && <div className="text-muted-foreground opacity-50">{icon}</div>}
      </div>
      <div className={cn("text-3xl font-display", accent ? "text-primary" : color || "text-foreground")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">{sub}</div>
    </motion.div>
  )
}

/**
 * PlanItem Sub-component.
 */
function PlanItem({ id, title, sub, status }: any) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border flex items-center justify-between group cursor-pointer transition-all",
      status === 'current' 
        ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(244,161,24,0.05)]" 
        : "bg-muted/20 border-border hover:border-primary/20"
    )}>
      <div className="flex items-center gap-5">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center font-display text-lg",
          status === 'current' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {id}
        </div>
        <div>
          <div className={cn("font-bold", status === 'current' ? "text-foreground" : "text-muted-foreground")}>{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        </div>
      </div>
      {status === 'current' && (
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#F4A118]" />
      )}
    </div>
  )
}
