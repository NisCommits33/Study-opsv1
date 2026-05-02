/**
 * @file deadlines/page.tsx
 * @description Deadlines page following the StudyOps Design System.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle2, Trash2, AlertCircle, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type Deadline = {
  id: string
  title: string
  deadline_date: string | null
  is_tbd: boolean
  status: 'not_started' | 'completed'
}

export default function Deadlines() {
  const [loading, setLoading] = useState(true)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('list')
  
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [isTBD, setIsTBD] = useState(false)

  useEffect(() => {
    fetchDeadlines()
  }, [])

  const fetchDeadlines = async () => {
    const { data } = await supabase
      .from('deadlines')
      .select('*')
      .order('deadline_date', { ascending: true, nullsFirst: false })
    
    if (data) setDeadlines(data as Deadline[])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newTitle) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('deadlines').insert({
      user_id: user.id,
      title: newTitle,
      deadline_date: isTBD ? null : newDate,
      is_tbd: isTBD,
      status: 'not_started'
    })

    if (!error) {
      setNewTitle('')
      setNewDate('')
      setIsTBD(false)
      setShowAdd(false)
      fetchDeadlines()
    }
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'not_started' ? 'completed' : 'not_started'
    await supabase.from('deadlines').update({ status: next }).eq('id', id)
    fetchDeadlines()
  }

  const deleteDeadline = async (id: string) => {
    await supabase.from('deadlines').delete().eq('id', id)
    fetchDeadlines()
  }

  const getDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="p-10 space-y-10">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <main className="p-10 max-w-5xl mx-auto space-y-10 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display text-white">Deadlines</h1>
          <p className="text-muted-foreground mt-1">Don't let them sneak up on you.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
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
          <button 
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-6 py-3 bg-saffron text-navy rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Add New
          </button>
        </div>
      </header>

      {/* Add Modal Placeholder */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-navy-lighter w-full max-w-md p-10 rounded-[2rem] space-y-8 border border-white/10"
            >
              <h2 className="text-2xl font-display">New Goal</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Exam or Task Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. TIA Firefighter Exam"
                    className="w-full bg-navy-light border border-white/5 p-4 rounded-xl outline-none focus:ring-2 focus:ring-saffron text-sm"
                  />
                </div>
                {!isTBD && (
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Target Date</label>
                    <input 
                      type="date" 
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-navy-light border border-white/5 p-4 rounded-xl outline-none focus:ring-2 focus:ring-saffron text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsTBD(!isTBD)}
                    className={cn(
                      "w-6 h-6 rounded-md border transition-all flex items-center justify-center",
                      isTBD ? "bg-saffron border-saffron" : "border-white/20 bg-transparent"
                    )}
                  >
                    {isTBD && <CheckCircle2 className="w-4 h-4 text-navy" />}
                  </button>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Date To Be Decided (TBD)</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 font-bold text-xs uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleAdd} className="flex-1 py-4 bg-saffron text-navy font-bold rounded-xl shadow-lg uppercase tracking-widest text-xs">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display of Deadlines */}
      <section>
        {deadlines.length === 0 ? (
          <div className="py-20 text-center opacity-30 space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
            <p className="text-lg font-display">No active deadlines. Stay chill or add one!</p>
          </div>
        ) : (
          view === 'list' ? (
            <div className="space-y-4">
              {deadlines.map((dl) => {
                const days = getDaysRemaining(dl.deadline_date)
                const isOverdue = days !== null && days < 0
                const isImminent = days !== null && days >= 0 && days <= 7

                return (
                  <motion.div 
                    layout
                    key={dl.id}
                    className={cn(
                      "bg-navy-light border border-white/5 rounded-2xl p-5 flex items-center gap-6 group relative overflow-hidden transition-all hover:border-white/10",
                      dl.status === 'completed' && "opacity-50"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <div className={cn(
                        "text-3xl font-display leading-none",
                        dl.status === 'completed' ? "text-green" : isImminent ? "text-rose" : "text-saffron"
                      )}>
                        {dl.is_tbd ? 'TBD' : isOverdue ? '!!' : days}
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground tracking-widest mt-1">DAYS</div>
                    </div>

                    <div className="h-10 w-[1px] bg-white/10" />

                    <div className="flex-1">
                      <h3 className={cn(
                        "font-bold text-lg",
                        dl.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {dl.title}
                      </h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-tighter mt-1">
                        {dl.is_tbd ? 'Monitoring Date' : dl.deadline_date} · {dl.status === 'completed' ? 'Finished' : isImminent ? 'High Risk' : 'In Preparation'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isImminent && dl.status === 'not_started' && (
                        <span className="badge badge-rose text-[8px]">HIGH RISK</span>
                      )}
                      <button 
                        onClick={() => toggleStatus(dl.id, dl.status)}
                        className="p-3 hover:bg-white/5 rounded-xl transition-all"
                      >
                        <CheckCircle2 className={cn("w-5 h-5", dl.status === 'completed' ? "text-green" : "text-muted-foreground")} />
                      </button>
                      <button 
                        onClick={() => deleteDeadline(dl.id)}
                        className="p-3 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-rose"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deadlines.map((dl) => {
                const days = getDaysRemaining(dl.deadline_date)
                const isOverdue = days !== null && days < 0
                const isImminent = days !== null && days >= 0 && days <= 7

                return (
                  <motion.div 
                    layout
                    key={dl.id}
                    className={cn(
                      "bg-navy-light border border-white/5 rounded-3xl p-8 space-y-6 flex flex-col justify-between group relative overflow-hidden transition-all hover:border-white/10",
                      dl.status === 'completed' && "opacity-50"
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-display text-xl",
                          dl.status === 'completed' ? "bg-green/10 text-green" : isImminent ? "bg-rose/10 text-rose" : "bg-saffron/10 text-saffron"
                        )}>
                          {dl.is_tbd ? '?' : isOverdue ? '!' : days}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleStatus(dl.id, dl.status)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-all"
                          >
                            <CheckCircle2 className={cn("w-4 h-4", dl.status === 'completed' ? "text-green" : "text-muted-foreground")} />
                          </button>
                          <button 
                            onClick={() => deleteDeadline(dl.id)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-all text-muted-foreground hover:text-rose"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-bold text-xl leading-tight min-h-[3.5rem] line-clamp-2",
                          dl.status === 'completed' && "line-through text-muted-foreground"
                        )}>
                          {dl.title}
                        </h3>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
                          {dl.is_tbd ? 'TBD' : dl.deadline_date}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-[0.2em]",
                        dl.status === 'completed' ? "text-green" : isImminent ? "text-rose" : "text-saffron"
                      )}>
                        {dl.status === 'completed' ? 'Success' : isImminent ? 'High Alert' : 'Active'}
                      </span>
                      {isImminent && dl.status === 'not_started' && <div className="w-2 h-2 rounded-full bg-rose animate-pulse" />}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        )}
      </section>
    </main>
  )
}
