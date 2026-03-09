import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin or guru
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const surveyId = searchParams.get('survey_id');

    if (!surveyId) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    // Get survey info
    const { data: survey } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Get all questions
    const { data: questions } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order_number');

    // Get total participants
    const { count: totalParticipants } = await supabase
      .from('survey_participants')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId);

    // Get all responses for this survey
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId);

    // Calculate statistics per question
    const questionStats = questions?.map((question) => {
      const questionResponses = responses?.filter(r => r.question_id === question.id) || [];
      
      const stats: any = {
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        category: question.category,
        total_responses: questionResponses.length,
      };

      if (question.question_type === 'likert' || question.question_type === 'rating') {
        // Calculate average
        const numericValues = questionResponses
          .map(r => parseFloat(r.answer_value))
          .filter(v => !isNaN(v));
        
        if (numericValues.length > 0) {
          stats.average_rating = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }

        // Distribution
        const distribution: { [key: string]: number } = {};
        questionResponses.forEach(r => {
          const value = r.answer_value;
          distribution[value] = (distribution[value] || 0) + 1;
        });

        stats.response_distribution = Object.entries(distribution).map(([value, count]) => ({
          value: parseFloat(value),
          count,
          percentage: totalParticipants ? (count / totalParticipants) * 100 : 0,
        })).sort((a, b) => a.value - b.value);

      } else if (question.question_type === 'multiple_choice') {
        // Distribution for multiple choice
        const distribution: { [key: string]: number } = {};
        questionResponses.forEach(r => {
          const value = r.answer_value;
          distribution[value] = (distribution[value] || 0) + 1;
        });

        stats.response_distribution = Object.entries(distribution).map(([value, count]) => ({
          value,
          count,
          percentage: totalParticipants ? (count / totalParticipants) * 100 : 0,
        }));

      } else if (question.question_type === 'text') {
        // Collect text responses
        stats.text_responses = questionResponses
          .map(r => r.answer_text)
          .filter(t => t && t.trim() !== '');
      }

      return stats;
    }) || [];

    const result = {
      survey_id: surveyId,
      survey_title: survey.title,
      survey_description: survey.description,
      iteration: survey.iteration,
      total_responses: totalParticipants || 0,
      created_at: survey.created_at,
      closed_at: survey.closed_at,
      question_stats: questionStats,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching survey statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
