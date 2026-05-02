/**
 * @file capture.actions.ts
 * @description Server Actions for managing and promoting quick captures.
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function promoteCaptureAction(captureId: string, type: 'note' | 'todo' | 'question' | 'deadline', metadata: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 1. Get the capture content
    const { data: capture } = await supabase.from('capture_inbox').select('*').eq('id', captureId).single()
    if (!capture) throw new Error("Capture not found")

    // 2. Insert into the target table
    if (type === 'deadline') {
      await supabase.from('deadlines').insert({
        user_id: user.id,
        title: capture.content.substring(0, 100),
        notes: capture.content,
        deadline_date: metadata.date || new Date().toISOString().split('T')[0],
        priority: metadata.priority || 'medium',
        type: 'submission'
      })
    } else if (type === 'todo') {
       // Find an active plan or create one for today
       const today = new Date().toISOString().split('T')[0]
       let { data: plan } = await supabase.from('daily_plans').select('id').eq('user_id', user.id).eq('date', today).single()
       if (!plan) {
         const { data: newPlan } = await supabase.from('daily_plans').insert({ user_id: user.id, date: today }).select().single()
         plan = newPlan
       }
       if (plan) {
         await supabase.from('session_objectives').insert({
           plan_id: plan.id,
           user_id: user.id,
           title: capture.content,
           status: 'pending'
         })
       }
    } else if (type === 'question') {
      await supabase.from('question_bank').insert({
        user_id: user.id,
        exam_id: metadata.exam_id,
        section_id: metadata.section_id,
        question: { en: capture.content, np: '' },
        type: 'short',
        source: 'manual'
      })
    } else if (type === 'note') {
      // Append to existing note or create new
      const { data: existingNote } = await supabase.from('exam_notes').select('*').eq('section_id', metadata.section_id).single()
      if (existingNote) {
        const newContent = { ...existingNote.content, en: (existingNote.content.en || '') + '\n\n' + capture.content }
        await supabase.from('exam_notes').update({ content: newContent }).eq('id', existingNote.id)
      } else {
        await supabase.from('exam_notes').insert({
          section_id: metadata.section_id,
          user_id: user.id,
          content: { en: capture.content, np: '' }
        })
      }
    }

    // 3. Delete the capture from inbox
    await supabase.from('capture_inbox').delete().eq('id', captureId)

    return { success: true }
  } catch (error: any) {
    console.error('Promotion Error:', error)
    return { success: false, error: error.message }
  }
}
