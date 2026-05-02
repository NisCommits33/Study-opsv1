/**
 * @file exams/page.tsx
 * @description Knowledge Base Index.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, ChevronRight, FileText, Sparkles, Trash2, Search, X, Edit3, LayoutGrid, List, Copy, Loader2, ShieldAlert, Landmark, Plane, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { deleteExamAction, cloneExamAction } from '@/app/actions/exam.actions'
import { EmptyState } from '@/components/ui/EmptyState'

type Exam = {
  id: string
  name: string
  description: string | null
  total_sections: number | null
  created_at: string
}

export default function ExamsPage() {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Exam | null>(null)
  const [newName, setNewName] = useState('')
  const [editName, setEditName] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [cloningId, setCloningId] = useState<string | null>(null)

  // Scroll Lock when modal is open
  useEffect(() => {
    if (showAdd || showEdit) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [showAdd, showEdit])

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
    if (data) setExams(data as Exam[])
    setLoading(false)
  }

  const handleClone = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCloningId(id)
    try {
        const res = await cloneExamAction(id, `${name} (Copy)`)
        if (res.success) {
            toast.success("Exam cloned successfully")
            fetchExams()
        } else {
            throw new Error(res.error)
        }
    } catch (err: any) {
        toast.error("Clone failed: " + err.message)
    } finally {
        setCloningId(null)
    }
  }

  const handleAdd = async () => {
    if (!newName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('exams').insert({ user_id: user.id, name: newName })
    if (!error) {
      toast.success('Knowledge base initialized')
      setNewName(''); setShowAdd(false); fetchExams()
    } else {
      toast.error('Failed to create')
    }
  }

  const handleRename = async () => {
    if (!showEdit || !editName.trim()) return
    const { error } = await supabase.from('exams').update({ name: editName }).eq('id', showEdit.id)
    if (!error) {
      toast.success('Updated')
      setShowEdit(null); fetchExams()
    } else {
      toast.error('Update failed')
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this exam and all associated study data?')) return
    try {
      const result = await deleteExamAction(id)
      if (!result.success) throw new Error(result.error)
      toast.success('Deleted successfully')
      fetchExams()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredExams = exams.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="p-10 space-y-10 bg-background h-screen"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><Skeleton className="h-48 rounded-3xl" /><Skeleton className="h-48 rounded-3xl" /></div></div>

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-32 selection:bg-primary/20 text-foreground bg-background">
      
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground tracking-tight leading-none">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm">Your centralized library for academic mastery.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search library..."
              className="w-full bg-muted/20 border border-border pl-11 pr-4 py-3 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-foreground"
            />
          </div>
          <div className="flex bg-muted/20 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setView('grid')}
              className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10">
            <Plus className="w-4 h-4" /> New Exam
          </button>
        </div>
      </header>

      {/* ── Grid/List Display ── */}
      <section>
        {filteredExams.length === 0 && search && (
          <div className="py-20 text-center text-muted-foreground text-sm">No exams matching "{search}" found.</div>
        )}

        {exams.length === 0 ? (
          <EmptyState 
            icon={BookOpen}
            title="Your Library is Empty"
            description="Add an exam to begin structuring your study materials and building your bilingual knowledge base."
            action={{
              label: "Create First Knowledge Base",
              onClick: () => setShowAdd(true),
              icon: Plus
            }}
          />
        ) : (
          view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <Link href={`/exams/${exam.id}`} key={exam.id}>
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="group relative bg-card border border-border rounded-[2.5rem] p-8 space-y-6 hover:bg-muted/5 hover:border-primary/20 transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => handleClone(exam.id, exam.name, e)}
                            disabled={cloningId === exam.id}
                            className="p-2 text-muted-foreground/30 hover:text-teal rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Clone Exam"
                        >
                            {cloningId === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEdit(exam); setEditName(exam.name); }}
                          className="p-2 text-muted-foreground/30 hover:text-primary rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(exam.id, e)}
                          className="p-2 text-muted-foreground/30 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-foreground/90 group-hover:text-foreground transition-colors leading-tight">{exam.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        <span>{exam.total_sections || 0} Units</span>
                        <span className="w-1 h-1 rounded-full bg-muted" />
                        <span>Updated {new Date(exam.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-border">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">Launch Dashboard</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((exam) => (
                <Link href={`/exams/${exam.id}`} key={exam.id}>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group flex items-center gap-4 p-5 bg-card border border-border rounded-3xl hover:bg-muted/5 hover:border-primary/20 transition-all shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground/90 truncate">{exam.name}</h3>
                      <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                        <span>{exam.total_sections || 0} Units</span>
                        <span className="w-1 h-1 rounded-full bg-muted" />
                        <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                      <button 
                        onClick={(e) => handleClone(exam.id, exam.name, e)}
                        disabled={cloningId === exam.id}
                        className="p-2.5 text-muted-foreground/30 hover:text-teal hover:bg-muted rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Clone Exam"
                      >
                         {cloningId === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEdit(exam); setEditName(exam.name); }}
                        className="p-2.5 text-muted-foreground/30 hover:text-primary hover:bg-muted rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(exam.id, e)}
                        className="p-2.5 text-muted-foreground/30 hover:text-red-500 hover:bg-muted rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1 ml-2" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Explore Templates (Step 33) ── */}
      <section className="space-y-8 pt-12 border-t border-border">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold text-foreground">Explore Templates</h2>
                <p className="text-sm text-muted-foreground">Clone community-vetted exam structures and start studying instantly.</p>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">View All Templates</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { name: "ARFF Promotion 2026", units: 14, color: "bg-rose", icon: ShieldAlert },
                { name: "Loksewa Civil Service", units: 28, color: "bg-teal", icon: Landmark },
                { name: "Aviation Safety (ICAO)", units: 12, color: "bg-sky", icon: Plane },
                { name: "General Knowledge (NP)", units: 18, color: "bg-amber", icon: GraduationCap }
            ].map((tmpl, i) => (
                <div key={i} className="group p-8 rounded-[2.5rem] bg-card border border-border hover:border-primary/20 transition-all shadow-sm space-y-6 relative overflow-hidden">
                    <div className={cn("absolute -top-10 -right-10 w-32 h-32 opacity-5 rounded-full", tmpl.color)} />
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", tmpl.color)}>
                        <tmpl.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground leading-snug">{tmpl.name}</h3>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{tmpl.units} Strategic Units</div>
                    </div>
                    <button className="w-full py-3 bg-muted hover:bg-primary hover:text-primary-foreground rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all">Clone Template</button>
                </div>
            ))}
        </div>
      </section>

      {/* ── Add Modal ── */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowAdd(false)} />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="relative bg-card w-full max-w-lg p-10 rounded-[3rem] space-y-8 border border-border shadow-2xl"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Initialize Knowledge Base</h2>
                <p className="text-sm text-muted-foreground">Give your subject a professional name to start building your library.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-1">Exam Name</label>
                <input 
                  autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="e.g. Distributed Systems 2026"
                  className="w-full bg-muted/20 border border-border p-5 rounded-2xl outline-none focus:ring-1 focus:ring-primary/30 text-lg font-bold text-foreground placeholder:text-muted-foreground/30 transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-muted rounded-2xl transition-colors text-muted-foreground">Cancel</button>
                <button 
                  onClick={handleAdd} disabled={!newName}
                  className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/10 uppercase tracking-widest text-[10px] disabled:opacity-30 transition-all"
                >
                  Create Library
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showEdit && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowEdit(null)} />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="relative bg-card w-full max-w-lg p-10 rounded-[3rem] space-y-8 border border-border shadow-2xl"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Rename Exam</h2>
                <p className="text-sm text-muted-foreground">Update the title of your knowledge base.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-1">New Name</label>
                <input 
                  autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRename()}
                  className="w-full bg-muted/20 border border-border p-5 rounded-2xl outline-none focus:ring-1 focus:ring-primary/30 text-lg font-bold text-foreground transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowEdit(null)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-muted rounded-2xl transition-colors text-muted-foreground">Cancel</button>
                <button 
                  onClick={handleRename} disabled={!editName.trim()}
                  className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/10 uppercase tracking-widest text-[10px] disabled:opacity-30 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}


