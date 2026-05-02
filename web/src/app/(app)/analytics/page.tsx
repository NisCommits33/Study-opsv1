/**
 * @file analytics/page.tsx
 * @description Weekly Session Analyser with high-fidelity charts and AI insights.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Brain, 
  Sparkles, 
  ChevronRight,
  BarChart,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAnalyticsAction } from '@/app/actions/study.actions'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const res = await getAnalyticsAction()
      if (res.success) {
        setStats(res.stats)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-10 space-y-10 bg-background h-screen">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-[2.5rem]" />
      </div>
    )
  }

  const maxMinutes = Math.max(...(stats?.dailyStats.map((d: any) => d.minutes) || [60]))

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-10 pb-24 text-foreground bg-background">
      {/* Header */}
      <section className="space-y-1">
        <div className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Performance · Last 7 Days</div>
        <h1 className="text-4xl font-display text-foreground">Session <span className="text-primary">Analyser</span></h1>
      </section>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          icon={<Clock className="w-5 h-5 text-primary" />}
          label="Total Focus Time"
          value={`${stats?.totalHours || 0}h`}
          sub="Last 7 days study volume"
        />
        <MetricCard 
          icon={<Target className="w-5 h-5 text-teal" />}
          label="Completed Sessions"
          value={stats?.sessionCount || 0}
          sub="Pomodoros & mock interviews"
        />
        <MetricCard 
          icon={<AlertCircle className="w-5 h-5 text-rose" />}
          label="Active Weak Spots"
          value={stats?.weakSpotCount || 0}
          sub="Critical areas identified"
        />
      </section>

      {/* Charts & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-10 space-y-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <BarChart className="w-40 h-40 text-primary" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-display text-foreground">Focus Intensity</h2>
            <p className="text-sm text-muted-foreground">Minutes studied per day</p>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 pt-10 relative z-10">
            {stats?.dailyStats.map((day: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                    className={cn(
                        "w-full max-w-[40px] bg-primary rounded-t-xl transition-all group-hover:brightness-110 relative shadow-lg shadow-primary/10",
                        day.minutes === 0 && "h-[2px] bg-muted"
                    )}
                  />
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-primary">
                    {day.minutes}m
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                    {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Subjects */}
        <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-sm">
          <h3 className="font-display text-lg text-foreground">Top Subjects</h3>
          <div className="space-y-4">
              <SubjectProgress label="Big Data" progress={85} color="bg-primary" />
              <SubjectProgress label="Constitution" progress={42} color="bg-teal" />
              <SubjectProgress label="Aviation" progress={12} color="bg-rose" />
          </div>
        </div>

      </div>
    </main>
  )
}

function MetricCard({ icon, label, value, sub }: any) {
  return (
    <div className="bg-card border border-border p-8 rounded-3xl space-y-4 shadow-sm group hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-muted rounded-2xl group-hover:bg-primary/5 transition-colors">{icon}</div>
        <TrendingUp className="w-4 h-4 text-emerald-500 opacity-50" />
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-display text-foreground">{value}</div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-4">{sub}</div>
    </div>
  )
}

function SubjectProgress({ label, progress, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-foreground">{label}</span>
                <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn("h-full", color)}
                />
            </div>
        </div>
    )
}
