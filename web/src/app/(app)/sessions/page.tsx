/**
 * @file sessions/page.tsx
 * @description Sessions activity page following the StudyOps Design System.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion } from 'framer-motion'
import { TrendingUp, History, BookOpen, CheckCircle2, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sessions() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({})
  const [view, setView] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('study_sessions')
      .select('*, subjects(name)')
      .order('created_at', { ascending: false })
    
    if (data) {
      setSessions(data)
      const counts: Record<string, number> = {}
      data.forEach(s => {
        const date = s.created_at.split('T')[0]
        counts[date] = (counts[date] || 0) + 1
      })
      setHeatmapData(counts)
    }
    setLoading(false)
  }

  const getHeatmapDates = () => {
    const dates = []
    for (let i = 83; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  if (loading) {
    return (
      <div className="p-10 space-y-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-[2.5rem]" />
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-24">
      <header>
        <h1 className="text-4xl font-display text-white">Activity</h1>
        <p className="text-muted-foreground mt-1">Consistency is your superpower.</p>
      </header>

      {/* Heatmap Section from Design System */}
      <section className="glass p-12 rounded-[3rem] space-y-12 relative overflow-hidden group perspective-1000">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-saffron/10 rounded-full blur-[100px] group-hover:bg-saffron/15 transition-all duration-1000" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl font-display flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-saffron" />
              Activity Cube
            </h2>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mt-1">Isometric Session Visualization</p>
          </div>
          <div className="flex items-center gap-3 bg-navy-lighter/50 px-5 py-2.5 rounded-full border border-white/5 shadow-xl">
            <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-widest mr-1">Idle</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={cn(
                  "w-3 h-3 rounded-[2px]",
                  i === 0 && "bg-navy-lighter",
                  i === 1 && "bg-saffron/20",
                  i === 2 && "bg-saffron/45",
                  i === 3 && "bg-saffron/70",
                  i === 4 && "bg-saffron"
                )} />
              ))}
            </div>
            <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-widest ml-1">Peak</span>
          </div>
        </div>
        
        {/* 3D Isometric Wrapper */}
        <div className="relative py-10 flex justify-center items-center overflow-visible">
          <div 
            className="grid grid-flow-col grid-rows-7 gap-2 transition-all duration-700"
            style={{ 
              transform: 'perspective(1200px) rotateX(45deg) rotateZ(-35deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {getHeatmapDates().map((date) => {
              const count = heatmapData[date] || 0
              return (
                <motion.div
                  key={date}
                  initial={{ translateZ: 0 }}
                  whileHover={{ 
                    translateZ: 20,
                    boxShadow: '0 10px 30px rgba(244,161,24,0.3)'
                  }}
                  title={`${date}: ${count} sessions`}
                  className={cn(
                    "w-4 h-4 rounded-[3px] transition-all duration-500 relative",
                    count === 0 && "bg-navy-lighter/30",
                    count === 1 && "bg-saffron/20 border border-saffron/10",
                    count === 2 && "bg-saffron/45 border border-saffron/20",
                    count === 3 && "bg-saffron/70 border border-saffron/30",
                    count >= 4 && "bg-saffron shadow-[0_0_15px_rgba(244,161,24,0.4)]"
                  )}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    height: count > 0 ? `${16 + (count * 4)}px` : '16px',
                    marginTop: count > 0 ? `-${count * 4}px` : '0'
                  }}
                >
                  {/* 3D Height Effect */}
                  {count > 0 && (
                    <div 
                      className="absolute inset-0 bg-white/10 rounded-[3px]"
                      style={{ transform: 'translateZ(2px)' }}
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="TOTAL SESSIONS" value={sessions.length} icon={<History />} />
        <StatCard 
          label="FOCUS HOURS" 
          value={Math.floor(sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60)} 
          sub="Hours"
        />
        <StatCard label="ACTIVE DAYS" value={Object.keys(heatmapData).length} color="text-saffron" />
      </section>

      {/* History List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display">Session History</h2>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 scale-90">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-saffron text-navy shadow-lg" : "text-muted-foreground hover:text-white")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-saffron text-navy shadow-lg" : "text-muted-foreground hover:text-white")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {view === 'list' ? (
            <div className="space-y-4">
              {sessions.map((s) => (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="bg-navy-light border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-navy-lighter flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-muted-foreground group-hover:text-saffron transition-colors" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{s.subjects?.name || 'Subject'}</div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        {new Date(s.created_at).toLocaleDateString()} · {s.duration_minutes} MINS
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-display text-saffron">{s.efficiency_score}%</div>
                      <div className="font-mono text-[8px] text-muted-foreground tracking-widest">EFFICIENCY</div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green opacity-40" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((s) => (
                <motion.div 
                  key={s.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="bg-navy-light border border-white/5 p-8 rounded-[2.5rem] space-y-6 group hover:border-white/10 transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-saffron/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-saffron" />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white/40 font-mono tracking-widest uppercase">Score</div>
                      <div className="text-2xl font-display text-saffron">{s.efficiency_score}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-xl group-hover:text-white transition-colors">{s.subjects?.name || 'Subject'}</h3>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-2">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-saffron" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{s.duration_minutes} Mins</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green opacity-40" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({ label, value, sub, color, icon }: any) {
  return (
    <div className="bg-navy-light border border-white/5 p-8 rounded-[2rem] space-y-2">
      <div className="flex items-center justify-between opacity-50">
        <span className="font-mono text-[10px] tracking-widest">{label}</span>
        {icon}
      </div>
      <div className={cn("text-5xl font-display", color || "text-white")}>
        {value}
        {sub && <span className="text-sm font-mono text-muted-foreground ml-2">{sub}</span>}
      </div>
    </div>
  )
}
