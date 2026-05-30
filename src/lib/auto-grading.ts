/**
 * Automatic grading utilities for non-AI based question types
 * Utility penilaian otomatis untuk tipe soal yang tidak memerlukan AI
 */

export interface AutoGradingResponse {
  score: number // 0-100
  feedback: string
  reasoning: string
  method: 'automatic' | 'ai'
}

/**
 * Automatic grading untuk multiple choice
 * Tidak memerlukan AI, cukup logika sederhana
 */
export function gradeMultipleChoice(
  studentAnswer: string,
  correctAnswer: string,
  _question?: string
): AutoGradingResponse {
  // Normalize answers untuk perbandingan
  const normalizedStudentAnswer = studentAnswer?.trim().toLowerCase() || ''
  const normalizedCorrectAnswer = correctAnswer?.trim().toLowerCase() || ''
  
  // Check exact match
  const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer
  
  // Generate appropriate feedback
  let feedback: string
  let reasoning: string
  
  if (isCorrect) {
    feedback = 'Jawaban benar! Anda memahami konsep dengan baik.'
    reasoning = 'Jawaban sesuai dengan kunci jawaban yang benar'
  } else {
    if (normalizedStudentAnswer === '') {
      feedback = 'Tidak ada jawaban yang dipilih. Pastikan untuk memilih salah satu opsi yang tersedia.'
      reasoning = 'Tidak ada jawaban yang diberikan'
    } else {
      feedback = `Jawaban kurang tepat. Jawaban yang benar adalah: ${correctAnswer}`
      reasoning = 'Jawaban tidak sesuai dengan kunci jawaban'
    }
  }

  return {
    score: isCorrect ? 100 : 0,
    feedback,
    reasoning,
    method: 'automatic'
  }
}

/**
 * Automatic grading untuk True/False questions
 */
export function gradeTrueFalse(
  studentAnswer: string,
  correctAnswer: string
): AutoGradingResponse {

  const normalizedStudentAnswer = studentAnswer?.trim().toLowerCase()
  const normalizedCorrectAnswer = correctAnswer?.trim().toLowerCase()
  
  // Handle berbagai format jawaban true/false
  const trueVariants = ['true', 'benar', 'b', 'ya', 'y', '1']
  const falseVariants = ['false', 'salah', 's', 'tidak', 'n', '0']
  
  const studentIsTrue = trueVariants.includes(normalizedStudentAnswer)
  const studentIsFalse = falseVariants.includes(normalizedStudentAnswer)
  const correctIsTrue = trueVariants.includes(normalizedCorrectAnswer)
  
  const isCorrect = correctIsTrue ? studentIsTrue : studentIsFalse
  
  let feedback: string
  if (isCorrect) {
    feedback = 'Jawaban benar!'
  } else if (!studentIsTrue && !studentIsFalse) {
    feedback = 'Format jawaban tidak valid. Pilih Benar atau Salah.'
  } else {
    feedback = `Jawaban kurang tepat. Jawaban yang benar adalah: ${correctIsTrue ? 'Benar' : 'Salah'}`
  }

  return {
    score: isCorrect ? 100 : 0,
    feedback,
    reasoning: isCorrect ? 'Jawaban benar' : 'Jawaban salah',
    method: 'automatic'
  }
}

/**
 * Determine if a question needs AI grading atau bisa auto-graded
 */
export function needsAIGrading(questionType: string): boolean {
  const autoGradableTypes = [
    'multiple_choice',
    'true_false', 
    'boolean',
    'single_choice'
  ]
  
  return !autoGradableTypes.includes(questionType?.toLowerCase())
}

/**
 * Auto-grade question berdasarkan tipe
 * Returns null jika perlu AI grading
 */
export function autoGradeQuestion(
  questionType: string,
  studentAnswer: string,
  correctAnswer: string,
  question?: string
): AutoGradingResponse | null {
  
  const type = questionType?.toLowerCase()
  
  switch (type) {
    case 'multiple_choice':
    case 'single_choice':
      return gradeMultipleChoice(studentAnswer, correctAnswer, question)
      
    case 'true_false':
    case 'boolean':
      return gradeTrueFalse(studentAnswer, correctAnswer)
      
    default:
      // Essay, short_answer, dll perlu AI grading
      return null
  }
}

/**
 * Batch auto-grading untuk soal yang tidak perlu AI
 */
export function batchAutoGrade(
  answers: Array<{
    id: string
    questionType: string
    studentAnswer: string
    correctAnswer: string
    question?: string
  }>
): {
  autoGraded: Array<{ id: string; result: AutoGradingResponse }>
  needsAI: Array<{ id: string; questionType: string; studentAnswer: string; correctAnswer?: string; question?: string }>
} {
  
  const autoGraded: Array<{ id: string; result: AutoGradingResponse }> = []
  const needsAI: Array<{ id: string; questionType: string; studentAnswer: string; correctAnswer?: string; question?: string }> = []
  
  for (const answer of answers) {
    const autoResult = autoGradeQuestion(
      answer.questionType,
      answer.studentAnswer,
      answer.correctAnswer,
      answer.question
    )
    
    if (autoResult) {
      autoGraded.push({
        id: answer.id,
        result: autoResult
      })
    } else {
      needsAI.push({
        id: answer.id,
        questionType: answer.questionType,
        studentAnswer: answer.studentAnswer,
        correctAnswer: answer.correctAnswer,
        question: answer.question
      })
    }
  }
  
  return { autoGraded, needsAI }
}

/**
 * Calculate cost savings by using auto-grading
 */
export function calculateCostSavings(
  totalQuestions: number,
  autoGradedCount: number,
  avgTokensPerAIRequest: number = 500,
  tokenCostPer1M: number = 0.375 // Gemini 1.5 Flash combined cost
): {
  originalCost: number
  optimizedCost: number
  savings: number
  savingsPercent: number
} {
  const originalCost = totalQuestions * avgTokensPerAIRequest * (tokenCostPer1M / 1_000_000)
  const aiOnlyCount = totalQuestions - autoGradedCount
  const optimizedCost = aiOnlyCount * avgTokensPerAIRequest * (tokenCostPer1M / 1_000_000)
  
  const savings = originalCost - optimizedCost
  const savingsPercent = totalQuestions > 0 ? (savings / originalCost) * 100 : 0
  
  return {
    originalCost,
    optimizedCost,
    savings,
    savingsPercent
  }
}

/**
 * Generate performance report untuk mixed grading
 */
export function generateGradingReport(stats: {
  autoGraded: number
  aiGraded: number
  totalProcessed: number
  processingTimeMs: number
}) {
  const autoGradedPercent = (stats.autoGraded / stats.totalProcessed) * 100
  const aiGradedPercent = (stats.aiGraded / stats.totalProcessed) * 100
  
  return {
    summary: {
      totalProcessed: stats.totalProcessed,
      autoGraded: stats.autoGraded,
      aiGraded: stats.aiGraded,
      autoGradedPercent: Math.round(autoGradedPercent),
      aiGradedPercent: Math.round(aiGradedPercent)
    },
    performance: {
      totalTimeMs: stats.processingTimeMs,
      avgTimePerQuestion: stats.processingTimeMs / stats.totalProcessed,
      estimatedTimeIfAllAI: stats.totalProcessed * 2000 // Asumsi 2 detik per AI request
    },
    efficiency: {
      speedImprovement: autoGradedPercent > 0 ? 'Significant' : 'None',
      costReduction: autoGradedPercent > 0 ? `~${Math.round(autoGradedPercent)}%` : '0%',
      recommendation: autoGradedPercent > 50 
        ? 'Excellent use of auto-grading' 
        : autoGradedPercent > 20 
          ? 'Good balance of auto and AI grading'
          : 'Consider more multiple choice questions for cost efficiency'
    }
  }
}