/**
 * @file dashboard/page.tsx
 * @description Refined Dashboard following the StudyOps Design System.
 * Features shift awareness, stat cards, and activity overview with a premium aesthetic.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect, useRef } from 'react'
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
  Plus,
  Play,
  Pause,
  Trash2
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

  // Focus Music state
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Live stats (no more hardcoded values)
  const [streak, setStreak] = useState(0)
  const [weakSpotCount, setWeakSpotCount] = useState(0)
  const [closestExam, setClosestExam] = useState<{ days: number; title: string } | null>(null)
  const [sessionDays, setSessionDays] = useState<Set<string>>(new Set())

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

      // ── Live Stats ──
      // Weak spots count
      const { count: wsCount } = await supabase.from('weak_spots').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      setWeakSpotCount(wsCount || 0)

      // Study streak from sessions
      const { data: sessions } = await supabase.from('study_sessions').select('started_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(90)
      if (sessions) {
        const daySet = new Set(sessions.map(s => new Date(s.started_at).toDateString()))
        setSessionDays(daySet)
        // Calculate consecutive days from today
        let s = 0
        const d = new Date()
        while (daySet.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1) }
        setStreak(s)
      }

      // Closest exam deadline
      const upcoming = (deadRes.data || []).filter((dl: any) => dl.deadline_date && new Date(dl.deadline_date) > new Date()).sort((a: any, b: any) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
      if (upcoming.length > 0) {
        const daysLeft = Math.ceil((new Date(upcoming[0].deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        setClosestExam({ days: daysLeft, title: upcoming[0].title })
      }

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
          value={streak || 0}
          sub={streak > 0 ? `days consecutive` : 'Start studying to build a streak'}
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
          value={weakSpotCount}
          sub={weakSpotCount > 0 ? 'unresolved issues' : 'No weak spots tracked'}
          color="text-rose"
        />
        <StatCard
          label="Days to exam"
          value={closestExam?.days ?? '--'}
          sub={closestExam ? closestExam.title : 'No upcoming exams'}
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
                  Do This Now
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">STUDY RISK</div>
                    <div className={cn(
                      "text-sm font-bold",
                      overallRisk > 70 ? "text-rose" : overallRisk > 40 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {overallRisk > 70 ? "HIGH" : overallRisk > 40 ? "MEDIUM" : "LOW"}
                    </div>
                  </div>
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-1000", overallRisk > 70 ? "bg-rose shadow-[0_0_10px_#F45E6B]" : overallRisk > 40 ? "bg-amber-500 shadow-[0_0_10px_#F59E0B]" : "bg-emerald-500")}
                      style={{ width: `${overallRisk}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10 flex-1">
                {recommendations.length > 0 ? recommendations.map((rec, i) => (
                  <PlanItem
                    key={rec.id}
                    id={rec.section?.section_number || i + 1}
                    title={rec.section?.title?.en || "Unknown Chapter"}
                    sub={`${rec.frequency_count} appearances in past papers · Risk: ${Math.round(rec.risk)}`}
                    status={i === 0 ? 'current' : 'pending'}
                  />
                )) : (
                  <p className="text-sm text-muted-foreground italic">No recommendations yet. Upload past papers to generate risk scores.</p>
                )}
              </div>

              <div className="pt-8 relative z-10">
                <button
                  onClick={() => router.push('/timer')}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Start Focused Session <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Insight Sidebar */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-3xl space-y-4 shadow-sm">
            <div className="font-mono text-[9px] text-primary tracking-widest uppercase">AI INSIGHT</div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {currentShift === 'off' ? "You're off duty today!" : `You're on ${currentShift} shift today.`} {recommendations[0] ? `I recommend starting with ${recommendations[0].section?.title?.en} — it's the highest frequency chapter you haven't mastered yet.` : "Ready to plan your next session?"}
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display text-lg text-foreground">Next Deadline</h3>
            {deadlines[0] ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose/10 flex flex-col items-center justify-center text-rose border border-rose/20">
                  <span className="text-xl font-display leading-none">
                    {Math.ceil((new Date(deadlines[0].deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                  <span className="text-[8px] font-mono font-bold uppercase">Days</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-bold truncate text-foreground">{deadlines[0].title}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                    {new Date(deadlines[0].deadline_date).toLocaleDateString()} · {deadlines[0].priority || 'Medium'} Priority
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No upcoming deadlines.</p>
            )}
          </div>

          <button className="w-full p-4 border border-border bg-muted/20 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-muted/40 transition-all uppercase tracking-widest text-foreground">
            <Plus className="w-4 h-4" /> Quick Capture
          </button>

          {/* Focus Music (Step 32) */}
          <div className="mt-8 p-6 bg-muted/20 border border-border rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" /> Focus Ambient
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-primary/40 animate-[bounce_1s_infinite]" />
                <div className="w-1 h-2 bg-primary/40 animate-[bounce_1.2s_infinite]" />
                <div className="w-1 h-4 bg-primary/40 animate-[bounce_0.8s_infinite]" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <div className="flex-1">
                <div className="text-xs font-bold text-foreground">Lo-fi Study Session</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-tighter">Binaural Beats · 60 BPM</div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src="https://cdn.pixabay.com/audio/2022/05/27/audio_1808f30304.mp3"
              loop
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        </motion.div>
      </div>

      {/* Revision Heatmap (Step 31) */}
      <section className={cn("bg-card border border-border p-10 rounded-[2.5rem] shadow-sm space-y-8", mood === 'low' && "opacity-60 scale-[0.98] transition-all")}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Chapter Revision Heatmap</h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Mastery density over the last 90 days</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-muted rounded-sm" />
              <div className="w-3 h-3 bg-primary/20 rounded-sm" />
              <div className="w-3 h-3 bg-primary/50 rounded-sm" />
              <div className="w-3 h-3 bg-primary rounded-sm shadow-[0_0_5px_rgba(244,161,24,0.5)]" />
            </div>
            <span>More</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 90 }).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (89 - i))
            const dateStr = d.toDateString()
            const hasSession = sessionDays.has(dateStr)
            return (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-help",
                  hasSession ? "bg-primary shadow-[0_0_4px_rgba(244,161,24,0.4)]" : "bg-muted"
                )}
                title={`${d.toLocaleDateString()}: ${hasSession ? 'Studied' : 'Rest'}`}
              />
            )
          })}
        </div>
      </section>
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
