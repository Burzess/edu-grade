// import { GoogleGenerativeAI } from '@google/generative-ai'
import { OpenAI } from 'openai'

// if (!process.env.GEMINI_API_KEY) {
//   throw new Error('GEMINI_API_KEY is not set in environment variables')
// }

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables')
}

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface AIGradingResponse {
  score: number // 0-100
  feedback: string
  reasoning: string
}

export async function gradeEssayAnswer(
  question: string,
  studentAnswer: string,
  questionType: 'essay' | 'multiple_choice' = 'essay',
  correctAnswer?: string
): Promise<AIGradingResponse> {
  try {
    console.log('Starting AI grading...', { 
      questionLength: question.length, 
      answerLength: studentAnswer.length,
      questionType,
      hasReferenceAnswer: !!correctAnswer
    })

    // Validasi input
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty')
    }

    if (!studentAnswer || studentAnswer.trim().length === 0) {
      return {
        score: 0,
        feedback: 'Tidak ada jawaban yang diberikan.',
        reasoning: 'Empty answer provided'
      }
    }

    // const model = genAI.getGenerativeModel({ 
    //   model: 'gemini-1.5-flash',
    //   generationConfig: {
    //     temperature: 0.3,
    //     maxOutputTokens: 1000,
    //   }
    // })

    let prompt = ''

    if (questionType === 'multiple_choice' && correctAnswer) {
      // For multiple choice questions
      prompt = `
        Sebagai sistem penilaian otomatis, berikan penilaian untuk jawaban pilihan ganda berikut:

        PERTANYAAN:
        ${question}

        JAWABAN BENAR:
        ${correctAnswer}

        JAWABAN SISWA:
        ${studentAnswer}

        Berikan penilaian dalam format JSON dengan struktur berikut:
        {
          "score": [0-100],
          "feedback": "[feedback dalam bahasa Indonesia]",
          "reasoning": "[penjelasan singkat mengapa mendapat nilai tersebut]"
        }

        Aturan penilaian:
        - Jika jawaban siswa sama persis dengan jawaban benar: 100 poin
        - Jika jawaban siswa salah: 0 poin
        - Berikan feedback yang konstruktif dan menjelaskan jawaban yang benar
        `
    } else {
      // For essay questions - dengan atau tanpa reference answer
      if (correctAnswer && correctAnswer.trim().length > 0) {
        // Essay dengan reference answer dari guru
        prompt = `
        Sebagai sistem penilaian otomatis yang objektif dan adil, berikan penilaian untuk jawaban essay berikut dengan menggunakan kunci jawaban sebagai referensi:

        PERTANYAAN:
        ${question}

        KUNCI JAWABAN/REFERENSI DARI GURU:
        ${correctAnswer}

        JAWABAN SISWA:
        ${studentAnswer}

        Berikan penilaian dalam format JSON dengan struktur berikut:
        {
          "score": [0-100],
          "feedback": "[feedback dalam bahasa Indonesia]",
          "reasoning": "[penjelasan singkat mengapa mendapat nilai tersebut]"
        }

        Kriteria penilaian dengan referensi:
        1. Kesesuaian dengan kunci jawaban (50%)
        2. Kelengkapan jawaban dibanding referensi (25%) 
        3. Kejelasan dan struktur (15%)
        4. Penggunaan bahasa (10%)

        Pedoman nilai:
        - 90-100: Sangat baik, jawaban sesuai atau melebihi kunci jawaban
        - 80-89: Baik, jawaban mencakup sebagian besar poin kunci
        - 70-79: Cukup, jawaban mencakup poin utama dari kunci jawaban
        - 60-69: Kurang, jawaban hanya mencakup sebagian kecil kunci jawaban
        - 0-59: Sangat kurang, jawaban tidak sesuai atau salah

        PENTING: Gunakan kunci jawaban sebagai panduan utama, tapi tetap berikan nilai untuk jawaban yang benar meskipun berbeda redaksi. Berikan feedback konstruktif yang membandingkan jawaban siswa dengan kunci jawaban.
        `
      } else {
        // Essay tanpa reference answer (cara lama)
        prompt = `
        Sebagai sistem penilaian otomatis yang objektif dan adil, berikan penilaian untuk jawaban essay berikut:

        PERTANYAAN:
        ${question}

        JAWABAN SISWA:
        ${studentAnswer}

        Berikan penilaian dalam format JSON dengan struktur berikut:
        {
          "score": [0-100],
          "feedback": "[feedback dalam bahasa Indonesia]",
          "reasoning": "[penjelasan singkat mengapa mendapat nilai tersebut]"
        }

        Kriteria penilaian:
        1. Keakuratan dan relevansi (40%)
        2. Kelengkapan jawaban (30%) 
        3. Kejelasan dan struktur (20%)
        4. Penggunaan bahasa (10%)

        Pedoman nilai:
        - 90-100: Sangat baik, jawaban lengkap dan akurat
        - 80-89: Baik, jawaban cukup lengkap dengan sedikit kekurangan
        - 70-79: Cukup, jawaban menunjukkan pemahaman dasar
        - 60-69: Kurang, jawaban tidak lengkap atau kurang akurat
        - 0-59: Sangat kurang, jawaban salah atau tidak relevan

        Jawaban kosong atau sangat singkat (kurang dari 5 kata) mendapat nilai 0.
        Berikan feedback yang konstruktif dan spesifik untuk membantu siswa belajar.
        `
      }
    }

    const result = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    const text = result.choices[0]?.message?.content || ''

    console.log('Raw AI response:', text.substring(0, 200) + '...')

    // Cari JSON dalam response dengan lebih fleksibel
    let jsonMatch = text.match(/\{[\s\S]*?\}/)
    
    // Jika tidak ada JSON, coba bersihkan dan cari lagi
    if (!jsonMatch) {
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    }

    if (!jsonMatch) {
      console.error('No valid JSON found in AI response:', text)
      throw new Error('Invalid AI response format - no JSON found')
    }

    let aiResponse: AIGradingResponse
    try {
      aiResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Raw JSON:', jsonMatch[0])
      throw new Error('Invalid JSON in AI response')
    }
    
    // Validate response structure
    if (typeof aiResponse.score !== 'number' || 
        aiResponse.score < 0 || 
        aiResponse.score > 100 ||
        !aiResponse.feedback ||
        typeof aiResponse.feedback !== 'string' ||
        !aiResponse.reasoning ||
        typeof aiResponse.reasoning !== 'string') {
      
      console.error('Invalid AI response structure:', aiResponse)
      throw new Error('Invalid AI response structure')
    }

    // Ensure score is integer
    aiResponse.score = Math.round(aiResponse.score)

    console.log('AI grading completed:', {
      score: aiResponse.score,
      feedbackLength: aiResponse.feedback.length,
      reasoningLength: aiResponse.reasoning.length
    })

    return aiResponse

  } catch (error: unknown) {
    console.error('AI grading error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      question: question.substring(0, 100) + '...',
      answer: studentAnswer.substring(0, 100) + '...'
    })
    
    // Fallback scoring
    const fallbackScore = studentAnswer.trim().length > 0 ? 50 : 0
    return {
      score: fallbackScore,
      feedback: 'Sistem penilaian AI mengalami gangguan. Jawaban Anda telah tersimpan dan akan dinilai manual oleh guru.',
      reasoning: `Fallback scoring due to AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// HYBRID BATCH GRADING: Optimasi untuk mengurangi biaya dengan batching cerdas
export async function batchGradeAnswers(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
  }>
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  console.log('Starting batch AI grading for', answers.length, 'answers')
  
  const results = []
  
  // Process answers sequentially to avoid rate limits
  for (const answer of answers) {
    try {
      // Skip empty answers
      if (!answer.studentAnswer || answer.studentAnswer.trim().length === 0) {
        results.push({
          id: answer.id,
          result: {
            score: 0,
            feedback: 'Tidak ada jawaban yang diberikan.',
            reasoning: 'Empty answer'
          }
        })
        continue
      }

      const result = await gradeEssayAnswer(
        answer.question,
        answer.studentAnswer,
        answer.questionType,
        answer.correctAnswer
      )
      
      results.push({
        id: answer.id,
        result
      })
      
      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1500))
      
    } catch (error: unknown) {
      console.error(`Error grading answer ${answer.id}:`, error)
      
      // Add fallback result
      results.push({
        id: answer.id,
        result: {
          score: answer.studentAnswer.trim().length > 0 ? 50 : 0,
          feedback: 'Terjadi kesalahan dalam penilaian otomatis. Jawaban akan dinilai manual.',
          reasoning: 'AI grading error'
        }
      })
    }
  }
  
  console.log('Batch AI grading completed:', results.length, 'results')
  return results
}

// NEW: Smart Batch Grading - untuk essay serupa bisa digabung dalam 1 request
export async function smartBatchGradeAnswers(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
  }>,
  batchSize: number = 3 // Jumlah jawaban per request (untuk essay serupa)
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  console.log('Starting SMART batch AI grading for', answers.length, 'answers with batch size:', batchSize)
  
  // Group answers by similar questions to optimize batching
  const questionGroups = new Map<string, typeof answers>()
  
  for (const answer of answers) {
    const key = `${answer.question}_${answer.questionType}`
    if (!questionGroups.has(key)) {
      questionGroups.set(key, [])
    }
    questionGroups.get(key)!.push(answer)
  }
  
  const results: Array<{ id: string; result: AIGradingResponse }> = []
  
  // Process each question group
  for (const [questionKey, groupAnswers] of questionGroups) {
    console.log(`Processing ${groupAnswers.length} answers for question group:`, questionKey.substring(0, 50) + '...')
    
    // For essay questions, try smart batching
    if (groupAnswers[0].questionType === 'essay' && groupAnswers.length >= 2) {
      
      // Process in smart batches
      for (let i = 0; i < groupAnswers.length; i += batchSize) {
        const batch = groupAnswers.slice(i, i + batchSize)
        
        try {
          const batchResults = await gradeMultipleEssaysInOneRequest(batch)
          results.push(...batchResults)
        } catch (error: unknown) {
          console.error('Smart batch failed, falling back to individual grading:', error)
          
          // Fallback to individual grading
          for (const answer of batch) {
            try {
              const result = await gradeEssayAnswer(
                answer.question,
                answer.studentAnswer,
                answer.questionType,
                answer.correctAnswer
              )
              results.push({ id: answer.id, result })
              await new Promise(resolve => setTimeout(resolve, 1000))
            } catch (individualError) {
              results.push({
                id: answer.id,
                result: {
                  score: 50,
                  feedback: 'Terjadi kesalahan dalam penilaian otomatis.',
                  reasoning: 'Fallback scoring'
                }
              })
            }
          }
        }
        
        // Delay between batches
        if (i + batchSize < groupAnswers.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    } else {
      // For multiple choice or single essays, use individual grading
      for (const answer of groupAnswers) {
        try {
          const result = await gradeEssayAnswer(
            answer.question,
            answer.studentAnswer,
            answer.questionType,
            answer.correctAnswer
          )
          results.push({ id: answer.id, result })
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error: unknown) {
          results.push({
            id: answer.id,
            result: {
              score: answer.studentAnswer.trim().length > 0 ? 50 : 0,
              feedback: 'Terjadi kesalahan dalam penilaian otomatis.',
              reasoning: 'AI grading error'
            }
          })
        }
      }
    }
  }
  
  console.log('Smart batch AI grading completed:', results.length, 'results')
  return results
}

// NEW: Grade multiple essays in one request (untuk essay dengan pertanyaan yang sama)
async function gradeMultipleEssaysInOneRequest(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
  }>
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  
  if (answers.length === 0) return []
  
  // const model = genAI.getGenerativeModel({ 
  //   model: 'gemini-1.5-flash',
  //   generationConfig: {
  //     temperature: 0.3,
  //     maxOutputTokens: 2000, // Increased for multiple responses
  //   }
  // })

  // Create batch prompt for multiple essays
  const question = answers[0].question
  const studentAnswers = answers.map((ans, index) => 
    `JAWABAN ${index + 1} (ID: ${ans.id}):\n${ans.studentAnswer}`
  ).join('\n\n')

  const prompt = `
    Sebagai sistem penilaian otomatis, berikan penilaian untuk ${answers.length} jawaban essay berikut dengan pertanyaan yang sama:

    PERTANYAAN:
    ${question}

    ${studentAnswers}

    Berikan penilaian untuk SETIAP jawaban dalam format JSON array berikut:
    [
      {
        "id": "jawaban_id_1",
        "score": [0-100],
        "feedback": "[feedback dalam bahasa Indonesia]",
        "reasoning": "[penjelasan singkat]"
      },
      {
        "id": "jawaban_id_2",
        "score": [0-100],
        "feedback": "[feedback dalam bahasa Indonesia]",
        "reasoning": "[penjelasan singkat]"
      }
    ]

    Kriteria penilaian:
    1. Keakuratan dan relevansi (40%)
    2. Kelengkapan jawaban (30%) 
    3. Kejelasan dan struktur (20%)
    4. Penggunaan bahasa (10%)

    PENTING: Berikan penilaian yang objektif dan konsisten untuk semua jawaban.
    `

  const result = await openai.chat.completions.create({
    model: "google/gemini-2.0-flash-exp:free",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })

  const text = result.choices[0]?.message?.content || ''

  console.log('Smart batch AI response preview:', text.substring(0, 300) + '...')

  // Parse JSON array response
  let jsonMatch = text.match(/\[[\s\S]*\]/)
  
  if (!jsonMatch) {
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
  }

  if (!jsonMatch) {
    throw new Error('Invalid batch AI response format - no JSON array found')
  }

  let batchResults: Array<{id: string, score: number, feedback: string, reasoning: string}>
  try {
    batchResults = JSON.parse(jsonMatch[0])
  } catch (parseError) {
    console.error('Failed to parse batch JSON:', parseError)
    throw new Error('Invalid JSON in batch AI response')
  }

  // Validate and format results
  const formattedResults: Array<{ id: string; result: AIGradingResponse }> = []
  
  for (const answer of answers) {
    const aiResult = batchResults.find(r => r.id === answer.id)
    
    if (aiResult && typeof aiResult.score === 'number' && aiResult.score >= 0 && aiResult.score <= 100) {
      formattedResults.push({
        id: answer.id,
        result: {
          score: Math.round(aiResult.score),
          feedback: aiResult.feedback || 'Feedback tidak tersedia',
          reasoning: aiResult.reasoning || 'Reasoning tidak tersedia'
        }
      })
    } else {
      // Fallback if result not found or invalid
      formattedResults.push({
        id: answer.id,
        result: {
          score: 50,
          feedback: 'Penilaian batch tidak berhasil, menggunakan penilaian fallback.',
          reasoning: 'Batch grading fallback'
        }
      })
    }
  }

  console.log(`Smart batch processed ${formattedResults.length} answers successfully`)
  return formattedResults
}
