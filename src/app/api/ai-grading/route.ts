import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gradeEssayAnswer } from '@/lib/ai-grading'

export async function POST(request: NextRequest) {
  try {
    const { jawabanId } = await request.json()

    console.log('🤖 AI Grading API called with:', { jawabanId })

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
        feedback: 'Tidak ada jawaban yang diberikan.'
      })
    }

    // Prepare correct answer for multiple choice
    let correctAnswer = undefined
    if (jawaban.soal.question_type === 'multiple_choice' && jawaban.soal.correct_answer) {
      const correctOption = jawaban.soal.options?.find(
        (opt: any) => opt.id === jawaban.soal.correct_answer
      )
      correctAnswer = correctOption?.text || jawaban.soal.correct_answer
      console.log('🎯 Multiple choice - correct answer:', correctAnswer)
    }

    console.log('🤖 Starting AI grading process...')
    
    // Grade using AI with error handling
    const gradingResult = await gradeEssayAnswer(
      jawaban.soal.question_text,
      jawaban.answer_text,
      jawaban.soal.question_type,
      correctAnswer
    )

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
      reasoning: gradingResult.reasoning
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

// Batch grading endpoint
export async function PUT(request: NextRequest) {
  try {
    const { ujianId } = await request.json()

    if (!ujianId) {
      return NextResponse.json(
        { error: 'Ujian ID is required' },
        { status: 400 }
      )
    }


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


    let gradedCount = 0
    let errorCount = 0

    // Process each answer
    for (const jawaban of jawabanList) {
      try {
        // Skip empty answers
        if (!jawaban.answer_text || jawaban.answer_text.trim() === '') {
          await supabase
            .from('jawaban_siswa')
            .update({
              score: 0,
              ai_feedback: 'Tidak ada jawaban yang diberikan.',
              updated_at: new Date().toISOString()
            })
            .eq('id', jawaban.id)
          
          gradedCount++
          continue
        }

        // Prepare correct answer for multiple choice
        let correctAnswer = undefined
        if (jawaban.soal.question_type === 'multiple_choice' && jawaban.soal.correct_answer) {
          const correctOption = jawaban.soal.options?.find(
            (opt: any) => opt.id === jawaban.soal.correct_answer
          )
          correctAnswer = correctOption?.text || jawaban.soal.correct_answer
        }

        // Grade using AI
        const gradingResult = await gradeEssayAnswer(
          jawaban.soal.question_text,
          jawaban.answer_text,
          jawaban.soal.question_type,
          correctAnswer
        )

        // Update jawaban with AI grading result
        const { error: updateError } = await supabase
          .from('jawaban_siswa')
          .update({
            score: gradingResult.score,
            ai_feedback: gradingResult.feedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', jawaban.id)

        if (updateError) {
          errorCount++
        } else {
          gradedCount++
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error grading jawaban ${jawaban.id}:`, error)
        errorCount++
      }
    }


    return NextResponse.json({
      success: true,
      gradedCount,
      errorCount,
      totalProcessed: jawabanList.length
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
