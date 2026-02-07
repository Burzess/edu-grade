// Types untuk sistem survei penelitian prototyping

export type QuestionType = 'likert' | 'multiple_choice' | 'text' | 'rating';

export interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[]; // untuk multiple choice
  category: 'usability' | 'functionality' | 'design' | 'satisfaction' | 'general';
  order_number: number;
  is_required: boolean;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
  question_id: string;
  answer_value: string | number;
  answer_text?: string;
  created_at: string;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  iteration: number; // untuk tracking iterasi prototyping
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

export interface SurveySubmission {
  survey_id: string;
  responses: {
    question_id: string;
    answer_value: string | number;
    answer_text?: string;
  }[];
}

export interface SurveyStatistics {
  survey_id: string;
  survey_title: string;
  survey_description: string;
  iteration: number;
  total_responses: number;
  created_at: string;
  closed_at?: string;
  question_stats: {
    question_id: string;
    question_text: string;
    question_type: QuestionType;
    category: string;
    total_responses: number;
    average_rating?: number;
    response_distribution?: {
      value: string | number;
      count: number;
      percentage: number;
    }[];
    text_responses?: string[];
  }[];
}

// Likert scale options
export const LIKERT_SCALE = [
  { value: 1, label: 'Sangat Tidak Setuju' },
  { value: 2, label: 'Tidak Setuju' },
  { value: 3, label: 'Netral' },
  { value: 4, label: 'Setuju' },
  { value: 5, label: 'Sangat Setuju' },
];

// Rating scale options
export const RATING_SCALE = [
  { value: 1, label: '1 - Sangat Buruk' },
  { value: 2, label: '2 - Buruk' },
  { value: 3, label: '3 - Cukup' },
  { value: 4, label: '4 - Baik' },
  { value: 5, label: '5 - Sangat Baik' },
];
