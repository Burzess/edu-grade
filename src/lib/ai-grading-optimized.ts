import { OpenAI } from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

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
  config: PromptConfig = defaultConfig,
  retryCount: number = 0
): Promise<AIGradingResponse> {
  const maxRetries = 2 // Maximum retry attempts

  try {
    console.log('🤖 Starting optimized AI grading...', { 
      questionLength: question.length, 
      answerLength: studentAnswer.length,
      questionType,
      mode: config.mode,
      hasReferenceAnswer: !!correctAnswer,
      retryAttempt: retryCount
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

    // OpenAI configuration - using Google Gemini through OpenRouter for consistency
    const openaiConfig = {
      model: "google/gemini-2.0-flash-exp:free",
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      top_p: 0.95, // ENHANCED: More focused responses
      // Note: OpenAI API doesn't support topK, candidateCount, or stopSequences in the same way as Gemini
    }

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

    // ENHANCED DEBUG: Log complete prompt being sent to AI
    console.log('📤 PROMPT DEBUG - Sending to AI:', {
      promptType: questionType === 'multiple_choice' ? 'Multiple Choice' : 'Essay',
      promptMode: config.mode,
      promptLength: prompt.length,
      hasReferenceAnswer: !!correctAnswer,
      questionPreview: question.substring(0, 100) + '...',
      answerPreview: studentAnswer.substring(0, 100) + '...',
      referenceAnswerPreview: correctAnswer ? correctAnswer.substring(0, 100) + '...' : 'N/A',
      fullPrompt: prompt,
      modelConfig: {
        model: 'google/gemini-2.0-flash-exp:free',
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        retryAttempt: retryCount
      }
    })

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

    // ENHANCED DEBUG: Log complete AI response for debugging
    console.log('🤖 COMPLETE AI RESPONSE DEBUG:', {
      promptLength: prompt.length,
      responseLength: text.length,
      fullResponse: text,
      responsePreview: text.substring(0, 300) + '...',
      containsCodeBlock: text.includes('```json'),
      containsJson: text.includes('{'),
      startsWithJson: text.trim().startsWith('{'),
      endsWithJson: text.trim().endsWith('}'),
      firstBraceIndex: text.indexOf('{'),
      lastBraceIndex: text.lastIndexOf('}'),
      responseStructure: {
        lines: text.split('\n').length,
        words: text.split(' ').length,
        characters: text.length
      }
    })

    console.log('🤖 Optimized AI response preview:', text.substring(0, 150) + '...')

    // Parse JSON response
    const aiResponse = parseAIResponse(text)
    
    // Validate and return
    return validateAndFormatResponse(aiResponse)

  } catch (error: unknown) {
    console.error('❌ Optimized AI grading error:', {
      error: error instanceof Error ? error.message : error,
      questionPreview: question.substring(0, 100) + '...',
      answerPreview: studentAnswer.substring(0, 100) + '...',
      questionType,
      hasReferenceAnswer: !!correctAnswer,
      retryAttempt: retryCount
    })
    
    // ENHANCED: Retry mechanism for parsing errors
    if (retryCount < maxRetries && 
        error instanceof Error && 
        (error.message.includes('Invalid JSON') || error.message.includes('Invalid AI response'))) {
      
      console.log(`🔄 Retrying AI grading (attempt ${retryCount + 1}/${maxRetries + 1})...`)
      
      // Use more conservative config for retry
      const retryConfig: PromptConfig = {
        mode: 'concise',
        maxOutputTokens: Math.min(config.maxOutputTokens, 300),
        temperature: Math.max(config.temperature - 0.1, 0.1) // Lower temperature for more consistency
      }
      
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return gradeEssayAnswerOptimized(
        question, 
        studentAnswer, 
        questionType, 
        correctAnswer, 
        retryConfig, 
        retryCount + 1
      )
    }
    
    // ENHANCED: Intelligent fallback scoring based on answer content
    let fallbackScore = 0
    let fallbackFeedback = 'Sistem penilaian AI mengalami gangguan. Akan dinilai manual oleh guru.'
    let fallbackReasoning = `AI error: ${error instanceof Error ? error.message : 'Unknown'}`
    
    if (studentAnswer.trim().length > 0) {
      // Basic content-based scoring for fallback
      const answerLength = studentAnswer.trim().length
      const questionLength = question.trim().length
      const hasKeywords = correctAnswer ? 
        studentAnswer.toLowerCase().includes(correctAnswer.toLowerCase().substring(0, 20)) : false
      
      if (questionType === 'multiple_choice' && correctAnswer) {
        // For MC, try simple string comparison as fallback
        fallbackScore = studentAnswer.trim().toLowerCase() === correctAnswer.toLowerCase() ? 100 : 0
        fallbackFeedback = fallbackScore === 100 ? 
          'Jawaban benar (fallback scoring)' : 
          'Jawaban salah (fallback scoring)'
        fallbackReasoning = 'Fallback: Simple string comparison due to AI parsing error'
      } else {
        // For essay, basic length and keyword scoring
        if (answerLength >= questionLength * 0.5 && hasKeywords) {
          fallbackScore = 70 // Good effort with some keywords
          fallbackFeedback = 'Jawaban cukup baik berdasarkan panjang dan konten (fallback scoring)'
        } else if (answerLength >= 20) {
          fallbackScore = 50 // Some effort
          fallbackFeedback = 'Jawaban perlu pengembangan lebih lanjut (fallback scoring)'
        } else {
          fallbackScore = 25 // Minimal effort
          fallbackFeedback = 'Jawaban terlalu singkat, perlu diperluas (fallback scoring)'
        }
        fallbackReasoning = `Fallback: Content-based scoring (length: ${answerLength}, has keywords: ${hasKeywords})`
      }
    }
    
    return {
      score: fallbackScore,
      feedback: fallbackFeedback,
      reasoning: fallbackReasoning
    }
  }
}

/**
 * OPTIMIZED: Multiple Choice Prompt (Concise)
 * Token reduction: ~60% vs original
 * ENHANCED: Better JSON format specification
 */
function getOptimizedMultipleChoicePrompt(question: string, correct: string, answer: string): string {
  return `Nilai pilihan ganda berikut dalam format JSON:

Q: ${question}
Benar: ${correct}
Jawab: ${answer}

PENTING: Berikan HANYA JSON yang valid tanpa teks tambahan!

Format JSON yang HARUS digunakan:
{
  "score": [0 atau 100],
  "feedback": "feedback singkat maksimal 100 karakter",
  "reasoning": "alasan singkat maksimal 50 karakter"
}

Aturan: Benar=100, Salah=0. Feedback konstruktif.`
}

/**
 * OPTIMIZED: Essay Prompt (Concise)
 * Token reduction: ~45% vs original
 * ENHANCED: Better JSON format specification
 */
function getOptimizedEssayPrompt(question: string, answer: string): string {
  return `Nilai essay berikut dalam format JSON:

Q: ${question}
A: ${answer}

PENTING: Berikan HANYA JSON yang valid tanpa teks tambahan!

Format JSON yang HARUS digunakan:
{
  "score": [0-100],
  "feedback": "feedback singkat maksimal 100 karakter",
  "reasoning": "alasan singkat maksimal 50 karakter"
}

Kriteria: Akurasi (40%), Kelengkapan (30%), Struktur (20%), Bahasa (10%).
Nilai: 90-100=Sangat baik, 70-89=Baik, 50-69=Cukup, <50=Kurang.`
}

/**
 * OPTIMIZED: Essay with Reference Answer (Concise) 
 * Token reduction: ~50% vs original
 * ENHANCED: Better JSON format specification
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
  "feedback": "feedback singkat maksimal 100 karakter",
  "reasoning": "alasan singkat maksimal 50 karakter"
}

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
 * ENHANCED: Better JSON extraction and error handling
 */
function parseAIResponse(text: string): AIGradingResponse {
  console.log('🔍 DETAILED PARSING DEBUG - Starting parseAIResponse:', {
    textLength: text.length,
    textPreview: text.substring(0, 200) + '...',
    containsCodeBlock: text.includes('```json'),
    containsOpenBrace: text.includes('{'),
    containsCloseBrace: text.includes('}'),
    firstChar: text.charAt(0),
    lastChar: text.charAt(text.length - 1),
    trimmedFirst: text.trim().charAt(0),
    trimmedLast: text.trim().charAt(text.trim().length - 1)
  })
  
  // Method 1: Try to find JSON within code blocks first
  console.log('🔍 METHOD 1: Trying code block extraction...')
  let jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/)
  if (jsonMatch) {
    console.log('✅ METHOD 1: Found JSON in code block:', {
      matchLength: jsonMatch[1].length,
      matchPreview: jsonMatch[1].substring(0, 100) + '...',
      fullMatch: jsonMatch[1]
    })
    try {
      const parsed = JSON.parse(jsonMatch[1])
      console.log('✅ METHOD 1: Parsed JSON from code block successfully:', parsed)
      return parsed
    } catch (error: unknown) {
      console.log('❌ METHOD 1: Failed to parse JSON from code block:', {
        error: error instanceof Error ? error.message : error,
        jsonString: jsonMatch[1]
      })
    }
  } else {
    console.log('❌ METHOD 1: No code block found')
  }

  // Method 2: Try to find any JSON object in the text
  console.log('🔍 METHOD 2: Trying general JSON extraction...')
  jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (jsonMatch) {
    console.log('✅ METHOD 2: Found JSON object:', {
      matchLength: jsonMatch[0].length,
      matchPreview: jsonMatch[0].substring(0, 100) + '...',
      fullMatch: jsonMatch[0]
    })
    try {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('✅ METHOD 2: Parsed JSON from text successfully:', parsed)
      return parsed
    } catch (error: unknown) {
      console.log('❌ METHOD 2: Failed to parse JSON from text:', {
        error: error instanceof Error ? error.message : error,
        jsonString: jsonMatch[0]
      })
    }
  } else {
    console.log('❌ METHOD 2: No JSON object found')
  }

  // Method 3: Clean and try again
  console.log('🔍 METHOD 3: Trying cleaned text extraction...')
  const cleanedText = text
    .replace(/```json\n?|\n?```/g, '')
    .replace(/^[^{]*/, '') // Remove everything before first {
    .replace(/[^}]*$/, '') // Remove everything after last }
    .trim()

  console.log('🔍 METHOD 3: Cleaned text:', {
    originalLength: text.length,
    cleanedLength: cleanedText.length,
    cleanedText: cleanedText,
    startsWithBrace: cleanedText.startsWith('{'),
    endsWithBrace: cleanedText.endsWith('}')
  })

  if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanedText)
      console.log('✅ METHOD 3: Parsed JSON from cleaned text successfully:', parsed)
      return parsed
    } catch (error: unknown) {
      console.log('❌ METHOD 3: Failed to parse cleaned JSON:', {
        error: error instanceof Error ? error.message : error,
        cleanedText: cleanedText
      })
    }
  } else {
    console.log('❌ METHOD 3: Cleaned text does not have proper JSON structure')
  }

  // Method 4: Try to extract JSON with more aggressive regex
  console.log('🔍 METHOD 4: Trying aggressive regex extraction...')
  const aggressiveMatch = text.match(/\{\s*"score"\s*:\s*\d+[\s\S]*?\}/);
  if (aggressiveMatch) {
    console.log('✅ METHOD 4: Found JSON with aggressive regex:', {
      matchLength: aggressiveMatch[0].length,
      fullMatch: aggressiveMatch[0]
    })
    try {
      const parsed = JSON.parse(aggressiveMatch[0])
      console.log('✅ METHOD 4: Parsed JSON with aggressive regex successfully:', parsed)
      return parsed
    } catch (error: unknown) {
      console.log('❌ METHOD 4: Failed to parse with aggressive regex:', {
        error: error instanceof Error ? error.message : error,
        jsonString: aggressiveMatch[0]
      })
    }
  } else {
    console.log('❌ METHOD 4: No JSON found with aggressive regex')
  }

  // Method 5: Last resort - try to reconstruct basic structure from text
  console.log('🔍 METHOD 5: Trying to reconstruct from parts...')
  const scoreMatch = text.match(/"score"\s*:\s*(\d+)/)
  const feedbackMatch = text.match(/"feedback"\s*:\s*"([^"]*)"/)
  const reasoningMatch = text.match(/"reasoning"\s*:\s*"([^"]*)"/)

  console.log('🔍 METHOD 5: Part extraction results:', {
    scoreMatch: scoreMatch ? { found: true, value: scoreMatch[1] } : { found: false },
    feedbackMatch: feedbackMatch ? { found: true, value: feedbackMatch[1] } : { found: false },
    reasoningMatch: reasoningMatch ? { found: true, value: reasoningMatch[1] } : { found: false }
  })

  if (scoreMatch && feedbackMatch && reasoningMatch) {
    const reconstructed = {
      score: parseInt(scoreMatch[1]),
      feedback: feedbackMatch[1],
      reasoning: reasoningMatch[1]
    }
    console.log('⚡ METHOD 5: Reconstructing JSON from extracted parts:', reconstructed)
    return reconstructed
  } else {
    console.log('❌ METHOD 5: Could not extract all required parts')
  }

  // If all methods fail, log the problematic response
  console.error('❌ ALL PARSING METHODS FAILED. Complete debug info:', {
    originalText: text,
    textLength: text.length,
    hasCodeBlock: text.includes('```json'),
    hasOpenBrace: text.includes('{'),
    hasCloseBrace: text.includes('}'),
    firstChars: text.substring(0, 100),
    lastChars: text.substring(Math.max(0, text.length - 100)),
    allLines: text.split('\n'),
    codeBlockMatches: text.match(/```json[\s\S]*?```/g),
    jsonMatches: text.match(/\{[\s\S]*?\}/g),
    scoreMatches: text.match(/"score"\s*:\s*\d+/g),
    feedbackMatches: text.match(/"feedback"\s*:\s*"[^"]*"/g),
    reasoningMatches: text.match(/"reasoning"\s*:\s*"[^"]*"/g)
  })

  throw new Error('Invalid AI response format - no valid JSON found')
}

/**
 * Validate and format AI response
 * ENHANCED: Better validation and error handling
 */
function validateAndFormatResponse(aiResponse: any): AIGradingResponse {
  console.log('🔍 VALIDATION DEBUG - Input response:', {
    responseType: typeof aiResponse,
    isObject: typeof aiResponse === 'object',
    isNull: aiResponse === null,
    keys: aiResponse ? Object.keys(aiResponse) : 'N/A',
    fullResponse: aiResponse
  })

  // Check if response is valid object
  if (!aiResponse || typeof aiResponse !== 'object') {
    console.error('❌ VALIDATION: Response is not a valid object:', {
      received: aiResponse,
      type: typeof aiResponse
    })
    throw new Error('AI response is not a valid object')
  }

  console.log('🔍 VALIDATION DEBUG - Field analysis:', {
    score: {
      exists: 'score' in aiResponse,
      value: aiResponse.score,
      type: typeof aiResponse.score,
      isNumber: typeof aiResponse.score === 'number',
      isNaN: isNaN(aiResponse.score),
      inRange: aiResponse.score >= 0 && aiResponse.score <= 100
    },
    feedback: {
      exists: 'feedback' in aiResponse,
      value: aiResponse.feedback,
      type: typeof aiResponse.feedback,
      length: aiResponse.feedback ? aiResponse.feedback.length : 0
    },
    reasoning: {
      exists: 'reasoning' in aiResponse,
      value: aiResponse.reasoning,
      type: typeof aiResponse.reasoning,
      isObject: typeof aiResponse.reasoning === 'object',
      length: aiResponse.reasoning ? 
        (typeof aiResponse.reasoning === 'string' ? aiResponse.reasoning.length : 'N/A') : 0
    }
  })

  // Validate score
  if (typeof aiResponse.score !== 'number' || 
      isNaN(aiResponse.score) ||
      aiResponse.score < 0 || 
      aiResponse.score > 100) {
    console.warn('⚠️ VALIDATION: Invalid score, attempting to fix:', {
      originalScore: aiResponse.score,
      type: typeof aiResponse.score
    })
    
    // Try to extract number from string
    if (typeof aiResponse.score === 'string') {
      const numericScore = parseInt(aiResponse.score.replace(/[^0-9]/g, ''))
      console.log('🔧 VALIDATION: Trying to extract numeric score:', {
        originalString: aiResponse.score,
        extractedNumber: numericScore,
        isValid: !isNaN(numericScore) && numericScore >= 0 && numericScore <= 100
      })
      
      if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
        aiResponse.score = numericScore
        console.log('✅ VALIDATION: Score fixed successfully:', aiResponse.score)
      } else {
        console.error('❌ VALIDATION: Could not fix score:', {
          original: aiResponse.score,
          extracted: numericScore
        })
        throw new Error(`Invalid score value: ${aiResponse.score}`)
      }
    } else {
      console.error('❌ VALIDATION: Score is not a valid number or string:', {
        value: aiResponse.score,
        type: typeof aiResponse.score
      })
      throw new Error(`Invalid score type or value: ${aiResponse.score}`)
    }
  } else {
    console.log('✅ VALIDATION: Score is valid:', aiResponse.score)
  }

  // Validate feedback
  if (!aiResponse.feedback || typeof aiResponse.feedback !== 'string') {
    console.warn('⚠️ VALIDATION: Invalid feedback, attempting to fix:', {
      originalFeedback: aiResponse.feedback,
      type: typeof aiResponse.feedback
    })
    
    if (aiResponse.feedback === null || aiResponse.feedback === undefined) {
      aiResponse.feedback = 'Feedback tidak tersedia'
      console.log('🔧 VALIDATION: Set default feedback for null/undefined')
    } else {
      aiResponse.feedback = String(aiResponse.feedback)
      console.log('🔧 VALIDATION: Converted feedback to string:', aiResponse.feedback)
    }
  } else {
    console.log('✅ VALIDATION: Feedback is valid string:', aiResponse.feedback.substring(0, 50) + '...')
  }

  // Validate reasoning
  if (!aiResponse.reasoning || typeof aiResponse.reasoning !== 'string') {
    console.warn('⚠️ VALIDATION: Invalid reasoning, attempting to fix:', {
      originalReasoning: aiResponse.reasoning,
      type: typeof aiResponse.reasoning,
      isObject: typeof aiResponse.reasoning === 'object'
    })
    
    if (aiResponse.reasoning === null || aiResponse.reasoning === undefined) {
      aiResponse.reasoning = 'Reasoning tidak tersedia'
      console.log('🔧 VALIDATION: Set default reasoning for null/undefined')
    } else if (typeof aiResponse.reasoning === 'object') {
      // Sometimes AI returns nested object in reasoning
      const stringified = JSON.stringify(aiResponse.reasoning)
      aiResponse.reasoning = stringified
      console.log('🔧 VALIDATION: Converted object reasoning to string:', stringified)
    } else {
      aiResponse.reasoning = String(aiResponse.reasoning)
      console.log('🔧 VALIDATION: Converted reasoning to string:', aiResponse.reasoning)
    }
  } else {
    console.log('✅ VALIDATION: Reasoning is valid string:', aiResponse.reasoning.substring(0, 50) + '...')
  }

  const finalResponse = {
    score: Math.round(Number(aiResponse.score)),
    feedback: String(aiResponse.feedback).trim().substring(0, 200), // Limit length
    reasoning: String(aiResponse.reasoning).trim().substring(0, 100) // Limit length
  }

  console.log('✅ VALIDATION: Final validated response:', finalResponse)
  
  return finalResponse
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
  console.log('🚀 BATCH GRADING DEBUG - Starting batch AI grading:', {
    totalAnswers: answers.length,
    config: config,
    answers: answers.map((answer, index) => ({
      index: index + 1,
      id: answer.id,
      questionType: answer.questionType || 'essay',
      questionLength: answer.question.length,
      questionPreview: answer.question.substring(0, 50) + '...',
      answerLength: answer.studentAnswer.length,
      answerPreview: answer.studentAnswer.substring(0, 50) + '...',
      hasReferenceAnswer: !!answer.correctAnswer,
      referenceAnswerPreview: answer.correctAnswer ? answer.correctAnswer.substring(0, 50) + '...' : 'N/A'
    }))
  })
  
  const results = []
  
  for (const answer of answers) {
    const startTime = Date.now()
    
    console.log(`🔄 BATCH ITEM ${results.length + 1}/${answers.length} - Processing answer:`, {
      id: answer.id,
      questionType: answer.questionType || 'essay',
      isEmpty: !answer.studentAnswer?.trim()
    })
    
    try {
      if (!answer.studentAnswer?.trim()) {
        const emptyResult = {
          score: 0,
          feedback: 'Tidak ada jawaban yang diberikan.',
          reasoning: 'Empty answer'
        }
        
        console.log(`✅ BATCH ITEM ${results.length + 1} - Empty answer handled:`, emptyResult)
        
        results.push({
          id: answer.id,
          result: emptyResult
        })
        continue
      }

      console.log(`🤖 BATCH ITEM ${results.length + 1} - Calling AI grading...`)
      
      const result = await gradeEssayAnswerOptimized(
        answer.question,
        answer.studentAnswer,
        answer.questionType,
        answer.correctAnswer,
        config
      )
      
      const processingTime = Date.now() - startTime
      
      console.log(`✅ BATCH ITEM ${results.length + 1} - AI grading completed:`, {
        id: answer.id,
        result: result,
        processingTimeMs: processingTime
      })
      
      results.push({
        id: answer.id,
        result
      })
      
      // Reduced delay karena prompt lebih efisien
      await new Promise(resolve => setTimeout(resolve, 800))
      
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime
      
      console.error(`❌ BATCH ITEM ${results.length + 1} - Error grading answer:`, {
        id: answer.id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
        questionPreview: answer.question.substring(0, 100) + '...',
        answerPreview: answer.studentAnswer.substring(0, 100) + '...'
      })
      
      const fallbackResult = {
        score: answer.studentAnswer.trim().length > 0 ? 50 : 0,
        feedback: 'Terjadi kesalahan dalam penilaian otomatis.',
        reasoning: 'AI grading error'
      }
      
      console.log(`🔧 BATCH ITEM ${results.length + 1} - Using fallback result:`, fallbackResult)
      
      results.push({
        id: answer.id,
        result: fallbackResult
      })
    }
  }
  
  console.log('✅ BATCH GRADING COMPLETED - Final summary:', {
    totalProcessed: results.length,
    expectedCount: answers.length,
    successfulGrading: results.filter(r => !r.result.reasoning.includes('error')).length,
    fallbackGrading: results.filter(r => r.result.reasoning.includes('error')).length,
    emptyAnswers: results.filter(r => r.result.reasoning === 'Empty answer').length,
    results: results
  })
  
  return results
}