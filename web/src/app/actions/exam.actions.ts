/**
 * @file exam.actions.ts
 * @description Server actions for exam and knowledge base management.
 * 
 * @author Study Ops Engineering
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'




/**
 * Manually creates a new chapter for an exam.
 */
export async function createChapterAction(examId: string, chapter: { number: string, title: { en: string, np?: string }, subtopics: string[] }) {
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

    // Get current max order_index
    const { data: existing } = await supabase.from('exam_sections').select('order_index').eq('exam_id', examId).order('order_index', { ascending: false }).limit(1)
    const nextOrder = (existing && existing.length > 0) ? (existing[0].order_index + 1) : 0

    const subsections = chapter.subtopics.map(t => ({ title: { en: t, np: "" } }))

    const { data, error } = await supabase.from('exam_sections').insert({
      exam_id: examId,
      user_id: user.id,
      section_number: chapter.number,
      title: chapter.title,
      subsections,
      order_index: nextOrder
    }).select().single()

    if (error) throw error

    // Update exam section count
    const { data: sections } = await supabase.from('exam_sections').select('id').eq('exam_id', examId)
    await supabase.from('exams').update({ total_sections: sections?.length || 0 }).eq('id', examId)

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Deletes a chapter and its associated data (notes, progress).
 */
export async function deleteChapterAction(sectionId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    },
  })

  try {
    const { data: section } = await supabase.from('exam_sections').select('exam_id').eq('id', sectionId).single()
    if (!section) throw new Error("Chapter not found")

    // 1. Delete Dependencies (Manual Cascade)
    await supabase.from('exam_notes').delete().eq('section_id', sectionId)
    await supabase.from('exam_progress').delete().eq('section_id', sectionId)

    // 2. Delete the Chapter
    const { error } = await supabase.from('exam_sections').delete().eq('id', sectionId)
    if (error) throw error

    // 3. Update Exam Stats
    const { data: sections } = await supabase.from('exam_sections').select('id').eq('exam_id', section.exam_id)
    await supabase.from('exams').update({ total_sections: sections?.length || 0 }).eq('id', section.exam_id)

    return { success: true }
  } catch (error: any) {
    console.error("Delete Chapter Error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Deletes an entire exam and all its associated data (Manual Cascade).
 */
export async function deleteExamAction(examId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    },
  })

  try {
    // 1. Get all sections
    const { data: sections } = await supabase.from('exam_sections').select('id').eq('exam_id', examId)
    const sectionIds = sections?.map(s => s.id) || []

    // 2. Delete Chapter-level dependencies
    if (sectionIds.length > 0) {
      await supabase.from('exam_notes').delete().in('section_id', sectionIds)
      await supabase.from('exam_progress').delete().in('section_id', sectionIds)
      await supabase.from('question_bank').delete().in('section_id', sectionIds)
      await supabase.from('chapter_frequency').delete().in('section_id', sectionIds)
    }

    // 3. Delete Exam-level dependencies
    await supabase.from('exam_sections').delete().eq('exam_id', examId)
    await supabase.from('uploaded_pdfs').delete().eq('exam_id', examId)
    await supabase.from('mock_exam_results').delete().eq('exam_id', examId)
    await supabase.from('weak_spots').delete().eq('exam_id', examId)

    // 4. Finally delete the exam
    const { error } = await supabase.from('exams').delete().eq('id', examId)
    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Delete Exam Error:", error)
    return { success: false, error: error.message }
  }
}


/**
 * Recalculates frequency stats for all chapters in an exam.
 */
export async function analyzeFrequencyAction(examId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    },
  })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Get total number of distinct years/papers uploaded
    const { data: papers } = await supabase.from('uploaded_pdfs').select('year').eq('exam_id', examId).eq('type', 'past_paper')
    const totalPapers = new Set(papers?.map(p => p.year)).size || 1

    // 2. Get counts per section
    const { data: sections } = await supabase.from('exam_sections').select('id').eq('exam_id', examId)

    for (const section of (sections || [])) {
      const { count } = await supabase.from('question_bank').select('*', { count: 'exact', head: true }).eq('section_id', section.id)

      const frequency_percentage = ((count || 0) / totalPapers) * 100

      await supabase.from('chapter_frequency').upsert({
        user_id: user.id,
        exam_id: examId,
        section_id: section.id,
        appearance_count: count || 0,
        total_papers_analysed: totalPapers,
        frequency_percentage: frequency_percentage,
        last_computed_at: new Date().toISOString()
      }, { onConflict: 'exam_id,section_id' })
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Clones an existing exam structure (sections & subsections) into a new exam.
 */
export async function cloneExamAction(sourceExamId: string, newName?: string) {
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
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Fetch Source
    const { data: sourceExam } = await supabase.from('exams').select('*').eq('id', sourceExamId).single()
    const { data: sourceSections } = await supabase.from('exam_sections').select('*').eq('exam_id', sourceExamId).order('order_index', { ascending: true })

    if (!sourceExam) throw new Error("Source exam not found")

    // 2. Create New Exam
    const { data: newExam, error: examError } = await supabase.from('exams').insert({
      user_id: user.id,
      name: newName || `${sourceExam.name} (Clone)`,
      category: sourceExam.category,
      total_sections: sourceExam.total_sections,
      is_template: false
    }).select().single()

    if (examError) throw examError

    // 3. Clone Sections
    if (sourceSections && sourceSections.length > 0) {
      const sectionsToInsert = sourceSections.map(s => ({
        exam_id: newExam.id,
        user_id: user.id,
        section_number: s.section_number,
        title: s.title,
        subsections: s.subsections,
        order_index: s.order_index
      }))

      const { error: sectionError } = await supabase.from('exam_sections').insert(sectionsToInsert)
      if (sectionError) throw sectionError
    }

    return { success: true, newExamId: newExam.id }
  } catch (error: any) {
    console.error("Clone Error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Marks an exam as a template.
 */
export async function saveAsTemplateAction(examId: string) {
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
    const { error } = await supabase.from('exams').update({ is_template: true }).eq('id', examId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}




