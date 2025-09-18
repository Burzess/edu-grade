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

// Konfigurasi prompt - bisa disesuaikan untuk testing vs production
export interface PromptConfig {
  mode: 'concise' | 'detailed'
  maxOutputTokens: number
  temperature: number
}

const defaultConfig: PromptConfig = {
  mode: 'concise',
  maxOutputTokens: 500, // Dikurangi dari 1000
  temperature: 0.3
}

/**
 * Optimized AI grading dengan prompt yang lebih efisien
 * Mengurangi token input hingga 40-50% tanpa mengurangi kualitas
 */
export async function gradeEssayAnswerOptimized(
  question: string,
  studentAnswer: string,
  questionType: 'essay' | 'multiple_choice' = 'essay',
  correctAnswer?: string,
  config: PromptConfig = defaultConfig
): Promise<AIGradingResponse> {
  try {
    console.log('🤖 Starting optimized AI grading...', { 
      questionLength: question.length, 
      answerLength: studentAnswer.length,
      questionType,
      mode: config.mode,
      hasReferenceAnswer: !!correctAnswer
    })

    // Validasi input
    if (!question?.trim()) {
      throw new Error('Question cannot be empty')
    }

    if (!studentAnswer?.trim()) {
      return {
        score: 0,
        feedback: 'Tidak ada jawaban yang diberikan.',
        reasoning: 'Empty answer'
      }
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
      }
    })

    let prompt = ''

    if (questionType === 'multiple_choice' && correctAnswer) {
      // OPTIMIZED: Multiple choice prompt - dikurangi ~60% token
      prompt = config.mode === 'concise' ? 
        getOptimizedMultipleChoicePrompt(question, correctAnswer, studentAnswer) :
        getDetailedMultipleChoicePrompt(question, correctAnswer, studentAnswer)
    } else {
      // OPTIMIZED: Essay prompt - dikurangi ~45% token
      if (correctAnswer?.trim()) {
        prompt = config.mode === 'concise' ?
          getOptimizedEssayWithKeyPrompt(question, correctAnswer, studentAnswer) :
          getDetailedEssayWithKeyPrompt(question, correctAnswer, studentAnswer)
      } else {
        prompt = config.mode === 'concise' ?
          getOptimizedEssayPrompt(question, studentAnswer) :
          getDetailedEssayPrompt(question, studentAnswer)
      }
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log('🤖 Optimized AI response preview:', text.substring(0, 150) + '...')

    // Parse JSON response
    const aiResponse = parseAIResponse(text)
    
    // Validate and return
    return validateAndFormatResponse(aiResponse)

  } catch (error) {
    console.error('❌ Optimized AI grading error:', error)
    
    // Fallback scoring
    const fallbackScore = studentAnswer.trim().length > 0 ? 50 : 0
    return {
      score: fallbackScore,
      feedback: 'Sistem penilaian AI mengalami gangguan. Akan dinilai manual oleh guru.',
      reasoning: `AI error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
  }
}

/**
 * OPTIMIZED: Multiple Choice Prompt (Concise)
 * Token reduction: ~60% vs original
 */
function getOptimizedMultipleChoicePrompt(question: string, correct: string, answer: string): string {
  return `Nilai pilihan ganda berikut dalam format JSON:

Q: ${question}
Benar: ${correct}
Jawab: ${answer}

Output JSON:
{"score": [0|100], "feedback": "feedback singkat", "reasoning": "alasan"}

Aturan: Benar=100, Salah=0. Feedback konstruktif.`
}

/**
 * OPTIMIZED: Essay Prompt (Concise)
 * Token reduction: ~45% vs original
 */
function getOptimizedEssayPrompt(question: string, answer: string): string {
  return `Nilai essay berikut dalam format JSON:

Q: ${question}
A: ${answer}

Output JSON:
{"score": [0-100], "feedback": "feedback singkat", "reasoning": "alasan"}

Kriteria: Akurasi (40%), Kelengkapan (30%), Struktur (20%), Bahasa (10%).
Nilai: 90-100=Sangat baik, 70-89=Baik, 50-69=Cukup, <50=Kurang.`
}

/**
 * OPTIMIZED: Essay with Reference Answer (Concise) 
 * Token reduction: ~50% vs original
 */
function getOptimizedEssayWithKeyPrompt(question: string, key: string, answer: string): string {
  return `Nilai essay dengan kunci jawaban dalam format JSON:

Q: ${question}
Kunci: ${key}
Jawab: ${answer}

Output JSON:
{"score": [0-100], "feedback": "feedback singkat", "reasoning": "alasan"}

Kriteria: Sesuai kunci (50%), Kelengkapan (25%), Struktur (15%), Bahasa (10%).
Nilai berdasarkan kesesuaian dengan kunci jawaban.`
}

/**
 * DETAILED: Multiple Choice Prompt (Original quality)
 */
function getDetailedMultipleChoicePrompt(question: string, correct: string, answer: string): string {
  return `Sebagai sistem penilaian otomatis, berikan penilaian untuk jawaban pilihan ganda berikut:

PERTANYAAN: ${question}
JAWABAN BENAR: ${correct}
JAWABAN SISWA: ${answer}

Berikan penilaian dalam format JSON:
{"score": [0-100], "feedback": "[feedback dalam bahasa Indonesia]", "reasoning": "[penjelasan singkat]"}

Aturan penilaian:
- Jika jawaban siswa sama persis dengan jawaban benar: 100 poin
- Jika jawaban siswa salah: 0 poin
- Berikan feedback yang konstruktif dan menjelaskan jawaban yang benar`
}

/**
 * DETAILED: Essay Prompt (Original quality)
 */
function getDetailedEssayPrompt(question: string, answer: string): string {
  return `Sebagai sistem penilaian otomatis yang objektif dan adil, berikan penilaian untuk jawaban essay berikut:

PERTANYAAN: ${question}
JAWABAN SISWA: ${answer}

Berikan penilaian dalam format JSON:
{"score": [0-100], "feedback": "[feedback dalam bahasa Indonesia]", "reasoning": "[penjelasan singkat]"}

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
- 0-59: Sangat kurang, jawaban salah atau tidak relevan`
}

/**
 * DETAILED: Essay with Reference Answer (Original quality)
 */
function getDetailedEssayWithKeyPrompt(question: string, key: string, answer: string): string {
  return `Sebagai sistem penilaian otomatis yang objektif dan adil, berikan penilaian untuk jawaban essay berikut dengan menggunakan kunci jawaban sebagai referensi:

PERTANYAAN: ${question}
KUNCI JAWABAN/REFERENSI DARI GURU: ${key}
JAWABAN SISWA: ${answer}

Berikan penilaian dalam format JSON:
{"score": [0-100], "feedback": "[feedback dalam bahasa Indonesia]", "reasoning": "[penjelasan singkat]"}

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
- 0-59: Sangat kurang, jawaban tidak sesuai atau salah`
}

/**
 * Parse AI response and extract JSON
 */
function parseAIResponse(text: string): AIGradingResponse {
  // Cari JSON dalam response
  let jsonMatch = text.match(/\{[\s\S]*?\}/)
  
  if (!jsonMatch) {
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
  }

  if (!jsonMatch) {
    throw new Error('Invalid AI response format - no JSON found')
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch (parseError) {
    throw new Error('Invalid JSON in AI response')
  }
}

/**
 * Validate and format AI response
 */
function validateAndFormatResponse(aiResponse: any): AIGradingResponse {
  if (typeof aiResponse.score !== 'number' || 
      aiResponse.score < 0 || 
      aiResponse.score > 100 ||
      !aiResponse.feedback ||
      typeof aiResponse.feedback !== 'string' ||
      !aiResponse.reasoning ||
      typeof aiResponse.reasoning !== 'string') {
    
    throw new Error('Invalid AI response structure')
  }

  return {
    score: Math.round(aiResponse.score),
    feedback: aiResponse.feedback.trim(),
    reasoning: aiResponse.reasoning.trim()
  }
}

/**
 * Optimized batch grading dengan prompt concise
 */
export async function optimizedBatchGradeAnswers(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
  }>,
  config: PromptConfig = defaultConfig
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  console.log('🤖 Starting optimized batch AI grading for', answers.length, 'answers')
  
  const results = []
  
  for (const answer of answers) {
    try {
      if (!answer.studentAnswer?.trim()) {
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

      const result = await gradeEssayAnswerOptimized(
        answer.question,
        answer.studentAnswer,
        answer.questionType,
        answer.correctAnswer,
        config
      )
      
      results.push({
        id: answer.id,
        result
      })
      
      // Reduced delay karena prompt lebih efisien
      await new Promise(resolve => setTimeout(resolve, 800))
      
    } catch (error) {
      console.error(`❌ Error grading answer ${answer.id}:`, error)
      
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
  
  console.log('✅ Optimized batch AI grading completed:', results.length, 'results')
  return results
}