/**
 * @file exams/[id]/past-papers/page.tsx
 * @description Past Paper Analysis & Question Bank.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  History,
  Plus,
  FileText,
  BarChart3,
  Loader2,
  Trash2,
  Calendar,
  Sparkles,
  FileUp,
  X,
  ChevronRight,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { extractQuestionsFromPaperAction, analyzeFrequencyAction } from '@/app/actions/exam.actions'

export default function PastPapersPage() {
  const { id: examId } = useParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [exam, setExam] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [frequencies, setFrequencies] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  
  const [year, setYear] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [examId])

  const fetchData = async () => {
    setLoading(true)
    const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single()
    if (!examData) { router.push('/exams'); return }
    setExam(examData)

    const { data: papersData } = await supabase.from('uploaded_pdfs').select('*').eq('exam_id', examId).eq('type', 'past_paper').order('year', { ascending: false })
    setPapers(papersData || [])

    const { data: freqData } = await supabase
      .from('chapter_frequency')
      .select('*, section:exam_sections(section_number, title)')
      .eq('exam_id', examId)
      .order('frequency_percentage', { ascending: false })
    setFrequencies(freqData || [])

    const { data: qData } = await supabase
      .from('question_bank')
      .select('*, section:exam_sections(section_number, title)')
      .eq('exam_id', examId)
      .limit(50)
      .order('created_at', { ascending: false })
    setQuestions(qData || [])

    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !year.trim()) {
        toast.error("Please specify the year first")
        return
    }

    setIngesting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${examId}/past_papers/${year}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const result = await extractQuestionsFromPaperAction(examId as string, filePath, year)
      if (!result.success) throw new Error(result.error)

      toast.success(`Success! Extracted ${result.count} questions.`)
      setShowUploadModal(false)
      fetchData()
    } catch (err: any) {
      toast.error('Processing failed: ' + err.message)
    } finally {
      setIngesting(false)
    }
  }

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm("Delete this paper and all its extracted questions?")) return
    try {
        await supabase.from('question_bank').delete().eq('source_pdf_id', paperId)
        await supabase.from('uploaded_pdfs').delete().eq('id', paperId)
        toast.success("Deleted")
        fetchData()
        analyzeFrequencyAction(examId as string) // Re-calculate
    } catch (err: any) {
        toast.error(err.message)
    }
  }

  if (loading) return <div className="p-10 space-y-10 bg-background h-screen"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-3xl" /></div>

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-12 pb-32 text-foreground bg-background">
      
      {/* ── Header ── */}
      <header className="space-y-6">
        <Link href={`/exams/${examId}`} className="group flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
          <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-bold text-foreground tracking-tight leading-none">Past Papers</h1>
            <p className="text-muted-foreground text-sm max-w-xl">AI-powered frequency analysis and question bank for {exam.name}.</p>
          </div>
          <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10">
            <Plus className="w-4 h-4" /> Upload New Paper
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* ── Left Column: Frequency Analysis & Questions ── */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Frequency Heatmap */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Frequency Analysis</h2>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{papers.length} Papers Analysed</span>
            </div>

            {frequencies.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-[2.5rem] bg-muted/5 space-y-4">
                    <BarChart3 className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Upload past papers to see which chapters appear most often.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {frequencies.map((f, i) => (
                        <div key={f.id} className="group p-6 rounded-[2rem] bg-card border border-border hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">Ch {f.section?.section_number}</span>
                                    <h3 className="text-sm font-bold text-foreground">{f.section?.title?.en}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-foreground">{Math.round(f.frequency_percentage)}%</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest ml-2">Weightage</span>
                                </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${f.frequency_percentage}%` }}
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(244,184,43,0.3)]" 
                                />
                            </div>
                            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                                <span>Found in {f.appearance_count} questions</span>
                                <span>Risk: {f.frequency_percentage > 40 ? 'High' : 'Moderate'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </section>

          {/* Recent Questions */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Recent Question Bank</h2>
              <Target className="w-4 h-4 text-muted-foreground/40" />
            </div>
            
            <div className="space-y-3">
                {questions.map((q) => (
                    <div key={q.id} className="p-6 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-all space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{q.year} · {q.marks} Marks</span>
                            <span className="text-[10px] font-mono text-primary uppercase tracking-widest">{q.section?.section_number ? `Ch ${q.section.section_number}` : 'Unmapped'}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question.en}</p>
                    </div>
                ))}
            </div>
          </section>
        </div>

        {/* ── Right Column: Paper Management ── */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* Stats Summary */}
            <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-8 shadow-sm">
                <div className="space-y-2">
                    <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Intelligence Summary</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">{questions.length}</span>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Extracted Qs</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/20 rounded-2xl border border-border">
                        <div className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">Top Topic</div>
                        <div className="text-xs font-bold text-primary truncate">{frequencies[0]?.section?.title?.en || '-'}</div>
                    </div>
                    <div className="p-4 bg-muted/20 rounded-2xl border border-border">
                        <div className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">Analysed</div>
                        <div className="text-xs font-bold text-foreground">{papers.length} Papers</div>
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">AI analyzes every uploaded paper to build a predictive model of your upcoming exam.</p>
            </div>

            {/* Paper List */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-4">Managed Papers</h3>
                <div className="space-y-2">
                    {papers.map((p) => (
                        <div key={p.id} className="group flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border hover:bg-muted/40 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary"><FileText className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">{p.year} Paper</div>
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Uploaded {new Date(p.uploaded_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeletePaper(p.id)}
                                className="p-2 text-muted-foreground/20 hover:text-rose hover:bg-rose/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {papers.length === 0 && <div className="text-center py-8 text-[10px] text-muted-foreground uppercase tracking-widest">No papers uploaded.</div>}
                </div>
            </div>

        </div>
      </div>

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={() => setShowUploadModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-card w-full max-w-lg p-10 rounded-[3rem] border border-border shadow-2xl space-y-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold flex items-center gap-3 text-foreground"><Sparkles className="w-6 h-6 text-primary" /> Past Paper AI</h3>
                <p className="text-sm text-muted-foreground">Upload a PDF to extract questions and analyze frequency.</p>
              </div>
              
              <div className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Exam Year (e.g. 2079, 2023)</label>
                      <input 
                        value={year} 
                        onChange={e => setYear(e.target.value)} 
                        placeholder="Year" 
                        className="w-full p-4 bg-muted/20 border border-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground" 
                      />
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="py-16 border-2 border-dashed border-border rounded-[2rem] bg-muted/5 flex flex-col items-center justify-center gap-4 text-center cursor-pointer hover:bg-muted/10 transition-all"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      {ingesting ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <FileUp className="w-8 h-8 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{ingesting ? 'Analyzing Paper...' : 'Select PDF Paper'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">AI will process questions automatically</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                  </div>
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => setShowUploadModal(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-foreground transition-colors text-muted-foreground">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
