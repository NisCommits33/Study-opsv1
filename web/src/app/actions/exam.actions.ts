/**
 * @file exam.actions.ts
 * @description Server actions for exam and knowledge base management.
 * 
 * @author Study Ops Engineering
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { chatAction } from './ai.actions'

/**
 * Extracts chapters and subtopics from a syllabus PDF using AI.
 * 
 * @param {string} examId - The ID of the exam.
 * @param {string} storagePath - The path to the PDF in Supabase Storage.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function extractChaptersAction(examId: string, storagePath: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for backend file access
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  try {
    // 1. Download PDF from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('study-materials')
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`)
    }

    // 2. Parse PDF Text using pdf-parse v2 (PDFParse class API)
    // Dynamic import avoids Turbopack bundling issues
    const { PDFParse } = await import('pdf-parse')
    const arrayBuf = await fileData.arrayBuffer()
    const parser = new PDFParse({ data: new Uint8Array(arrayBuf) })
    const textResult = await parser.getText()
    const text = textResult.text
    await parser.destroy()

    if (!text || text.trim().length < 100) {
      throw new Error("Could not extract enough text from the PDF. Please ensure it is a valid syllabus.")
    }

    // 3. AI Analysis
    const prompt = `
      You are an expert academic organizer. I will provide you with the text of a syllabus.
      Your task is to extract a structured list of chapters and their major subtopics.
      
      RULES:
      1. Group by major Chapters or Sections.
      2. For each Chapter, include a list of Subtopics.
      3. Return ONLY a JSON object in this format:
         {
           "chapters": [
             {
               "number": "1",
               "title": { "en": "English Title", "np": "Nepali Title (if applicable, else same as en)" },
               "subtopics": [
                 { "title": { "en": "Subtopic Title", "np": "..." } }
               ]
             }
           ]
         }
      4. Ensure the output is valid JSON and nothing else.
      
      SYLLABUS TEXT:
      ${text.substring(0, 8000)} // Truncate to stay within context limits
    `

    const aiResponse = await chatAction([{ role: 'user', content: prompt }], 'complex', true)
    
    let extractedData;
    try {
      // Find the first '{' and last '}' to extract JSON even if AI adds extra text
      const start = aiResponse.text.indexOf('{')
      const end = aiResponse.text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error("No JSON found")
      const jsonStr = aiResponse.text.substring(start, end + 1)
      extractedData = JSON.parse(jsonStr)
    } catch (err) {
      console.error("AI returned invalid JSON. Raw output:", aiResponse.text)
      throw new Error("AI failed to generate a valid chapter structure. The response was not in the expected format.")
    }

    if (!extractedData.chapters || !Array.isArray(extractedData.chapters)) {
      throw new Error("AI could not find chapters in the provided text.")
    }

    // 4. Save to Database
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Delete existing sections for this exam to avoid duplicates on re-upload
    await supabase.from('exam_sections').delete().eq('exam_id', examId)

    const sectionsToInsert = extractedData.chapters.map((ch: any, idx: number) => ({
      exam_id: examId,
      user_id: user.id,
      section_number: ch.number,
      title: ch.title,
      subsections: ch.subtopics,
      order_index: idx
    }))

    const { error: insertError } = await supabase.from('exam_sections').insert(sectionsToInsert)
    if (insertError) throw insertError

    // Update exam section count
    await supabase.from('exams').update({ total_sections: sectionsToInsert.length }).eq('id', examId)

    return { success: true }

  } catch (error: any) {
    console.error('Extraction Action Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Extracts chapters and subtopics from raw text (Fallback for PDF failure).
 */
export async function extractChaptersFromTextAction(examId: string, text: string) {
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
    if (!text || text.trim().length < 50) {
      throw new Error("Text is too short to be a valid syllabus.")
    }

    const prompt = `
      You are an expert academic organizer. I will provide you with text from a syllabus.
      Your task is to extract a structured list of chapters and their major subtopics.
      
      RULES:
      1. Group by major Chapters or Sections.
      2. For each Chapter, include a list of Subtopics.
      3. Return ONLY a JSON object in this format:
         {
           "chapters": [
             {
               "number": "1",
               "title": { "en": "English Title", "np": "Nepali Title" },
               "subtopics": [
                 { "title": { "en": "Subtopic Title", "np": "..." } }
               ]
             }
           ]
         }
      4. Ensure the output is valid JSON and nothing else.
      
      SYLLABUS TEXT:
      ${text.substring(0, 8000)}
    `

    const aiResponse = await chatAction([{ role: 'user', content: prompt }], 'complex', true)
    
    let extractedData;
    try {
      const start = aiResponse.text.indexOf('{')
      const end = aiResponse.text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error("No JSON found")
      const jsonStr = aiResponse.text.substring(start, end + 1)
      extractedData = JSON.parse(jsonStr)
    } catch (err) {
      console.error("AI Chapter Extraction Error. Raw output:", aiResponse.text)
      throw new Error("AI failed to generate a valid chapter structure.")
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    await supabase.from('exam_sections').delete().eq('exam_id', examId)

    const sectionsToInsert = extractedData.chapters.map((ch: any, idx: number) => ({
      exam_id: examId,
      user_id: user.id,
      section_number: ch.number,
      title: ch.title,
      subsections: ch.subtopics,
      order_index: idx
    }))

    const { error: insertError } = await supabase.from('exam_sections').insert(sectionsToInsert)
    if (insertError) throw insertError

    await supabase.from('exams').update({ total_sections: sectionsToInsert.length }).eq('id', examId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}


/**
 * Ingests content into a specific chapter from a file (PDF/DOCX) or raw text.
 * This is the "Content Engine" that converts study materials into polished docs.
 */
export async function ingestChapterContentAction(
  sectionId: string, 
  source: { type: 'file' | 'text', path?: string, content?: string }
) {
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
    let extractedText = ""

    // 1. Extract Text
    if (source.type === 'file' && source.path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('study-materials')
        .download(source.path)

      if (downloadError || !fileData) throw new Error(`Failed to download file: ${downloadError?.message}`)

      const fileExt = source.path.split('.').pop()?.toLowerCase()
      const arrayBuf = await fileData.arrayBuffer()

      if (fileExt === 'pdf') {
        const { PDFParse } = await import('pdf-parse')
        const parser = new PDFParse({ data: new Uint8Array(arrayBuf) })
        const textResult = await parser.getText()
        extractedText = textResult.text
        await parser.destroy()
      } else if (fileExt === 'docx') {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuf) })
        extractedText = result.value
      } else {
        throw new Error("Unsupported file format. Please upload PDF or DOCX.")
      }
    } else if (source.type === 'text' && source.content) {
      extractedText = source.content
    } else {
      throw new Error("Invalid source provided.")
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("Extracted text is too short or empty.")
    }

    // 2. AI Formatting to Documentation Style
    const prompt = `
      You are a world-class educational content creator. I will provide you with raw text from a textbook or notes.
      Your task is to transform this text into a polished, high-quality documentation page (GitBook style).
      
      RULES:
      1. Use Markdown for formatting (headings, lists, bold text).
      2. Group content into logical sections with clear ## Headings.
      3. Simplify complex concepts but maintain academic depth.
      4. Use tables or code blocks where appropriate.
      5. Translate the content into BOTH English and Nepali if possible.
      
      RETURN FORMAT:
      A JSON object with:
      {
        "en": "Markdown content in English",
        "np": "Markdown content in Nepali (High quality translation)"
      }

      RAW TEXT:
      ${extractedText.substring(0, 10000)}
    `

    const aiResponse = await chatAction([{ role: 'user', content: prompt }], 'complex', true)
    
    let formattedContent;
    try {
      const start = aiResponse.text.indexOf('{')
      const end = aiResponse.text.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error("No JSON found")
      const jsonStr = aiResponse.text.substring(start, end + 1)
      formattedContent = JSON.parse(jsonStr)
    } catch (err) {
      console.error("AI Formatting Error. Raw output:", aiResponse.text)
      throw new Error("AI failed to format the documentation. The response was not in a valid format.")
    }

    // 3. Save to exam_notes
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check if note exists
    const { data: existingNote } = await supabase
      .from('exam_notes')
      .select('id')
      .eq('section_id', sectionId)
      .single()

    const notePayload = {
      section_id: sectionId,
      user_id: user.id,
      content: formattedContent,
      word_count: {
        en: formattedContent.en.split(/\s+/).length,
        np: formattedContent.np.split(/\s+/).length
      },
      last_edited_at: new Date().toISOString()
    }

    if (existingNote) {
      const { error: updateError } = await supabase
        .from('exam_notes')
        .update(notePayload)
        .eq('id', existingNote.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from('exam_notes')
        .insert(notePayload)
      if (insertError) throw insertError
    }

    return { success: true, content: formattedContent }

  } catch (error: any) {
    console.error('Ingestion Action Error:', error)
    return { success: false, error: error.message }
  }
}

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
 * Extracts questions from a past paper PDF and maps them to chapters.
 */
export async function extractQuestionsFromPaperAction(examId: string, storagePath: string, year: string) {
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

    // 1. Download and Parse
    const { data: fileData, error: downloadError } = await supabase.storage.from('study-materials').download(storagePath)
    if (downloadError || !fileData) throw new Error(`Failed to download: ${downloadError?.message}`)

    const { PDFParse } = await import('pdf-parse')
    const arrayBuf = await fileData.arrayBuffer()
    const parser = new PDFParse({ data: new Uint8Array(arrayBuf) })
    const textResult = await parser.getText()
    const text = textResult.text
    await parser.destroy()

    if (!text || text.trim().length < 100) throw new Error("Text extraction failed")

    // 2. Get existing sections for mapping
    const { data: sections } = await supabase.from('exam_sections').select('id, section_number, title').eq('exam_id', examId)
    const sectionContext = sections?.map(s => `ID: ${s.id}, Ch: ${s.section_number}, Title: ${s.title.en}`).join('\n')

    // 3. AI Extraction
    const prompt = `
      You are an expert examiner. I will provide you with text from a past exam paper.
      Your task is to extract every question and map it to one of the provided chapters.
      
      EXISTING CHAPTERS:
      ${sectionContext}
      
      RULES:
      1. Extract the full question text.
      2. Identify the likely marks/weightage if mentioned.
      3. Map the question to the MOST RELEVANT Chapter ID from the list above.
      4. Return ONLY a JSON array in this format:
         [
           {
             "question": { "en": "Question text...", "np": "Optional translation" },
             "section_id": "MATCHING_CHAPTER_ID",
             "marks": 5,
             "type": "short"
           }
         ]
      5. If a question doesn't match any chapter, use null for section_id.
      
      PAST PAPER TEXT:
      ${text.substring(0, 8000)}
    `

    const aiResponse = await chatAction([{ role: 'user', content: prompt }], 'complex', true)
    
    let questions;
    try {
      const start = aiResponse.text.indexOf('[')
      const end = aiResponse.text.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error("No JSON array found")
      questions = JSON.parse(aiResponse.text.substring(start, end + 1))
    } catch (err) {
      throw new Error("AI failed to extract questions in valid JSON format.")
    }

    // 4. Save to Database
    const paperRecord = {
      user_id: user.id,
      exam_id: examId,
      type: 'past_paper',
      file_name: storagePath.split('/').pop(),
      storage_path: storagePath,
      year: year,
      processing_status: 'done'
    }
    const { data: paper } = await supabase.from('uploaded_pdfs').insert(paperRecord).select().single()

    const questionsToInsert = questions.map((q: any) => ({
      user_id: user.id,
      exam_id: examId,
      section_id: q.section_id,
      source_pdf_id: paper?.id,
      question: q.question,
      marks: q.marks,
      type: q.type,
      year: year,
      source: 'past_paper'
    }))

    const { error: qError } = await supabase.from('question_bank').insert(questionsToInsert)
    if (qError) throw qError

    // 5. Update Frequency Stats
    await analyzeFrequencyAction(examId)

    return { success: true, count: questionsToInsert.length }
  } catch (error: any) {
    console.error('Past Paper Extraction Error:', error)
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




