/**
 * @file exams/[id]/page.tsx
 * @description Exam Detail and Knowledge Base view.
 * Handles Syllabus PDF upload and AI chapter extraction.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileUp, 
  BookOpen, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ArrowLeft,
  Settings,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { extractChaptersAction } from '@/app/actions/exam.actions'

export default function ExamDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchExamData()
  }, [id])

  const fetchExamData = async () => {
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single()

    if (!examData) {
      router.push('/exams')
      return
    }

    const { data: sectionData } = await supabase
      .from('exam_sections')
      .select('*')
      .eq('exam_id', id)
      .order('order_index', { ascending: true })

    setExam(examData)
    setSections(sectionData || [])
    setLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !exam) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${exam.id}/syllabus_${Date.now()}.${fileExt}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Register in uploaded_pdfs table
      const { error: dbError } = await supabase.from('uploaded_pdfs').insert({
        user_id: user.id,
        exam_id: exam.id,
        type: 'syllabus',
        file_name: file.name,
        storage_path: filePath,
        file_size_kb: Math.round(file.size / 1024),
      })

      if (dbError) throw dbError

      // 3. Trigger AI Extraction
      setExtracting(true)
      const result = await extractChaptersAction(exam.id, filePath)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to extract chapters")
      }

      setExtracting(false)
      setUploading(false)
      fetchExamData()

    } catch (error: any) {
      alert('Upload failed: ' + error.message)
      setUploading(false)
      setExtracting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-10 space-y-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-[3rem]" />
      </div>
    )
  }

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Link 
            href="/exams" 
            className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground hover:text-saffron transition-colors uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
          </Link>
          <div className="space-y-1">
            <h1 className="text-5xl font-display text-white">{exam.name}</h1>
            <p className="text-muted-foreground uppercase font-mono text-[10px] tracking-widest">
              Knowledge Base · {sections.length} Chapters Generated
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button className="p-4 bg-navy-light border border-white/5 rounded-2xl text-muted-foreground hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || extracting}
            className="flex items-center gap-3 px-8 py-4 bg-saffron text-navy rounded-2xl font-bold shadow-xl shadow-saffron/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
            {uploading ? 'Processing Syllabus...' : 'Update Syllabus PDF'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf" 
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        
        {/* Sidebar / Stats */}
        <div className="lg:col-span-1 space-y-8">
          <div className="glass p-8 rounded-[2rem] space-y-6">
            <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Coverage</div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-display text-white">0%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Overall Progress</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="w-0 h-full bg-saffron" />
              </div>
            </div>
          </div>

          <div className="p-8 bg-navy-light rounded-[2rem] border border-white/5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-saffron" />
              AI Summary
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your syllabus PDF to generate a structured study plan, chapter breakdowns, and AI-powered notes.
            </p>
          </div>
        </div>

        {/* Chapters List */}
        <div className="lg:col-span-3 space-y-8">
          {sections.length === 0 ? (
            <div className="glass border-2 border-dashed border-white/5 rounded-[3rem] p-20 text-center space-y-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-saffron/20 blur-2xl rounded-full" />
                <FileText className="w-20 h-20 text-saffron relative z-10 mx-auto opacity-20" />
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h2 className="text-2xl font-display">No Chapters Detected</h2>
                <p className="text-sm text-muted-foreground">
                  Our AI needs a syllabus PDF to structure your knowledge base. Upload one to begin.
                </p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Upload Syllabus
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sections.map((section, index) => (
                <Link href={`/exams/${id}/notes/${section.id}`} key={section.id}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 bg-navy-light border border-white/5 rounded-2xl flex items-center justify-between group hover:border-saffron/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-xl bg-navy-lighter flex items-center justify-center font-display text-muted-foreground group-hover:bg-saffron group-hover:text-navy transition-all">
                        {section.section_number || index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-saffron transition-colors">
                          {section.title.en}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                          {section.subsections?.length || 0} Subtopics · Not Started
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-saffron transition-transform group-hover:translate-x-1" />
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
