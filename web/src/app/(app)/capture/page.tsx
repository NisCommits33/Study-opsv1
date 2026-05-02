/**
 * @file capture/page.tsx
 * @description Quick Capture Inbox — review, filter, promote, and dismiss captured thoughts.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Inbox, 
  Search, 
  Trash2, 
  ArrowRight, 
  FileText, 
  Calendar,
  CheckCircle2,
  Sparkles,
  Target,
  ListTodo,
  HelpCircle,
  Clock,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from 'sonner'
import { promoteCaptureAction } from '@/app/actions/capture.actions'

export default function CaptureInboxPage() {
  const [loading, setLoading] = useState(true)
  const [captures, setCaptures] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)

  // Promotion Modal State
  const [promoting, setPromoting] = useState<any>(null) // { capture, type }
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  useEffect(() => { 
    fetchCaptures()
    fetchExams()
  }, [])

  useEffect(() => {
    if (selectedExam) fetchSections(selectedExam)
  }, [selectedExam])

  const fetchCaptures = async () => {
    const { data } = await supabase
      .from('capture_inbox')
      .select('*')
      .order('created_at', { ascending: false })
    setCaptures(data || [])
    setLoading(false)
  }

  const fetchExams = async () => {
    const { data } = await supabase.from('exams').select('id, name')
    setExams(data || [])
  }

  const fetchSections = async (examId: string) => {
    const { data } = await supabase.from('exam_sections').select('id, title, section_number').eq('exam_id', examId).order('order_index')
    setSections(data || [])
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('capture_inbox').delete().eq('id', id)
    if (!error) {
      setCaptures(prev => prev.filter(c => c.id !== id))
      toast.success("Capture dismissed")
    }
  }

  const handlePromote = async () => {
    if (!promoting) return
    setIsActionLoading(true)
    
    const res = await promoteCaptureAction(promoting.capture.id, promoting.type, {
      exam_id: selectedExam,
      section_id: selectedSection,
      priority: 'medium',
      date: new Date().toISOString().split('T')[0]
    })

    if (res.success) {
      toast.success(`Successfully promoted to ${promoting.type}`)
      setCaptures(prev => prev.filter(c => c.id !== promoting.capture.id))
      setPromoting(null)
      setSelectedExam('')
      setSelectedSection('')
    } else {
      toast.error(res.error || "Promotion failed")
    }
    setIsActionLoading(false)
  }

  const filtered = captures.filter(c => {
    const matchSearch = !search || c.content?.toLowerCase().includes(search.toLowerCase())
    const matchTag = !filterTag || c.type === filterTag
    return matchSearch && matchTag
  })

  const tags = ['quick_note', 'voice_memo', 'weak_spot', 'todo', 'question']

  if (loading) return <div className="p-10 bg-background h-screen"><Skeleton className="h-10 w-64" /></div>

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-32 text-foreground bg-background">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Capture · Review Inbox</div>
          <h1 className="text-5xl font-display text-foreground">Quick <span className="text-primary">Captures</span></h1>
          <p className="text-sm text-muted-foreground">{captures.length} items awaiting review</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search captures..."
            className="w-full bg-muted/20 border border-border pl-11 pr-4 py-3 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground shadow-sm"
          />
        </div>
      </header>

      {/* Filter Tags */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterTag(null)}
          className={cn(
            "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
            !filterTag ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border text-muted-foreground hover:border-primary/30"
          )}
        >
          All ({captures.length})
        </button>
        {tags.map(tag => {
          const count = captures.filter(c => c.type === tag).length
          if (count === 0) return null
          return (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                filterTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              {tag.replace('_', ' ')} ({count})
            </button>
          )
        })}
      </div>

      {/* Captures List */}
      <section className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-32 text-center bg-muted/5 border-2 border-dashed border-border rounded-[3rem] space-y-4">
            <Inbox className="w-12 h-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground uppercase tracking-widest">Your capture inbox is clear.</p>
            <p className="text-xs text-muted-foreground">Use the floating + button to capture study thoughts anytime.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((capture) => (
              <motion.div
                key={capture.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="group flex items-start gap-6 p-8 bg-card border border-border rounded-[2.5rem] hover:border-primary/20 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 mt-1">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{capture.content}</p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(capture.created_at).toLocaleDateString()}
                    </span>
                    {capture.type && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-bold">
                        {capture.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setPromoting({ capture, type: 'note' })}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-primary/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
                    >
                      <Target className="w-3 h-3" /> Note
                    </button>
                    <button
                      onClick={() => setPromoting({ capture, type: 'todo' })}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-teal/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-teal transition-all"
                    >
                      <ListTodo className="w-3 h-3" /> To-do
                    </button>
                    <button
                      onClick={() => setPromoting({ capture, type: 'question' })}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-amber/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-amber transition-all"
                    >
                      <HelpCircle className="w-3 h-3" /> Question
                    </button>
                    <button
                      onClick={() => setPromoting({ capture, type: 'deadline' })}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-rose/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose transition-all"
                    >
                      <Clock className="w-3 h-3" /> Deadline
                    </button>
                    <button
                      onClick={() => handleDelete(capture.id)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </section>

      {/* Promotion Modal */}
      <AnimatePresence>
        {promoting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card border border-border p-10 rounded-[3rem] max-w-lg w-full shadow-2xl space-y-8 relative overflow-hidden"
            >
              <button onClick={() => setPromoting(null)} className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full text-muted-foreground"><X className="w-5 h-5" /></button>
              
              <div className="space-y-2">
                <div className="font-mono text-[9px] text-primary uppercase tracking-[0.2em]">Promote Capture</div>
                <h3 className="text-2xl font-display text-foreground capitalize">Promote to {promoting.type}</h3>
              </div>

              <div className="p-6 bg-muted/20 rounded-2xl border border-border text-sm text-muted-foreground italic leading-relaxed">
                "{promoting.capture.content.substring(0, 200)}{promoting.capture.content.length > 200 ? '...' : ''}"
              </div>

              <div className="space-y-6">
                {(promoting.type === 'note' || promoting.type === 'question') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Exam</label>
                      <select 
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="w-full bg-muted/50 border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
                      >
                        <option value="">Choose an exam...</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>

                    {selectedExam && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Chapter</label>
                        <select 
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="w-full bg-muted/50 border border-border px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground"
                        >
                          <option value="">Choose a chapter...</option>
                          {sections.map(s => <option key={s.id} value={s.id}>{s.section_number} {s.title?.en || s.title}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {promoting.type === 'deadline' && (
                  <p className="text-xs text-muted-foreground">This will create a new deadline for today. You can adjust the date in the Deadlines page.</p>
                )}
                
                {promoting.type === 'todo' && (
                  <p className="text-xs text-muted-foreground">This will add an objective to your current daily study plan.</p>
                )}

                <button
                  onClick={handlePromote}
                  disabled={isActionLoading || ((promoting.type === 'note' || promoting.type === 'question') && !selectedSection)}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isActionLoading ? "Processing..." : `Confirm Promotion to ${promoting.type}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
