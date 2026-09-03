import { OpenAI } from 'openai'
import { gradeEssayAnswer } from '@/lib/ai-grading'
import { logger } from '@/lib/logger'
import { parseAIResponse as parseResponse } from '@/lib/grading/parse-response'

const isDebug = process.env.AI_GRADING_DEBUG === 'true'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables')
    }
    _openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }
  return _openai
}

const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as any)[prop]
  }
})

export interface AIGradingResponse {
  score: number | null // 0-100 or null if pending manual grading
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
  mode: 'detailed',
  maxOutputTokens: 2000,
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
  config: PromptConfig = defaultConfig,
  retryCount: number = 0,
  rubric?: string
): Promise<AIGradingResponse> {
  const maxRetries = 2 // Maximum retry attempts

  try {
    if (isDebug) {
      logger.debug('Starting optimized AI grading...', { 
        questionLength: question.length, 
        answerLength: studentAnswer.length,
        questionType,
        mode: config.mode,
        hasReferenceAnswer: !!correctAnswer,
        retryAttempt: retryCount
      })
    }

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

    // OpenAI configuration - using Google Gemini through OpenRouter for consistency
    const openaiConfig = {
      model: "google/gemini-3-flash-preview",
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      top_p: 0.95, // ENHANCED: More focused responses
      // Note: OpenAI API doesn't support topK, candidateCount, or stopSequences in the same way as Gemini
    }

    if (questionType === 'multiple_choice' && correctAnswer) {
      // PENILAIAN LANGSUNG: Pilihan ganda tidak perlu AI, bisa dicocokkan langsung untuk menghemat waktu & token
      const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
      
      if (isDebug) {
        logger.debug('Deterministic grading for multiple choice:', { isCorrect })
      }
      return {
        score: isCorrect ? 100 : 0,
        feedback: isCorrect 
          ? 'Jawaban Anda benar.' 
          : `Jawaban Anda kurang tepat. Jawaban yang benar adalah: ${correctAnswer}`,
        reasoning: 'Penilaian otomatis sistem untuk soal pilihan ganda.'
      }
    }

    let prompt = ''

    // OPTIMIZED: Essay prompt
    if (correctAnswer?.trim()) {
      prompt = config.mode === 'concise' ?
        getOptimizedEssayWithKeyPrompt(question, correctAnswer, studentAnswer) :
        getDetailedEssayWithKeyPrompt(question, correctAnswer, studentAnswer)
    } else {
      prompt = config.mode === 'concise' ?
        getOptimizedEssayPrompt(question, studentAnswer) :
        getDetailedEssayPrompt(question, studentAnswer)
    }

    if (rubric?.trim()) {
      prompt += `\n\nRUBRIK PENILAIAN DARI GURU:\n${rubric}\nHarap gunakan rubrik ini sebagai dasar UTAMA penilaian Anda.`;
    }

    if (isDebug) {
      logger.debug('PROMPT DEBUG - Sending to AI:', {
        promptType: questionType === 'multiple_choice' ? 'Multiple Choice' : 'Essay',
        promptMode: config.mode,
        promptLength: prompt.length,
        hasReferenceAnswer: !!correctAnswer,
        retryAttempt: retryCount
      })
    }
    
    const result = await openai.chat.completions.create({
      model: openaiConfig.model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: openaiConfig.temperature,
      max_tokens: openaiConfig.max_tokens,
      top_p: openaiConfig.top_p,
    })
    
    const text = result.choices[0]?.message?.content || ''

    if (isDebug) {
      logger.debug('AI response received', {
        responseLength: text.length,
        containsJson: text.includes('{'),
        startsWithJson: text.trim().startsWith('{')
      })
    }

    if (isDebug) {
      logger.debug('Optimized AI response preview:', text.substring(0, 150) + '...')
    }

    // Parse JSON response
    const parsed = parseResponse(text)
    if (!parsed.ok) {
      throw new Error(parsed.error)
    }
    return parsed.data

  } catch (error: unknown) {
    logger.error('Optimized AI grading error', {
      code: 'AI_OPTIMIZED_GRADING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
      questionType,
      retryAttempt: retryCount
    })
    
    // ENHANCED: Retry mechanism for any AI errors up to maxRetries (3 attempts total)
    if (retryCount < maxRetries) {
      if (isDebug) {
        logger.debug(`Retrying AI grading (attempt ${retryCount + 1}/${maxRetries + 1})...`)
      }
      
      // Use more conservative config for retry
      const retryConfig: PromptConfig = {
        mode: 'detailed',
        maxOutputTokens: Math.min(config.maxOutputTokens, 1500),
        temperature: Math.max(config.temperature - 0.1, 0.1) // Lower temperature for more consistency
      }
      
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      
      return gradeEssayAnswerOptimized(
        question, 
        studentAnswer, 
        questionType, 
        correctAnswer, 
        retryConfig, 
        retryCount + 1,
        rubric
      )
    }
    
    // Kegagalan permanen setelah 3 kali percobaan
    return {
      score: null,
      feedback: 'Pending Manual Grading - Sistem penilaian AI mengalami gangguan, jawaban akan di nilai oleh guru',
      reasoning: `Sistem penilaian AI mengalami gangguan setelah 3 kali percobaan: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
/**
 * Essay Prompt without token/character truncation
 */
function getOptimizedEssayPrompt(question: string, answer: string): string {
  return `Nilai essay berikut dalam format JSON:

Q: ${question}
A: ${answer}

PENTING: Berikan HANYA JSON yang valid tanpa teks tambahan!

Format JSON yang HARUS digunakan:
{
  "score": [0-100],
  "feedback": "feedback lengkap, jelas, dan konstruktif dalam bahasa Indonesia",
  "reasoning": "penjelasan mendalam mengapa jawaban siswa mendapat nilai tersebut"
}

Kriteria: Akurasi (40%), Kelengkapan (30%), Struktur (20%), Bahasa (10%).
Nilai: 90-100=Sangat baik, 70-89=Baik, 50-69=Cukup, <50=Kurang.`
}

/**
 * Essay with Reference Answer Prompt without token/character truncation
 */
function getOptimizedEssayWithKeyPrompt(question: string, key: string, answer: string): string {
  return `Nilai essay dengan kunci jawaban dalam format JSON:

Q: ${question}
Kunci: ${key}
Jawab: ${answer}

PENTING: Berikan HANYA JSON yang valid tanpa teks tambahan!

Format JSON yang HARUS digunakan:
{
  "score": [0-100],
  "feedback": "feedback lengkap, jelas, dan konstruktif dalam bahasa Indonesia",
  "reasoning": "penjelasan mendalam membandingkan jawaban siswa dengan kunci jawaban"
}

Kriteria: Sesuai kunci (50%), Kelengkapan (25%), Struktur (15%), Bahasa (10%).
Nilai berdasarkan kesesuaian dengan kunci jawaban.`
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
KUNCI JAWABAN: ${key}
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
 * Optimized batch grading dengan prompt concise
 */
export async function optimizedBatchGradeAnswers(
  answers: Array<{
    id: string
    question: string
    studentAnswer: string
    questionType?: 'essay' | 'multiple_choice'
    correctAnswer?: string
    rubric?: string
  }>,
  config: PromptConfig = defaultConfig
): Promise<Array<{ id: string; result: AIGradingResponse }>> {
  if (isDebug) {
    logger.debug('Starting batch AI grading', {
      totalAnswers: answers.length,
      config: config
    })
  }
  
  const results = []
  
  for (const answer of answers) {
    const startTime = Date.now()
    
    if (isDebug) {
      logger.debug(`Batch item ${results.length + 1}/${answers.length}`, {
        id: answer.id,
        questionType: answer.questionType || 'essay',
        isEmpty: !answer.studentAnswer?.trim()
      })
    }
    
    try {
      if (!answer.studentAnswer?.trim()) {
        const emptyResult = {
          score: 0,
          feedback: 'Tidak ada jawaban yang diberikan.',
          reasoning: 'Empty answer'
        }
        
        if (isDebug) logger.debug(`Batch item ${results.length + 1} - Empty answer handled`)
        
        results.push({
          id: answer.id,
          result: emptyResult
        })
        continue
      }

      if (isDebug) logger.debug(`Batch item ${results.length + 1} - Calling AI grading...`)
      
      const result = await gradeEssayAnswerOptimized(
        answer.question,
        answer.studentAnswer,
        answer.questionType,
        answer.correctAnswer,
        config,
        0,
        answer.rubric
      )
      
      const processingTime = Date.now() - startTime
      
      if (isDebug) {
        logger.debug(`Batch item ${results.length + 1} - AI grading completed`, {
          id: answer.id,
          score: result.score,
          processingTimeMs: processingTime
        })
      }
      
      results.push({
        id: answer.id,
        result
      })
      
      // Reduced delay karena prompt lebih efisien
      await new Promise(resolve => setTimeout(resolve, 800))
      
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime
      
      logger.error('Error grading answer in optimized batch', {
        code: 'AI_OPTIMIZED_BATCH_ITEM_FAILED',
        answerId: answer.id,
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      })
      
      const fallbackResult = {
        score: null,
        feedback: 'Pending Manual Grading - Sistem penilaian AI mengalami gangguan, jawaban akan di nilai oleh guru',
        reasoning: 'AI grading error after 3 attempts'
      }
      
      if (isDebug) logger.debug(`Batch item ${results.length + 1} - Using fallback result`)
      
      results.push({
        id: answer.id,
        result: fallbackResult
      })
    }
  }
  
  if (isDebug) {
    logger.debug('Batch grading completed', {
      totalProcessed: results.length,
      expectedCount: answers.length
    })
  }
  
  return results
}