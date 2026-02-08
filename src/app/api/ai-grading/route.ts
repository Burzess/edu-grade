import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeEssayAnswer } from '@/lib/ai-grading'
import { gradeEssayAnswerOptimized, optimizedBatchGradeAnswers, type PromptConfig } from '@/lib/ai-grading-optimized'
import { autoGradeQuestion, needsAIGrading, type AutoGradingResponse } from '@/lib/auto-grading'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { jawabanId, useOptimized = true, forceAI = false } = await request.json()

    console.log('🤖 AI Grading API called with:', { jawabanId, useOptimized, forceAI })

    if (!jawabanId) {
      return NextResponse.json(
        { error: 'Jawaban ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get jawaban with related soal
    const { data: jawaban, error: jawabanError } = await supabase
      .from('jawaban_siswa')
      .select(`
        *,
        soal!inner(
          id,
          question_text,
          question_type,
          correct_answer,
          options
        )
      `)
      .eq('id', jawabanId)
      .single()

    if (jawabanError || !jawaban) {
      console.error('❌ Error fetching jawaban:', jawabanError)
      return NextResponse.json(
        { error: 'Jawaban not found' },
        { status: 404 }
      )
    }

    console.log('📄 Found jawaban:', {
      id: jawaban.id,
      soalType: jawaban.soal?.question_type,
      hasAnswer: !!jawaban.answer_text,
      currentScore: jawaban.score
    })

    // Skip if already graded
    if (jawaban.score !== null) {
      console.log('⏭️ Already graded, skipping AI grading')
      return NextResponse.json({ 
        success: true, 
        message: 'Already graded',
        score: jawaban.score 
      })
    }

    // Skip if no answer provided
    if (!jawaban.answer_text || jawaban.answer_text.trim() === '') {
      console.log('⚠️ Empty answer, setting score to 0')
      
      await supabase
        .from('jawaban_siswa')
        .update({
          score: 0,
          ai_feedback: 'Tidak ada jawaban yang diberikan.',
          updated_at: new Date().toISOString()
        })
        .eq('id', jawabanId)

      return NextResponse.json({ 
        success: true, 
        score: 0,
        feedback: 'Tidak ada jawaban yang diberikan.',
        method: 'auto_empty'
      })
    }

    // Check if question can be auto-graded (multiple choice, true/false, etc.)
    if (!forceAI && !needsAIGrading(jawaban.soal.question_type)) {
      console.log('⚡ Using AUTO-GRADING (no AI needed) for question type:', jawaban.soal.question_type)
      
      // Prepare correct answer for auto-grading
      let correctAnswer = jawaban.soal.correct_answer
      if (jawaban.soal.question_type === 'multiple_choice' && jawaban.soal.options) {
        const correctOption = jawaban.soal.options.find(
          (opt: any) => opt.id === jawaban.soal.correct_answer
        )
        correctAnswer = correctOption?.text || jawaban.soal.correct_answer
      }

      const autoResult = autoGradeQuestion(
        jawaban.soal.question_type,
        jawaban.answer_text,
        correctAnswer || '',
        jawaban.soal.question_text
      )

      if (autoResult) {
        // Update with auto-grading result
        const { error: updateError } = await supabase
          .from('jawaban_siswa')
          .update({
            score: autoResult.score,
            ai_feedback: autoResult.feedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', jawabanId)

        if (updateError) {
          console.error('❌ Error updating jawaban with auto score:', updateError)
          return NextResponse.json(
            { error: 'Failed to update score' },
            { status: 500 }
          )
        }

        console.log('✅ Auto-grading completed:', {
          score: autoResult.score,
          method: autoResult.method,
          type: jawaban.soal.question_type
        })

        return NextResponse.json({
          success: true,
          score: autoResult.score,
          feedback: autoResult.feedback,
          reasoning: autoResult.reasoning,
          method: autoResult.method,
          costSaved: true
        })
      }
    }

    // Prepare correct answer for multiple choice (only for AI grading)
    let correctAnswer = undefined
    if (jawaban.soal.question_type === 'essay' && jawaban.soal.correct_answer) {
      // For essay questions, use correct_answer as reference
      correctAnswer = jawaban.soal.correct_answer
    }

    console.log('🤖 Starting AI grading process for essay question...')
    
    // Choose grading method based on useOptimized flag
    let gradingResult
    if (useOptimized) {
      console.log('📈 Using OPTIMIZED AI grading (reduced token usage)')
      
      const promptConfig: PromptConfig = {
        mode: 'concise', // Use concise prompts for cost efficiency
        maxOutputTokens: 500, // Reduced from 1000
        temperature: 0.3
      }
      
      gradingResult = await gradeEssayAnswerOptimized(
        jawaban.soal.question_text,
        jawaban.answer_text,
        jawaban.soal.question_type,
        correctAnswer,
        promptConfig
      )
    } else {
      console.log('📝 Using TRADITIONAL AI grading (detailed prompts)')
      
      // Grade using original AI method
      gradingResult = await gradeEssayAnswer(
        jawaban.soal.question_text,
        jawaban.answer_text,
        jawaban.soal.question_type,
        correctAnswer
      )
    }

    console.log('✅ AI grading completed:', {
      score: gradingResult.score,
      feedbackLength: gradingResult.feedback.length
    })

    // Update jawaban with AI grading result
    const { error: updateError } = await supabase
      .from('jawaban_siswa')
      .update({
        score: gradingResult.score,
        ai_feedback: gradingResult.feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', jawabanId)

    if (updateError) {
      console.error('❌ Error updating jawaban with AI score:', updateError)
      return NextResponse.json(
        { error: 'Failed to update score' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      score: gradingResult.score,
      feedback: gradingResult.feedback,
      reasoning: gradingResult.reasoning,
      method: useOptimized ? 'ai_optimized' : 'ai_traditional'
    })

  } catch (error) {
    console.error('❌ Auto-grading API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Hybrid batch grading: Auto-grading untuk MC, AI untuk Essay
export async function PUT(request: NextRequest) {
  try {
    const { ujianId, useBatching = true, useOptimized = true, forceAI = false } = await request.json()

    if (!ujianId) {
      return NextResponse.json(
        { error: 'Ujian ID is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Hybrid batch grading config:', { ujianId, useBatching, useOptimized, forceAI })


    const supabase = await createClient()

    // Get all ungraded jawaban for this ujian
    const { data: jawabanList, error: jawabanError } = await supabase
      .from('jawaban_siswa')
      .select(`
        *,
        soal!inner(
          id,
          question_text,
          question_type,
          correct_answer,
          options
        )
      `)
      .eq('ujian_id', ujianId)
      .is('score', null)

    if (jawabanError) {
      console.error('❌ Error fetching jawaban for batch grading:', jawabanError)
      return NextResponse.json(
        { error: 'Failed to fetch answers' },
        { status: 500 }
      )
    }

    if (!jawabanList || jawabanList.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No ungraded answers found',
        gradedCount: 0
      })
    }

    console.log('📊 Processing', jawabanList.length, 'ungraded answers')

    // PHASE 1: Separate auto-gradable vs AI-needed questions
    const autoGradableAnswers = []
    const aiNeededAnswers = []

    for (const jawaban of jawabanList) {
      const answerData: {
        id: any
        questionType: any
        studentAnswer: any
        question: any
        correctAnswer?: string
      } = {
        id: jawaban.id,
        questionType: jawaban.soal.question_type,
        studentAnswer: jawaban.answer_text || '',
        question: jawaban.soal.question_text
      }

      // Prepare correct answer based on question type
      if (jawaban.soal.question_type === 'multiple_choice' && jawaban.soal.correct_answer) {
        const correctOption = jawaban.soal.options?.find(
          (opt: any) => opt.id === jawaban.soal.correct_answer
        )
        answerData.correctAnswer = correctOption?.text || jawaban.soal.correct_answer
      } else if (jawaban.soal.correct_answer) {
        answerData.correctAnswer = jawaban.soal.correct_answer
      }

      // Decide grading method
      if (!forceAI && !needsAIGrading(jawaban.soal.question_type)) {
        autoGradableAnswers.push(answerData)
      } else {
        aiNeededAnswers.push(answerData)
      }
    }

    console.log('🔄 Grading strategy:', {
      autoGradable: autoGradableAnswers.length,
      needsAI: aiNeededAnswers.length,
      total: jawabanList.length
    })

    // PHASE 2: Auto-grade multiple choice and similar questions
    let autoGradedCount = 0
    let aiGradedCount = 0
    let errorCount = 0
    const startTime = Date.now()

    // Auto-grade questions (instant, no cost)
    for (const answerData of autoGradableAnswers) {
      try {
        const autoResult = autoGradeQuestion(
          answerData.questionType,
          answerData.studentAnswer,
          answerData.correctAnswer || '',
          answerData.question
        )

        if (autoResult) {
          const { error: updateError } = await supabase
            .from('jawaban_siswa')
            .update({
              score: autoResult.score,
              ai_feedback: autoResult.feedback,
              updated_at: new Date().toISOString()
            })
            .eq('id', answerData.id)

          if (updateError) {
            errorCount++
            console.error(`❌ Error updating auto-graded answer ${answerData.id}:`, updateError)
          } else {
            autoGradedCount++
          }
        }
      } catch (error) {
        errorCount++
        console.error(`❌ Error auto-grading answer ${answerData.id}:`, error)
      }
    }

    console.log('⚡ Auto-grading completed:', autoGradedCount, 'questions')

    // PHASE 3: AI-grade essay questions only
    if (aiNeededAnswers.length > 0) {
      console.log('🤖 Starting AI grading for', aiNeededAnswers.length, 'essay questions')

      if (useBatching && aiNeededAnswers.length > 1) {
        // Use batching for essay questions
        try {
          if (useOptimized) {
            console.log('📈 Using OPTIMIZED batch grading for essays')
            
            const promptConfig: PromptConfig = {
              mode: 'concise',
              maxOutputTokens: 500,
              temperature: 0.3
            }
            
            const essayAnswers = aiNeededAnswers.map(ans => ({
              id: ans.id,
              question: ans.question,
              studentAnswer: ans.studentAnswer,
              questionType: ans.questionType as 'essay' | 'multiple_choice',
              correctAnswer: ans.correctAnswer
            }))
            
            const batchResults = await optimizedBatchGradeAnswers(essayAnswers, promptConfig)

            // Update database with batch results
            for (const result of batchResults) {
              try {
                const { error: updateError } = await supabase
                  .from('jawaban_siswa')
                  .update({
                    score: result.result.score,
                    ai_feedback: result.result.feedback,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', result.id)

                if (updateError) {
                  errorCount++
                  console.error(`❌ Error updating AI-graded answer ${result.id}:`, updateError)
                } else {
                  aiGradedCount++
                }
              } catch (updateError) {
                errorCount++
                console.error(`❌ Exception updating AI-graded answer ${result.id}:`, updateError)
              }
            }

          } else {
            // Traditional AI batch grading
            console.log('📝 Using traditional AI batch grading')
            
            const { smartBatchGradeAnswers } = await import('@/lib/ai-grading')
            
            const essayAnswers = aiNeededAnswers.map(ans => ({
              id: ans.id,
              question: ans.question,
              studentAnswer: ans.studentAnswer,
              questionType: ans.questionType as 'essay' | 'multiple_choice',
              correctAnswer: ans.correctAnswer
            }))
            
            const batchResults = await smartBatchGradeAnswers(essayAnswers, 3)

            // Update database with batch results
            for (const result of batchResults) {
              try {
                const { error: updateError } = await supabase
                  .from('jawaban_siswa')
                  .update({
                    score: result.result.score,
                    ai_feedback: result.result.feedback,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', result.id)

                if (updateError) {
                  errorCount++
                } else {
                  aiGradedCount++
                }
              } catch (updateError) {
                errorCount++
              }
            }
          }

        } catch (batchError) {
          console.error('❌ AI batch grading failed, falling back to individual:', batchError)
          
          // Fallback to individual AI grading
          for (const answerData of aiNeededAnswers) {
            try {
              if (!answerData.studentAnswer?.trim()) {
                await supabase
                  .from('jawaban_siswa')
                  .update({
                    score: 0,
                    ai_feedback: 'Tidak ada jawaban yang diberikan.',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', answerData.id)
                
                aiGradedCount++
                continue
              }

              // Choose grading method
              let gradingResult
              if (useOptimized) {
                const promptConfig: PromptConfig = {
                  mode: 'concise',
                  maxOutputTokens: 500,
                  temperature: 0.3
                }
                
                gradingResult = await gradeEssayAnswerOptimized(
                  answerData.question,
                  answerData.studentAnswer,
                  answerData.questionType,
                  answerData.correctAnswer,
                  promptConfig
                )
              } else {
                gradingResult = await gradeEssayAnswer(
                  answerData.question,
                  answerData.studentAnswer,
                  answerData.questionType,
                  answerData.correctAnswer
                )
              }

              // Update database
              const { error: updateError } = await supabase
                .from('jawaban_siswa')
                .update({
                  score: gradingResult.score,
                  ai_feedback: gradingResult.feedback,
                  updated_at: new Date().toISOString()
                })
                .eq('id', answerData.id)

              if (updateError) {
                errorCount++
              } else {
                aiGradedCount++
              }

              // Delay between individual requests
              const delay = useOptimized ? 800 : 1000
              await new Promise(resolve => setTimeout(resolve, delay))

            } catch (error) {
              console.error(`❌ Error AI grading answer ${answerData.id}:`, error)
              errorCount++
            }
          }
        }

      } else {
        // Individual AI grading for single essays or when batching disabled
        console.log('🤖 Using individual AI grading for', aiNeededAnswers.length, 'essays')
        
        for (const answerData of aiNeededAnswers) {
          try {
            if (!answerData.studentAnswer?.trim()) {
              await supabase
                .from('jawaban_siswa')
                .update({
                  score: 0,
                  ai_feedback: 'Tidak ada jawaban yang diberikan.',
                  updated_at: new Date().toISOString()
                })
                .eq('id', answerData.id)
              
              aiGradedCount++
              continue
            }

            // Choose grading method
            let gradingResult
            if (useOptimized) {
              const promptConfig: PromptConfig = {
                mode: 'concise',
                maxOutputTokens: 500,
                temperature: 0.3
              }
              
              gradingResult = await gradeEssayAnswerOptimized(
                answerData.question,
                answerData.studentAnswer,
                answerData.questionType,
                answerData.correctAnswer,
                promptConfig
              )
            } else {
              gradingResult = await gradeEssayAnswer(
                answerData.question,
                answerData.studentAnswer,
                answerData.questionType,
                answerData.correctAnswer
              )
            }

            // Update database
            const { error: updateError } = await supabase
              .from('jawaban_siswa')
              .update({
                score: gradingResult.score,
                ai_feedback: gradingResult.feedback,
                updated_at: new Date().toISOString()
              })
              .eq('id', answerData.id)

            if (updateError) {
              errorCount++
            } else {
              aiGradedCount++
            }

            // Delay between requests
            const delay = useOptimized ? 800 : 1000
            await new Promise(resolve => setTimeout(resolve, delay))

          } catch (error) {
            console.error(`❌ Error AI grading answer ${answerData.id}:`, error)
            errorCount++
          }
        }
      }
    }

    // PHASE 4: Calculate performance metrics and return results
    const endTime = Date.now()
    const processingTime = endTime - startTime
    const totalProcessed = autoGradedCount + aiGradedCount
    const costSavingsPercent = Math.round((autoGradedCount / jawabanList.length) * 100)

    console.log('✅ Hybrid grading completed:', {
      autoGraded: autoGradedCount,
      aiGraded: aiGradedCount,
      errors: errorCount,
      total: totalProcessed,
      processingTimeMs: processingTime,
      costSavings: `${costSavingsPercent}%`
    })

    return NextResponse.json({
      success: true,
      autoGradedCount,
      aiGradedCount,
      errorCount,
      totalProcessed,
      processingTimeMs: processingTime,
      method: 'hybrid_auto_ai_grading',
      costSavingsPercent,
      breakdown: {
        autoGraded: {
          count: autoGradedCount,
          types: ['multiple_choice', 'true_false'],
          costSaved: true
        },
        aiGraded: {
          count: aiGradedCount,
          types: ['essay'],
          method: useOptimized ? 'optimized' : 'traditional'
        }
      }
    })

  } catch (error) {
    console.error('❌ Batch auto-grading API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
