/**
 * @file exams/[id]/page.tsx
 * @description Exam Command Center / Knowledge Base Dashboard.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  ChevronRight,
  Type,
  X,
  Plus,
  Trash2,
  PlusCircle,
  Trophy,
  History,
  Target,
  MoreVertical,
  LayoutGrid,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createChapterAction, deleteChapterAction, extractChaptersFromTextAction } from '@/app/actions/exam.actions'
import { toast } from 'sonner'

export default function ExamDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  
  const [creating, setCreating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  
  const [newChNumber, setNewChNumber] = useState('')
  const [newChTitle, setNewChTitle] = useState('')
  const [newSubtopics, setNewSubtopics] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('list')

  // Scroll Lock when modal is open
  useEffect(() => {
    if (showAddModal || showPasteModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [showAddModal, showPasteModal])

  useEffect(() => {
    fetchExamData()
  }, [id])

  const fetchExamData = async () => {
    const { data: examData } = await supabase.from('exams').select('*').eq('id', id).single()
    if (!examData) { router.push('/exams'); return }
    const { data: sectionData } = await supabase.from('exam_sections').select('*').eq('exam_id', id).order('order_index', { ascending: true })
    setExam(examData)
    setSections(sectionData || [])
    setLoading(false)
  }

  const handleAddChapter = async () => {
    if (!newChTitle.trim()) return
    setCreating(true)
    try {
      const result = await createChapterAction(id as string, {
        number: newChNumber,
        title: { en: newChTitle, np: "" },
        subtopics: newSubtopics.split('\n').filter(t => t.trim() !== '')
      })
      if (!result.success) throw new Error(result.error)
      toast.success('Chapter added')
      setShowAddModal(false)
      setNewChNumber(''); setNewChTitle(''); setNewSubtopics('')
      fetchExamData()
    } catch (err: any) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async (sectionId: string) => {
    if (!confirm('Delete this chapter and all its notes?')) return
    try {
      const result = await deleteChapterAction(sectionId)
      if (!result.success) throw new Error(result.error)
      toast.success('Deleted')
      fetchExamData()
    } catch (err: any) { toast.error(err.message) }
  }

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return
    setCreating(true)
    try {
      const result = await extractChaptersFromTextAction(id as string, pasteText)
      if (!result.success) throw new Error(result.error)
      toast.success('Knowledge base generated')
      setShowPasteModal(false)
      setPasteText('')
      fetchExamData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="p-10 space-y-10 bg-navy h-screen"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-3xl" /></div>

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-10 pb-32 selection:bg-saffron/20">
      
      {/* ── Dashboard Header ── */}
      <header className="space-y-6">
        <Link href="/exams" className="group flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-saffron transition-colors uppercase tracking-widest">
          <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> Back to Library
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-bold text-white tracking-tight leading-none">{exam.name}</h1>
            <p className="text-muted-foreground text-sm max-w-xl">Curating your knowledge base for professional mastery.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPasteModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
              <Sparkles className="w-3.5 h-3.5 text-saffron" /> AI Auto-Fill
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-saffron text-navy rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-saffron/10">
              <Plus className="w-4 h-4" /> Add Chapter
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* ── Main Content: Table of Contents ── */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-6">
              <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Table of Contents</h2>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 scale-90">
                <button 
                  onClick={() => setView('grid')}
                  className={cn("p-1.5 rounded-lg transition-all", view === 'grid' ? "bg-saffron text-navy shadow-lg" : "text-muted-foreground hover:text-white")}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={cn("p-1.5 rounded-lg transition-all", view === 'list' ? "bg-saffron text-navy shadow-lg" : "text-muted-foreground hover:text-white")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{sections.length} Units</span>
          </div>

          {sections.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-navy-lighter/10 space-y-6">
              <BookOpen className="w-12 h-12 text-white/10 mx-auto" />
              <div className="space-y-1">
                <p className="text-white/60 font-medium">Empty Knowledge Base</p>
                <p className="text-xs text-muted-foreground">Manual entry ensures the highest study quality.</p>
              </div>
              <button onClick={() => setShowAddModal(true)} className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">Create Chapter 1</button>
            </div>
          ) : (
            view === 'list' ? (
              <div className="space-y-0.5">
                {sections.map((s: any, i: number) => (
                  <div key={s.id} className="group flex items-center gap-2">
                    <Link 
                      href={`/exams/${id}/notes/${s.id}`}
                      className="flex-1 flex items-center justify-between p-4 px-6 rounded-2xl hover:bg-white/[0.03] transition-all group-hover:translate-x-1"
                    >
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-mono text-white/20 w-8">{s.section_number || i+1}</span>
                        <span className="text-base font-medium text-white/70 group-hover:text-saffron transition-colors">{s.title.en}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-mono text-white/10 group-hover:text-white/20 transition-colors uppercase tracking-widest">
                          {s.subsections?.length || 0} Topics
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/5 group-hover:text-saffron transition-all" />
                      </div>
                    </Link>
                    <button 
                      onClick={() => handleDelete(s.id)}
                      className="p-3 text-white/5 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setShowAddModal(true)} className="w-full flex items-center justify-center gap-3 p-6 mt-4 border-2 border-dashed border-white/5 rounded-[2rem] text-[10px] font-bold text-muted-foreground hover:text-saffron hover:border-saffron/20 transition-all uppercase tracking-widest bg-transparent hover:bg-saffron/[0.02]">
                  <PlusCircle className="w-4 h-4" /> Append New Chapter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((s: any, i: number) => (
                  <motion.div 
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-navy-lighter/20 border border-white/5 rounded-3xl p-6 hover:bg-navy-lighter/40 hover:border-white/10 transition-all cursor-pointer"
                  >
                    <Link href={`/exams/${id}/notes/${s.id}`}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-saffron bg-saffron/10 px-2 py-0.5 rounded uppercase tracking-widest">Unit {s.section_number || i+1}</span>
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(s.id); }}
                            className="p-2 text-white/5 hover:text-red-500 hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-saffron transition-colors leading-tight min-h-[3rem] line-clamp-2">{s.title.en}</h3>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{s.subsections?.length || 0} Key Topics</span>
                          <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-saffron transition-all group-hover:translate-x-1" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                <button onClick={() => setShowAddModal(true)} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-3xl text-[10px] font-bold text-muted-foreground hover:text-saffron hover:border-saffron/20 transition-all uppercase tracking-widest bg-transparent hover:bg-saffron/[0.02] gap-3">
                  <PlusCircle className="w-6 h-6" />
                  <span>New Unit</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* ── Sidebar: Exam Intelligence ── */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Mastery Score Card */}
          <div className="p-8 rounded-[2.5rem] bg-navy-lighter/30 border border-white/5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Mastery Level</h3>
              <Target className="w-4 h-4 text-saffron" />
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold text-white tracking-tighter">0</span>
                <span className="text-xl text-white/40 font-bold">%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-0 h-full bg-saffron shadow-[0_0_15px_rgba(244,184,43,0.5)]" /></div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">Complete chapters to unlock frequency analysis and mock exams.</p>
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-4">Subject Tools</h3>
            <div className="grid grid-cols-1 gap-2">
              <button className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group opacity-50 cursor-not-allowed">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center"><History className="w-5 h-5 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm font-bold text-white/80">Past Papers</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Analysis Coming Soon</div>
                </div>
              </button>
              <button className="flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group opacity-50 cursor-not-allowed">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center"><Trophy className="w-5 h-5 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm font-bold text-white/80">Mock Exams</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Locked</div>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-navy/90 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-navy-light w-full max-w-lg p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white">Manual Entry</h3>
                <p className="text-sm text-muted-foreground">Define a new chapter in your knowledge base.</p>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Number</label>
                    <input value={newChNumber} onChange={e => setNewChNumber(e.target.value)} placeholder="1.0" className="w-full p-4 bg-navy-lighter/30 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-saffron/20 transition-all" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Chapter Title</label>
                    <input value={newChTitle} onChange={e => setNewChTitle(e.target.value)} placeholder="e.g. Operating Systems Architecture" className="w-full p-4 bg-navy-lighter/30 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-saffron/20 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Subtopics (One per line)</label>
                  <textarea value={newSubtopics} onChange={e => setNewSubtopics(e.target.value)} placeholder="Process Management&#10;Memory Hierarchy" className="w-full h-32 p-4 bg-navy-lighter/30 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-saffron/20 resize-none transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                <button onClick={handleAddChapter} disabled={creating || !newChTitle.trim()} className="flex items-center gap-3 px-8 py-3 bg-saffron text-navy rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Chapter'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-navy/90 backdrop-blur-md" onClick={() => setShowPasteModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-navy-light w-full max-w-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold flex items-center gap-3"><Sparkles className="w-6 h-6 text-saffron" /> AI Auto-Fill</h3>
                <p className="text-sm text-muted-foreground">Paste syllabus text and let AI build your chapter structure.</p>
              </div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste syllabus text here..." className="w-full h-80 p-6 bg-navy-lighter/30 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-saffron/20 resize-none transition-all" />
              <div className="flex justify-end gap-4">
                <button onClick={() => setShowPasteModal(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                <button onClick={handlePasteSubmit} disabled={creating || !pasteText.trim()} className="flex items-center gap-3 px-10 py-4 bg-saffron text-navy rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-saffron/10">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {creating ? 'Analyzing...' : 'Generate Knowledge Base'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}

