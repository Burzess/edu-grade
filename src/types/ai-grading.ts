// Types untuk sistem penilaian AI

export interface BatchAIGradingOptions {
  useOptimized?: boolean
  useBatching?: boolean
  forceAI?: boolean
}

export interface BatchAIGradingRequest {
  ujianId: string
  options?: BatchAIGradingOptions
}

export interface BatchAIGradingResponse {
  success: boolean
  autoGradedCount: number
  aiGradedCount: number
  errorCount: number
  totalProcessed: number
  processingTimeMs: number
  method: string
  costSavingsPercent: number
  breakdown: {
    autoGraded: {
      count: number
      types: string[]
      costSaved: boolean
    }
    aiGraded: {
      count: number
      types: string[]
      method: string
    }
  }
}

export interface IndividualAIGradingRequest {
  jawabanId: string
  useOptimized?: boolean
  forceAI?: boolean
}

export interface IndividualAIGradingResponse {
  success: boolean
  score: number
  feedback: string
  reasoning?: string
  method: string
  costSaved?: boolean
}

export interface AIGradingError {
  error: string
  details?: string
}

// Types untuk answer dan question yang digunakan dalam AI grading
export interface AIGradingAnswer {
  id: string
  question: string
  studentAnswer: string
  questionType: 'essay' | 'multiple_choice'
  correctAnswer?: string
}

export interface AIGradingResult {
  id: string
  result: {
    score: number
    feedback: string
    reasoning?: string
  }
}

// Utility types
export type GradingMethod = 'auto_empty' | 'auto_grading' | 'ai_optimized' | 'ai_traditional' | 'hybrid_auto_ai_grading'

export type QuestionType = 'essay' | 'multiple_choice' | 'true_false' | 'short_answer'