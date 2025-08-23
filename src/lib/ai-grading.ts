import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

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
    console.log('🤖 Starting AI grading...', { 
      questionLength: question.length, 
      answerLength: studentAnswer.length,
      questionType 
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

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    })

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
      // For essay questions
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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log('🤖 Raw AI response:', text.substring(0, 200) + '...')

    // Cari JSON dalam response dengan lebih fleksibel
    let jsonMatch = text.match(/\{[\s\S]*?\}/)
    
    // Jika tidak ada JSON, coba bersihkan dan cari lagi
    if (!jsonMatch) {
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    }

    if (!jsonMatch) {
      console.error('❌ No valid JSON found in AI response:', text)
      throw new Error('Invalid AI response format - no JSON found')
    }

    let aiResponse: AIGradingResponse
    try {
      aiResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError, 'Raw JSON:', jsonMatch[0])
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
      
      console.error('❌ Invalid AI response structure:', aiResponse)
      throw new Error('Invalid AI response structure')
    }

    // Ensure score is integer
    aiResponse.score = Math.round(aiResponse.score)

    console.log('✅ AI grading completed:', {
      score: aiResponse.score,
      feedbackLength: aiResponse.feedback.length,
      reasoningLength: aiResponse.reasoning.length
    })

    return aiResponse

  } catch (error) {
    console.error('❌ AI grading error:', {
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

export async function batchGradeAnswers(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
  }>
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  console.log('🤖 Starting batch AI grading for', answers.length, 'answers')
  
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
      
    } catch (error) {
      console.error(`❌ Error grading answer ${answer.id}:`, error)
      
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
  
  console.log('✅ Batch AI grading completed:', results.length, 'results')
  return results
}
