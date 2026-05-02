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
import { Classroom } from '@/components/studyops/Classroom'
import { QuizEngine } from '@/components/studyops/QuizEngine'
import { useLanguage } from '@/lib/bilingualUtils'

// ─── Components ──────────────────────────────────────────────

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
  
  const [activeTab, setActiveTab] = useState<'read' | 'edit' | 'lesson' | 'quiz'>('read')
  const { lang, toggleLanguage } = useLanguage()
  const [editContent, setEditContent] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
    } else {
      setProgress({ status: 'not_started', confidence: 0 })
    }
    setLoading(false)
  }

  const updateConfidence = async (val: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('exam_progress').upsert({ 
      section_id: sectionId, 
      user_id: user.id, 
      confidence: val,
      updated_at: new Date().toISOString()
    }, { onConflict: 'section_id,user_id' })
    setProgress((prev: any) => ({ ...prev, confidence: val }))
    toast.success(`Mastery rated: ${val}/5`)
  }

  // Auto-save logic
  useEffect(() => {
    if (!hasUnsavedChanges || activeTab !== 'edit') return

    const timer = setTimeout(() => {
      saveNotes()
    }, 2000)

    return () => clearTimeout(timer)
  }, [editContent])

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
      setActiveTab('read')
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
        "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card flex flex-col shrink-0 transition-all duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:overflow-hidden"
      )}>
        <div className="w-72 flex flex-col h-full"> {/* Inner wrapper to keep width constant while aside collapses */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <Link href={`/exams/${examId}`} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
                <ArrowLeft className="w-3 h-3" /> Overview
              </Link>
              <h2 className="text-sm font-bold truncate max-w-[180px] text-foreground">{exam?.name}</h2>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {sections.map((s, i) => {
              const isCurrent = s.id === sectionId
              return (
                <div key={s.id} className="space-y-1">
                  <Link href={`/exams/${examId}/notes/${s.id}`} onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)} className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-xl text-xs transition-all border",
                    isCurrent ? "bg-primary/10 text-primary border-primary/20 font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                  )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={cn("w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px]", isCurrent ? "bg-primary text-primary-foreground" : "bg-muted")}>{s.section_number || i+1}</span>
                      <span className="truncate">{s.title?.en || (typeof s.title === 'string' ? s.title : '')}</span>
                    </div>
                    {isCurrent && progress?.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </Link>
                  
                  {/* Topics (Subsections) */}
                  {isCurrent && s.subsections && Array.isArray(s.subsections) && (
                    <div className="pl-10 space-y-1 py-2">
                      {s.subsections.map((sub: any, subIdx: number) => (
                        <div key={subIdx} className="flex items-center gap-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-all cursor-default">
                          <div className={cn("w-2 h-2 rounded-full border border-border", sub.done ? "bg-emerald-500 border-emerald-500" : "")} />
                          <span>{sub.number || `${s.section_number}.${subIdx + 1}`}</span>
                          <span className="truncate">{sub.title?.[lang] || sub.title?.en || sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* Toolbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground"><BookOpen className="w-4 h-4" /></button>
            
            {/* Main Tabs */}
            <nav className="flex bg-muted/50 p-1 rounded-xl border border-border">
              {[
                { id: 'read', label: 'READ', icon: Eye },
                { id: 'edit', label: 'EDIT', icon: Edit3 },
                { id: 'quiz', label: 'QUIZ', icon: Star },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
                    activeTab === tab.id 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-3 h-3" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted/80 transition-all text-foreground">
              <Languages className="w-3.5 h-3.5 text-primary" /> {lang === 'en' ? 'EN' : 'NP'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-background">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
            
            {/* Header Section */}
            <div className="mb-8 lg:mb-12 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest">Chapter {currentSection?.section_number || currentIndex+1}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {progress?.status === 'done' ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> <span className="hidden sm:inline">Complete</span></> : <><Circle className="w-3 h-3" /> <span className="hidden sm:inline">In Progress</span></>}
                  </div>
                </div>

                {/* Mastery Stars */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mr-2">Mastery:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateConfidence(star)}
                      className={cn(
                        "transition-all hover:scale-125",
                        star <= (progress?.confidence || 0) ? "text-primary" : "text-muted-foreground/30 hover:text-primary/50"
                      )}
                    >
                      <Star className={cn("w-4 h-4", star <= (progress?.confidence || 0) && "fill-current")} />
                    </button>
                  ))}
                </div>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {lang === 'en' ? currentSection?.title?.en : (currentSection?.title?.np || currentSection?.title?.en)}
              </h1>
            </div>

            {/* Ingest Toolbar (Only if no content) */}
            {(!note || !note.content?.[lang]) && activeTab === 'read' && (
              <div className="p-8 lg:p-10 border-2 border-dashed border-border rounded-3xl text-center space-y-6 bg-card shadow-sm">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground" />
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
                  <button onClick={() => setActiveTab('edit')} className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 border border-border rounded-2xl text-xs font-bold transition-all text-foreground">
                    <Type className="w-4 h-4 text-primary" />
                    Paste
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx" />
              </div>
            )}

            {/* Reader / Editor */}
            <div className="pb-24">
              {activeTab === 'read' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 prose dark:prose-invert prose-headings:font-bold prose-h2:text-xl lg:prose-h2:text-2xl prose-p:text-foreground/80 prose-p:leading-relaxed max-w-none text-foreground">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node, src, alt, ...props }) => {
                        return <img src={src} alt={alt} {...props} className="rounded-3xl border border-border shadow-lg" />
                      }
                    }}
                  >
                    {note?.content?.[lang] || ""}
                  </ReactMarkdown>
                </div>
              ) : activeTab === 'edit' ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center bg-card p-3 px-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        {lang === 'en' ? 'English Source' : 'Nepali Translation'}
                      </span>
                      {hasUnsavedChanges && (
                        <span className="text-[9px] font-mono text-primary animate-pulse uppercase tracking-tighter">Unsaved Changes...</span>
                      )}
                    </div>
                    <button onClick={saveNotes} disabled={saving} className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/10">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving ? 'Saving' : 'Save'}
                    </button>
                  </div>
                  <textarea 
                    value={editContent} 
                    onChange={(e) => { setEditContent(e.target.value); setHasUnsavedChanges(true) }}
                    className="w-full min-h-[60vh] p-8 bg-card border border-border rounded-[2rem] text-base leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-mono placeholder:text-muted-foreground/30 text-foreground shadow-sm"
                    placeholder="Write in Markdown..."
                  />
                </div>
              ) : activeTab === 'lesson' ? (
                <div className="h-[70vh]">
                  <Classroom 
                    topic={{ 
                      title: currentSection?.title?.[lang] || currentSection?.title?.en || "Lesson",
                      content: note?.content?.[lang] || "Start by adding some content to this chapter."
                    }}
                    onComplete={() => {
                      toast.success("Lesson Complete! Energy rating logged.")
                      toggleComplete()
                    }}
                  />
                </div>
              ) : (
                <div className="h-[70vh]">
                  <QuizEngine 
                    topic={{ 
                      title: currentSection?.title?.[lang] || currentSection?.title?.en || "Quiz",
                      content: note?.content?.[lang] || ""
                    }}
                    examId={examId as string}
                    sectionId={sectionId as string}
                    onComplete={(score) => {
                      toast.success(`Quiz Complete! Scored ${score}.`)
                      toggleComplete()
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>


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

