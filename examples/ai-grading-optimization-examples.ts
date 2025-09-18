/**
 * Example usage of optimized AI grading
 * Demonstrasi penggunaan AI grading yang dioptimasi
 */

import { gradeEssayAnswerOptimized, optimizedBatchGradeAnswers, type PromptConfig } from '@/lib/ai-grading-optimized'

// ===========================================
// 1. INDIVIDUAL GRADING EXAMPLES
// ===========================================

/**
 * Example 1: Testing mode (maximum cost savings)
 */
export async function testingModeExample() {
  const economyConfig: PromptConfig = {
    mode: 'concise',
    maxOutputTokens: 400,
    temperature: 0.3
  }

  const result = await gradeEssayAnswerOptimized(
    "Jelaskan proses fotosintesis pada tumbuhan.",
    "Fotosintesis adalah proses dimana tumbuhan menggunakan cahaya matahari untuk membuat makanan.",
    'essay',
    undefined, // no reference answer
    economyConfig
  )

  console.log('💰 Testing mode result:', result)
  // Estimasi: ~40% lebih hemat dari traditional mode
}

/**
 * Example 2: Production mode (balanced cost & quality)
 */
export async function productionModeExample() {
  const standardConfig: PromptConfig = {
    mode: 'concise',
    maxOutputTokens: 500,
    temperature: 0.3
  }

  const result = await gradeEssayAnswerOptimized(
    "Sebutkan dan jelaskan 3 fungsi utama sistem peredaran darah.",
    "1. Mengangkut oksigen ke seluruh tubuh 2. Mengangkut nutrisi 3. Membuang limbah metabolisme",
    'essay',
    "1. Transport oksigen dan CO2, 2. Transport nutrisi dan hormon, 3. Transport limbah metabolik", // with reference
    standardConfig
  )

  console.log('🎯 Production mode result:', result)
  // Estimasi: ~45% lebih hemat dari traditional mode
}

/**
 * Example 3: Premium mode (maximum quality)
 */
export async function premiumModeExample() {
  const premiumConfig: PromptConfig = {
    mode: 'detailed',
    maxOutputTokens: 700,
    temperature: 0.2
  }

  const result = await gradeEssayAnswerOptimized(
    "Analisis dampak revolusi industri terhadap perubahan sosial ekonomi masyarakat Eropa pada abad ke-19.",
    "Revolusi industri membawa perubahan besar pada struktur sosial masyarakat Eropa...",
    'essay',
    undefined,
    premiumConfig
  )

  console.log('🏆 Premium mode result:', result)
  // Kualitas maksimal, penghematan ~20% dari traditional mode
}

// ===========================================
// 2. BATCH GRADING EXAMPLES
// ===========================================

/**
 * Example 4: Batch grading untuk testing 25 siswa × 4 soal
 */
export async function batchTestingExample() {
  const answers = [
    {
      id: 'answer-1',
      question: 'Apa itu fotosintesis?',
      studentAnswer: 'Proses tumbuhan membuat makanan dengan cahaya matahari',
      questionType: 'essay' as const,
      correctAnswer: undefined
    },
    {
      id: 'answer-2', 
      question: 'Ibukota Indonesia adalah?',
      studentAnswer: 'Jakarta',
      questionType: 'multiple_choice' as const,
      correctAnswer: 'Jakarta'
    },
    // ... 98 more answers
  ]

  const economyConfig: PromptConfig = {
    mode: 'concise',
    maxOutputTokens: 400,
    temperature: 0.3
  }

  const results = await optimizedBatchGradeAnswers(answers, economyConfig)
  
  console.log('📊 Batch testing results:', {
    totalProcessed: results.length,
    estimatedCostSaving: '~60%',
    estimatedCost: '~$0.014 (Rp 220)'
  })

  return results
}

// ===========================================
// 3. API USAGE EXAMPLES
// ===========================================

/**
 * Example 5: Individual grading via API
 */
export async function apiIndividualExample() {
  const response = await fetch('/api/ai-grading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jawabanId: 'uuid-jawaban-siswa',
      useOptimized: true // Enable optimized prompts
    })
  })

  const result = await response.json()
  console.log('API Individual result:', result)
  
  /*
  Expected response:
  {
    "success": true,
    "score": 85,
    "feedback": "Jawaban baik namun perlu penjelasan lebih detail...",
    "reasoning": "Menunjukkan pemahaman dasar konsep..."
  }
  */
}

/**
 * Example 6: Batch grading via API
 */
export async function apiBatchExample() {
  const response = await fetch('/api/ai-grading', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ujianId: 'uuid-ujian',
      useBatching: true,     // Enable smart batching
      useOptimized: true     // Enable optimized prompts
    })
  })

  const result = await response.json()
  console.log('API Batch result:', result)
  
  /*
  Expected response:
  {
    "success": true,
    "gradedCount": 100,
    "errorCount": 0,
    "totalProcessed": 100,
    "method": "optimized_batch_grading",
    "tokensEstimatedSaved": "~45%"
  }
  */
}

// ===========================================
// 4. COST COMPARISON EXAMPLES
// ===========================================

/**
 * Example 7: Cost comparison untuk testing scenario
 */
export function costComparisonExample() {
  const testingScenario = {
    totalAnswers: 250, // 25 siswa × 4 soal + 25 siswa × 6 soal
    avgInputTokensTraditional: 650,
    avgOutputTokensTraditional: 300,
    avgInputTokensOptimized: 350,
    avgOutputTokensOptimized: 150
  }

  const geminiPricing = {
    inputPrice: 0.075 / 1_000_000, // per token
    outputPrice: 0.30 / 1_000_000   // per token
  }

  // Traditional cost
  const traditionalInputCost = testingScenario.totalAnswers * testingScenario.avgInputTokensTraditional * geminiPricing.inputPrice
  const traditionalOutputCost = testingScenario.totalAnswers * testingScenario.avgOutputTokensTraditional * geminiPricing.outputPrice
  const traditionalTotal = traditionalInputCost + traditionalOutputCost

  // Optimized cost
  const optimizedInputCost = testingScenario.totalAnswers * testingScenario.avgInputTokensOptimized * geminiPricing.inputPrice
  const optimizedOutputCost = testingScenario.totalAnswers * testingScenario.avgOutputTokensOptimized * geminiPricing.outputPrice
  const optimizedTotal = optimizedInputCost + optimizedOutputCost

  const savings = ((traditionalTotal - optimizedTotal) / traditionalTotal) * 100

  console.log('💰 Cost Comparison for 250 answers:')
  console.log('Traditional:', {
    inputCost: `$${traditionalInputCost.toFixed(4)}`,
    outputCost: `$${traditionalOutputCost.toFixed(4)}`,
    total: `$${traditionalTotal.toFixed(4)}`,
    inIDR: `~Rp ${Math.round(traditionalTotal * 15500)}`
  })
  
  console.log('Optimized:', {
    inputCost: `$${optimizedInputCost.toFixed(4)}`,
    outputCost: `$${optimizedOutputCost.toFixed(4)}`,
    total: `$${optimizedTotal.toFixed(4)}`,
    inIDR: `~Rp ${Math.round(optimizedTotal * 15500)}`
  })
  
  console.log(`💎 Savings: ${savings.toFixed(1)}% (~$${(traditionalTotal - optimizedTotal).toFixed(4)})`)

  return {
    traditional: traditionalTotal,
    optimized: optimizedTotal,
    savingsPercent: savings,
    savingsUSD: traditionalTotal - optimizedTotal
  }
}

// ===========================================
// 5. USAGE RECOMMENDATIONS
// ===========================================

/**
 * Example 8: Configuration recommendations berdasarkan use case
 */
export function getRecommendedConfig(useCase: 'testing' | 'development' | 'production' | 'important_exam'): PromptConfig {
  switch (useCase) {
    case 'testing':
      return {
        mode: 'concise',
        maxOutputTokens: 400,
        temperature: 0.3
      }
    
    case 'development':
      return {
        mode: 'concise',
        maxOutputTokens: 450,
        temperature: 0.3
      }
    
    case 'production':
      return {
        mode: 'concise',
        maxOutputTokens: 500,
        temperature: 0.3
      }
    
    case 'important_exam':
      return {
        mode: 'detailed',
        maxOutputTokens: 700,
        temperature: 0.2
      }
    
    default:
      return {
        mode: 'concise',
        maxOutputTokens: 500,
        temperature: 0.3
      }
  }
}

// Usage:
// const config = getRecommendedConfig('testing')
// const result = await gradeEssayAnswerOptimized(question, answer, type, key, config)