import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const surveyId = searchParams.get('id');
    const includeQuestions = searchParams.get('includeQuestions') === 'true';

    if (surveyId) {
      // Get specific survey
      const { data: survey, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!survey) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      if (includeQuestions) {
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_number');

        if (questionsError) {
          return NextResponse.json({ error: questionsError.message }, { status: 500 });
        }

        return NextResponse.json({ ...survey, questions });
      }

      return NextResponse.json(survey);
    } else {
      // Get all active surveys
      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(surveys);
    }
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, iteration, questions } = body;

    // Create survey
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title,
        description,
        iteration: iteration || 1,
        is_active: true,
      })
      .select()
      .single();

    if (surveyError) {
      return NextResponse.json({ error: surveyError.message }, { status: 500 });
    }

    // Create questions if provided
    if (questions && questions.length > 0) {
      const questionsData = questions.map((q: any, index: number) => ({
        survey_id: survey.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || null,
        category: q.category,
        order_number: q.order_number || index + 1,
        is_required: q.is_required !== undefined ? q.is_required : true,
      }));

      const { error: questionsError } = await supabase
        .from('survey_questions')
        .insert(questionsData);

      if (questionsError) {
        return NextResponse.json({ error: questionsError.message }, { status: 500 });
      }
    }

    return NextResponse.json(survey, { status: 201 });
  } catch (error: any) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, is_active } = body;

    const { data: survey, error } = await supabase
      .from('surveys')
      .update({
        is_active,
        ...(is_active === false && { closed_at: new Date().toISOString() }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(survey);
  } catch (error: any) {
    console.error('Error updating survey:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
