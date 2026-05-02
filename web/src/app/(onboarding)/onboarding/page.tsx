/**
 * @file onboarding/page.tsx
 * @description User onboarding wizard.
 * Collects mandatory profile information and shift configuration for new users.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

/**
 * OnboardingPage Component.
 * Implements a multi-step form with validation and Supabase integration.
 */
export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // Form State
  const [fullName, setFullName] = useState('')
  const [workType, setWorkType] = useState('shift')
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().split('T')[0])
  const [firstShiftType, setFirstShiftType] = useState('morning')

  useEffect(() => {
    /**
     * Initial session check to ensure user is authenticated.
     */
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setFullName(user.user_metadata?.full_name || '')
        setInitializing(false)
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [router])

  /**
   * Submits the final onboarding data to Supabase.
   */
  const handleComplete = async () => {
    if (!userId) return
    setLoading(true)

    try {
      // 1. Upsert Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName,
          work_type: workType,
          onboarding_done: true,
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // 2. Insert Shift Config if applicable
      if (workType === 'shift') {
        const { error: shiftError } = await supabase
          .from('shift_configs')
          .insert({
            user_id: userId,
            cycle_start_date: cycleStartDate,
            first_shift_type: firstShiftType,
          })
        if (shiftError) throw shiftError
      }

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Onboarding submission failed:', error.message)
      setLoading(false)
    }
  }

  /**
   * Navigates to the next step.
   * Skips Step 3 (Shift Config) if the user is not a shift worker.
   */
  const nextStep = () => {
    if (step === 2 && workType !== 'shift') {
      setStep(4)
    } else {
      setStep((s) => (s + 1) as Step)
    }
  }

  /**
   * Navigates to the previous step.
   * Returns to Step 2 if Step 3 was skipped.
   */
  const prevStep = () => {
    if (step === 4 && workType !== 'shift') {
      setStep(2)
    } else {
      setStep((s) => (s - 1) as Step)
    }
  }

  /**
   * Shows skeleton state during initial session fetch.
   */
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-xl glass p-10 rounded-3xl space-y-8">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="flex justify-between pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl glass p-10 rounded-3xl space-y-8 relative overflow-hidden">
        {/* Step Progress Indicator */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => {
            // Hide Step 3 indicator if not a shift worker
            if (i === 3 && workType !== 'shift') return null
            return (
              <div 
                key={i} 
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  step >= i ? "bg-primary" : "bg-muted"
                )} 
              />
            )
          })}
        </div>

        {/* Step Content with AnimatePresence */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-bold">Welcome to Study Ops</h1>
                  <p className="text-muted-foreground mt-2">Let's start with your name.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full bg-secondary/50 border border-white/5 p-4 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-bold">Your Work Style</h1>
                  <p className="text-muted-foreground mt-2">How do you balance work and study?</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'shift', label: 'Shift Worker', desc: 'Aviation Fire (ARFF), Health, Security' },
                    { id: 'regular', label: 'Regular Job', desc: '9 to 5, Fixed hours' },
                    { id: 'student', label: 'Full-time Student', desc: 'No job, primary focus is study' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setWorkType(item.id)}
                      className={cn(
                        "text-left p-4 rounded-xl border-2 transition-all duration-300",
                        workType === item.id 
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                          : "border-transparent bg-secondary/50 hover:bg-secondary"
                      )}
                    >
                      <div className="font-bold">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-bold">Shift Schedule</h1>
                  <p className="text-muted-foreground mt-2">We'll use this to find your free study windows.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">When did your current cycle start?</label>
                    <input 
                      type="date" 
                      value={cycleStartDate}
                      onChange={(e) => setCycleStartDate(e.target.value)}
                      className="w-full bg-secondary/50 border border-white/5 p-4 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Shift Type</label>
                    <div className="flex gap-4">
                      {['morning', 'day'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setFirstShiftType(s)}
                          className={cn(
                            "flex-1 p-3 rounded-xl border-2 capitalize transition-all duration-300",
                            firstShiftType === s 
                              ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                              : "border-transparent bg-secondary/50 hover:bg-secondary"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center"
              >
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto neon-border">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold">You're All Set!</h1>
                  <p className="text-muted-foreground mt-2">
                    Study Ops is ready to optimize your exam preparation.
                  </p>
                </div>
                <div className="glass p-6 rounded-2xl text-left space-y-3 bg-white/5">
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Candidate:</span>
                    <span className="font-medium">{fullName}</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Context:</span>
                    <span className="font-medium capitalize">{workType}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between pt-4 border-t border-white/5">
          {step > 1 ? (
            <button 
              onClick={prevStep}
              className="px-6 py-2 rounded-lg font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Back
            </button>
          ) : <div />}
          
          <button 
            onClick={step === 4 ? handleComplete : nextStep}
            disabled={loading || (step === 1 && !fullName)}
            className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all neon-border disabled:opacity-50"
          >
            {loading ? 'Finalizing...' : step === 4 ? 'Launch Dashboard' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
