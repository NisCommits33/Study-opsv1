/**
 * @file components/studyops/QuizEngine.tsx
 * @description Integrated Quiz Engine for Study Ops.
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, HelpCircle, CheckCircle2, XCircle, ArrowRight, Trophy, RefreshCw, Sparkles, Zap, Loader2 } from 'lucide-react'
import { logWeakSpotAction, logStudySessionAction } from '@/app/actions/study.actions'
import { cn } from '@/lib/utils'

interface QuizEngineProps {
  topic: {
    title: string
    content: string
  }
  examId?: string
  sectionId?: string
  onComplete: (score: number) => void
}

export function QuizEngine({ topic, examId, sectionId, onComplete }: QuizEngineProps) {
  const [step, setStep] = useState<'intro' | 'active' | 'result'>('intro')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<any[]>([])
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low'>('medium')
  const [isFinishing, setIsFinishing] = useState(false)
  
  // Mock Questions (AI would generate these)
  const questions = [
    {
      q: "What is the primary goal of " + topic.title + "?",
      options: ["Efficiency", "Safety", "Redundancy", "Speed"],
      correct: 1
    },
    {
      q: "Which concept is most related to fault tolerance in this context?",
      options: ["HDFS Replication", "MapReduce", "NoSQL CAP", "HBase"],
      correct: 0
    }
  ]

  const handleAnswer = (idx: number) => {
    const isCorrect = idx === questions[currentQuestion].correct
    if (isCorrect) {
        setScore(prev => prev + 1)
    } else {
        // Log weak spot on error
        logWeakSpotAction({
            exam_id: examId,
            section_id: sectionId,
            topic: topic.title,
            source: 'quiz',
            description: `Incorrectly answered: "${questions[currentQuestion].q}"`,
            severity: 'medium'
        })
    }
    
    setAnswers([...answers, { question: currentQuestion, selected: idx, correct: isCorrect }])
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      setStep('result')
    }
  }

  return (
    <div className="h-full bg-card/30 backdrop-blur-xl rounded-[2.5rem] border border-border flex flex-col items-center justify-center p-12 text-center">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-10 max-w-md"
          >
            <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-full h-full bg-card border border-border rounded-3xl flex items-center justify-center text-primary shadow-xl">
                    <Target className="w-10 h-10" />
                </div>
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Active Quiz</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Testing your knowledge on "{topic.title}". 5-mark and 10-mark style questions included.
                </p>
            </div>
            <button 
                onClick={() => setStep('active')}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                Start Quiz <Zap className="w-4 h-4 fill-current" />
            </button>
          </motion.div>
        )}

        {step === 'active' && (
          <motion.div 
            key="active"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl space-y-10"
          >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Question {currentQuestion + 1} / {questions.length}</span>
                <div className="h-1 flex-1 mx-8 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
                </div>
            </div>

            <div className="space-y-8">
                <h3 className="text-2xl font-bold text-foreground leading-tight">{questions[currentQuestion].q}</h3>
                <div className="grid grid-cols-1 gap-4">
                    {questions[currentQuestion].options.map((opt, i) => (
                        <button 
                            key={i}
                            onClick={() => handleAnswer(i)}
                            className="group p-6 bg-card border border-border rounded-2xl flex items-center justify-between hover:border-primary/40 hover:bg-muted/10 transition-all text-left"
                        >
                            <span className="text-sm font-bold text-foreground/80 group-hover:text-foreground">{opt}</span>
                            <div className="w-6 h-6 rounded-lg border border-border flex items-center justify-center text-[10px] text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">{String.fromCharCode(65 + i)}</div>
                        </button>
                    ))}
                </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 max-w-md"
          >
            <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-teal/20 rounded-full blur-2xl" />
                <div className="relative w-full h-full bg-card border border-border rounded-3xl flex items-center justify-center text-teal shadow-xl">
                    <Trophy className="w-10 h-10" />
                </div>
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Quiz Complete</h2>
                <p className="text-sm text-muted-foreground">You scored {score} out of {questions.length}!</p>
            </div>
            <div className="p-6 bg-muted/20 border border-border rounded-3xl space-y-4 text-left">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Session Energy</div>
                <div className="flex gap-2">
                    {[
                        { id: 'low', icon: '😴', label: 'Tired' },
                        { id: 'medium', icon: '😐', label: 'Neutral' },
                        { id: 'high', icon: '⚡', label: 'Focused' }
                    ].map((e: any) => (
                        <button 
                            key={e.id}
                            onClick={() => setEnergy(e.id)}
                            className={cn(
                                "flex-1 py-3 rounded-2xl border transition-all text-sm",
                                energy === e.id ? "bg-primary border-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" : "bg-muted/20 border-border text-muted-foreground"
                            )}
                        >
                            {e.icon} {e.label}
                        </button>
                    ))}
                </div>
            </div>
            <button 
                onClick={async () => {
                    setIsFinishing(true)
                    await logStudySessionAction({
                        exam_id: examId,
                        section_id: sectionId,
                        duration_minutes: 15, // Mock duration
                        energy_level: energy,
                        score: score
                    })
                    onComplete(score)
                    setIsFinishing(false)
                }}
                disabled={isFinishing}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                {isFinishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish & Log Session"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
