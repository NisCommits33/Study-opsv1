/**
 * @file archive/page.tsx
 * @description Past Answer Archive. Growth tracking and comparison.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Archive, 
  Search, 
  ChevronRight, 
  Calendar, 
  Clock, 
  FileText,
  Target,
  Trophy,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ArchivePage() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    const { data } = await supabase
        .from('study_sessions')
        .select('*, exam:exam_id(name), section:section_id(title)')
        .order('started_at', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  const filtered = sessions.filter(s => 
    s.exam?.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-10 bg-background h-screen"><Skeleton className="h-10 w-64" /></div>

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-32 text-foreground bg-background">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Intelligence · Historical Records</div>
          <h1 className="text-5xl font-display text-foreground">Answer <span className="text-primary">Archive</span></h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by subject or energy..."
            className="w-full bg-muted/20 border border-border pl-11 pr-4 py-3 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
          />
        </div>
      </header>

      {/* Stats Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ArchiveStat label="Logged Sessions" value={sessions.length} icon={<History className="w-5 h-5" />} />
        <ArchiveStat label="Avg Accuracy" value="78%" icon={<Trophy className="w-5 h-5" />} />
        <ArchiveStat label="Peak Energy" value="⚡ High" icon={<Target className="w-5 h-5" />} />
        <ArchiveStat label="Total Volume" value="124h" icon={<Clock className="w-5 h-5" />} />
      </section>

      {/* Archive List */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] border-b border-border pb-4">Chronological Feed</h2>
        
        {filtered.length === 0 ? (
            <div className="py-32 text-center bg-muted/5 border-2 border-dashed border-border rounded-[3rem] space-y-4">
                <Archive className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground uppercase tracking-widest">No matching records found.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {filtered.map((session) => (
                    <motion.div 
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex items-center gap-6 p-6 bg-card border border-border rounded-[2.5rem] hover:border-primary/20 hover:bg-muted/5 transition-all shadow-sm"
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                            session.energy_level === 'high' ? "bg-primary/10 border-primary/20 text-primary" : 
                            session.energy_level === 'low' ? "bg-rose/10 border-rose/20 text-rose" : "bg-muted border-border text-muted-foreground"
                        )}>
                            <FileText className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">{session.exam?.name || "Independent Session"}</h3>
                            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.started_at).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.duration_minutes}m Duration</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className={cn(
                                    "font-bold",
                                    session.energy_after >= 4 ? "text-primary" : session.energy_after <= 2 ? "text-rose" : "text-muted-foreground"
                                )}>{session.energy_after >= 4 ? "HIGH" : session.energy_after <= 2 ? "LOW" : "MEDIUM"} ENERGY</span>
                            </div>
                        </div>

                        <div className="text-right pr-4">
                            <div className="text-xs font-bold text-foreground">{session.score || '--'} / 10</div>
                            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Score</div>
                        </div>

                        <button className="p-3 hover:bg-muted rounded-xl transition-all">
                            <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
                        </button>
                    </motion.div>
                ))}
            </div>
        )}
      </section>
    </main>
  )
}

function ArchiveStat({ label, value, icon }: any) {
    return (
        <div className="bg-card border border-border p-8 rounded-3xl space-y-4 shadow-sm group hover:border-primary/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">{icon}</div>
            <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</div>
            </div>
        </div>
    )
}
