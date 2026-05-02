/**
 * @file exams/[id]/notes/[sectionId]/page.tsx
 * @description Documentation Reader & Content Engine.
 * Converts study materials (PDF/DOCX/Text) into structured bilingual documentation.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  Languages,
  Save,
  Sparkles,
  FileText,
  Star,
  Loader2,
  FileUp,
  Edit3,
  Eye,
  Type,
  X
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ingestChapterContentAction } from '@/app/actions/exam.actions'
import { cn } from '@/lib/utils'
import { AIToolbar } from '@/components/AIToolbar'

// ─── Components ──────────────────────────────────────────────
function AIResultModal({ content, onClose }: { content: string, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4">
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-4 text-primary">
          <Sparkles className="w-6 h-6" />
          <h3 className="text-xl font-display text-foreground">AI Insight</h3>
        </div>
        <div className="bg-muted/10 p-6 rounded-2xl border border-border max-h-[60vh] overflow-y-auto prose dark:prose-invert prose-sm">
          <div className="text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(content)
              toast.success('Copied to clipboard!')
            }}
            className="px-6 py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-all text-foreground"
          >
            Copy Result
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all hover:scale-105"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Types ───────────────────────────────────────────────────
interface Section {
  id: string
  exam_id: string
  section_number: string
  title: { en: string; np?: string }
  subsections: Array<{ title: { en: string; np?: string } }>
  order_index: number
}

interface Note {
  id: string
  section_id: string
  content: { en: string; np: string }
  word_count: { en: number; np: number }
}

// ═══════════════════════════════════════════════════════════════
export default function NotesEditor() {
  const { id: examId, sectionId } = useParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [exam, setExam] = useState<any>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [currentSection, setCurrentSection] = useState<Section | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [progress, setProgress] = useState<any>(null)
  
  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [lang, setLang] = useState<'en' | 'np'>('en')
  const [editContent, setEditContent] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAll()
  }, [examId, sectionId])

  // Responsive Sidebar Initial State (safe for SSR)
  useEffect(() => {
    setMounted(true)
    if (window.innerWidth >= 1024) setSidebarOpen(true)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single()
    if (!examData) { router.push('/exams'); return }
    setExam(examData)

    const { data: sectionsData } = await supabase.from('exam_sections').select('*').eq('exam_id', examId).order('order_index', { ascending: true })
    setSections(sectionsData || [])
    const current = sectionsData?.find(s => s.id === sectionId) || null
    setCurrentSection(current)

    const { data: noteData } = await supabase.from('exam_notes').select('*').eq('section_id', sectionId).single()
    if (noteData) {
      setNote(noteData)
      setEditContent(noteData.content?.[lang] || '')
    } else {
      setNote(null)
      setEditContent('')
    }

    const { data: progressData } = await supabase.from('exam_progress').select('*').eq('section_id', sectionId).single()
    if (progressData) {
      setProgress(progressData)
      setConfidence(progressData.confidence || 0)
    }
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !sectionId) return

    setIngesting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${examId}/${sectionId}/content_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('study-materials').upload(filePath, file)
      if (uploadError) throw uploadError

      const result = await ingestChapterContentAction(sectionId as string, { type: 'file', path: filePath })
      if (!result.success) throw new Error(result.error)

      toast.success('Chapter content ingested and formatted!')
      fetchAll()
      setMode('read')
    } catch (err: any) {
      toast.error('Ingestion failed: ' + err.message)
    } finally {
      setIngesting(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      const updatedContent = { ...(note?.content || { en: '', np: '' }), [lang]: editContent }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (note) {
        await supabase.from('exam_notes').update({ content: updatedContent, last_edited_at: new Date().toISOString() }).eq('id', note.id)
      } else {
        await supabase.from('exam_notes').insert({ section_id: sectionId, user_id: user.id, content: updatedContent })
      }
      toast.success('Saved!')
      fetchAll()
      setHasUnsavedChanges(false)
    } catch (err) {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newStatus = progress?.status === 'done' ? 'in_progress' : 'done'
    await supabase.from('exam_progress').upsert({ section_id: sectionId, user_id: user.id, status: newStatus }, { onConflict: 'section_id,user_id' })
    fetchAll()
  }

  if (loading) return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      <div className="hidden lg:block w-72 border-r border-border p-6 space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-40 w-full" /></div>
      <div className="flex-1 p-6 lg:p-12 space-y-6"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-[60vh] w-full" /></div>
    </div>
  )

  const currentIndex = sections.findIndex(s => s.id === sectionId)
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background font-sans text-foreground relative">
      
      {/* ── Sidebar Overlay for Mobile ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card lg:static lg:bg-card flex flex-col shrink-0 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <Link href={`/exams/${examId}`} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
              <ArrowLeft className="w-3 h-3" /> Overview
            </Link>
            <h2 className="text-sm font-bold truncate max-w-[180px] text-foreground">{exam?.name}</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {sections.map((s, i) => (
            <Link key={s.id} href={`/exams/${examId}/notes/${s.id}`} onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)} className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all",
              s.id === sectionId ? "bg-primary/10 text-primary border border-primary/20 font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            )}>
              <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px]", s.id === sectionId ? "bg-primary text-primary-foreground" : "bg-muted")}>{s.section_number || i+1}</span>
              <span className="truncate">{s.title?.en || (typeof s.title === 'string' ? s.title : '')}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* Toolbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><BookOpen className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              <span className="truncate max-w-[100px]">{exam?.name}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">Ch. {currentSection?.section_number || currentIndex+1}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 lg:gap-2">
            <button onClick={() => setLang(lang === 'en' ? 'np' : 'en')} className="flex items-center gap-2 px-2 lg:px-3 py-1.5 rounded-lg bg-muted border border-border text-[9px] lg:text-[10px] font-bold uppercase tracking-widest hover:bg-muted/80 transition-all whitespace-nowrap text-foreground">
              <Languages className="w-3 h-3 text-primary" /> {lang === 'en' ? 'English' : 'नेपाली'}
            </button>
            <button onClick={() => setMode(mode === 'read' ? 'edit' : 'read')} className="flex items-center gap-2 px-2 lg:px-3 py-1.5 rounded-lg bg-muted border border-border text-[9px] lg:text-[10px] font-bold uppercase tracking-widest hover:bg-muted/80 transition-all whitespace-nowrap text-foreground">
              {mode === 'read' ? <Edit3 className="w-3 h-3 text-primary" /> : <Eye className="w-3 h-3 text-primary" />}
              <span className="hidden sm:inline">{mode === 'read' ? 'Edit' : 'Read'}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-background">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
            
            {/* Header Section */}
            <div className="mb-8 lg:mb-12 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest">Chapter {currentSection?.section_number || currentIndex+1}</span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {progress?.status === 'done' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> <span className="hidden sm:inline">Complete</span></> : <><Circle className="w-3 h-3" /> <span className="hidden sm:inline">In Progress</span></>}
                </div>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {lang === 'en' ? currentSection?.title?.en : (currentSection?.title?.np || currentSection?.title?.en)}
              </h1>
            </div>

            {/* Ingest Toolbar (Only if no content) */}
            {(!note || !note.content?.[lang]) && mode === 'read' && (
              <div className="p-8 lg:p-10 border-2 border-dashed border-border rounded-3xl text-center space-y-6 bg-card shadow-sm">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Chapter is empty</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Upload a textbook PDF or paste notes to begin.</p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} disabled={ingesting} className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 border border-border rounded-2xl text-xs font-bold transition-all disabled:opacity-50 text-foreground">
                    {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 text-primary" />}
                    Upload
                  </button>
                  <button onClick={() => setMode('edit')} className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 border border-border rounded-2xl text-xs font-bold transition-all text-foreground">
                    <Type className="w-4 h-4 text-primary" />
                    Paste
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx" />
              </div>
            )}

            {/* Reader / Editor */}
            <div className="prose dark:prose-invert prose-headings:font-bold prose-h2:text-xl lg:prose-h2:text-2xl prose-p:text-foreground/80 prose-p:leading-relaxed max-w-none pb-24 text-foreground">
              {mode === 'read' ? (
                <div className="animate-in fade-in duration-500">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {note?.content?.[lang] || ""}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-card p-3 rounded-t-2xl border border-border shadow-sm">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{lang === 'en' ? 'Editing English' : 'सम्पादन: नेपाली'}</span>
                    <button onClick={saveNotes} disabled={saving} className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                  <textarea 
                    value={editContent} 
                    onChange={(e) => { setEditContent(e.target.value); setHasUnsavedChanges(true) }}
                    className="w-full min-h-[50vh] lg:min-h-[60vh] p-4 lg:p-8 bg-card border border-t-0 border-border rounded-b-2xl text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-mono placeholder:text-muted-foreground/30 text-foreground"
                    placeholder="Write in Markdown..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Selection Toolbar */}
        {mode === 'read' && note?.content?.[lang] && (
          <AIToolbar onInsert={(text: string) => setAiResult(text)} />
        )}

        {/* AI Result Overlay */}
        <AnimatePresence>
          {aiResult && (
            <AIResultModal 
              content={aiResult} 
              onClose={() => setAiResult(null)} 
            />
          )}
        </AnimatePresence>

        {/* Footer Nav */}
        <footer className="h-20 shrink-0 flex items-center justify-between px-4 lg:px-8 border-t border-border bg-background/50 backdrop-blur-md">
          {prevSection ? (
            <Link href={`/exams/${examId}/notes/${prevSection.id}`} className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 hover:bg-muted rounded-2xl transition-all group">
              <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              <div className="text-left hidden sm:block"><div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Prev</div><div className="text-xs font-bold truncate max-w-[100px] text-foreground">{prevSection.title?.en}</div></div>
            </Link>
          ) : <div />}
          
          <button onClick={toggleComplete} className={cn(
            "flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-full text-[10px] lg:text-xs font-bold transition-all border",
            progress?.status === 'done' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}>
            <CheckCircle2 className="w-4 h-4" /> <span className="hidden xs:inline">{progress?.status === 'done' ? 'Mastered' : 'Done'}</span>
          </button>

          {nextSection ? (
            <Link href={`/exams/${examId}/notes/${nextSection.id}`} className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 hover:bg-muted rounded-2xl transition-all group">
              <div className="text-right hidden sm:block"><div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Next</div><div className="text-xs font-bold truncate max-w-[100px] text-foreground">{nextSection.title?.en}</div></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            </Link>
          ) : <div />}
        </footer>
      </main>
    </div>
  )
}

