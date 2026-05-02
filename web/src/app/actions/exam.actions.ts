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

    const aiResponse = await chatAction([{ role: 'user', content: prompt }], 'complex')
    
    let extractedData;
    try {
      // Clean up the response if it contains markdown code blocks
      const jsonStr = aiResponse.text.replace(/```json|```/g, '').trim()
      extractedData = JSON.parse(jsonStr)
    } catch (err) {
      console.error("AI returned invalid JSON:", aiResponse.text)
      throw new Error("AI failed to generate a valid chapter structure. Please try again.")
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
