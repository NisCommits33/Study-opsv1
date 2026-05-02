/**
 * @file exams/page.tsx
 * @description Exams management page.
 * Users can view their active exams and add new ones (Syllabus-driven).
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, ChevronRight, FileText, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

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
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    const { data } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setExams(data as Exam[])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('exams').insert({
      user_id: user.id,
      name: newName,
    })

    if (!error) {
      toast.success('Knowledge base initialized')
      setNewName('')
      setShowAdd(false)
      fetchExams()
    } else {
      toast.error('Failed to create exam')
    }
  }

  const deleteExam = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Are you sure? This will delete all associated notes and progress.')) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (!error) {
      toast.success('Exam deleted')
      fetchExams()
    } else {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="p-10 space-y-10">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-10 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display text-white">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage your exams and study materials.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-6 py-3 bg-saffron text-navy rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" /> New Exam
        </button>
      </header>

      {/* Grid of Exams */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-2 border-white/5 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-10 h-10 text-muted-foreground opacity-20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display">Your library is empty</h2>
              <p className="text-sm text-muted-foreground">Add your first exam to start building your knowledge base.</p>
            </div>
            <button 
              onClick={() => setShowAdd(true)}
              className="text-saffron font-bold text-xs uppercase tracking-widest hover:underline"
            >
              Initialize First Exam
            </button>
          </div>
        )}

        {exams.map((exam) => (
          <Link href={`/exams/${exam.id}`} key={exam.id}>
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-navy-light border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles className="w-16 h-16 text-saffron" />
              </div>

              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-saffron/10 flex items-center justify-center text-saffron border border-saffron/20">
                  <FileText className="w-6 h-6" />
                </div>
                <button 
                  onClick={(e) => deleteExam(exam.id, e)}
                  className="p-2 hover:bg-rose/10 text-muted-foreground hover:text-rose rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-display text-white group-hover:text-saffron transition-colors leading-tight">
                  {exam.name}
                </h3>
                <div className="flex items-center gap-3 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                  <span>{exam.total_sections || 0} SECTIONS</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Enter Knowledge Base</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-saffron transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          </Link>
        ))}
      </section>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-navy-lighter w-full max-w-lg p-12 rounded-[3rem] space-y-8 border border-white/10 shadow-2xl"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-display text-white">Create New Exam</h2>
                <p className="text-muted-foreground text-sm">Give your exam a clear title to get started.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Exam Name</label>
                  <input 
                    type="text" 
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. Big Data Engineering"
                    className="w-full bg-navy-light border border-white/5 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-saffron text-lg font-display"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowAdd(false)} 
                  className="flex-1 py-5 font-bold text-xs uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-colors text-muted-foreground"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd} 
                  disabled={!newName}
                  className="flex-1 py-5 bg-saffron text-navy font-bold rounded-2xl shadow-xl shadow-saffron/10 uppercase tracking-widest text-xs disabled:opacity-30 disabled:grayscale transition-all"
                >
                  Create Knowledge Base
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
