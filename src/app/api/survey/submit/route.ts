import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { survey_id, responses } = body as Record<string, unknown>;

    if (!survey_id || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Check if survey exists and is active
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', survey_id)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    if (!survey.is_active) {
      return NextResponse.json({ error: 'Survey is closed' }, { status: 400 });
    }

    // Check if user has already submitted
    const { data: existingParticipant } = await supabase
      .from('survey_participants')
      .select('*')
      .eq('survey_id', survey_id)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.json({ error: 'You have already submitted this survey' }, { status: 400 });
    }

    // Prepare responses data
    const responsesData = responses.map((r: Record<string, unknown>) => ({
      survey_id,
      user_id: user.id,
      question_id: r.question_id,
      answer_value: r.answer_value?.toString() || null,
      answer_text: (typeof r.answer_text === 'string' ? r.answer_text : null),
    }));

    // Insert responses
    const { error: responsesError } = await supabase
      .from('survey_responses')
      .insert(responsesData);

    if (responsesError) {
      console.error('Error inserting responses:', responsesError);
      return NextResponse.json({ error: 'Failed to submit responses' }, { status: 500 });
    }

    // Mark as participant
    const { error: participantError } = await supabase
      .from('survey_participants')
      .insert({
        survey_id,
        user_id: user.id,
      });

    if (participantError) {
      console.error('Error marking participant:', participantError);
      return NextResponse.json({ error: 'Failed to record participation' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Survey submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error submitting survey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const surveyId = searchParams.get('survey_id');

    if (!surveyId) {
      return NextResponse.json({ error: 'Survey ID is required' }, { status: 400 });
    }

    // Check if user has submitted
    const { data: participant } = await supabase
      .from('survey_participants')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ 
      hasSubmitted: !!participant,
      submittedAt: participant?.completed_at || null,
    });
  } catch (error: unknown) {
    console.error('Error checking submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
