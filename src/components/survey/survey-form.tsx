'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { LIKERT_SCALE, RATING_SCALE, SurveyQuestion } from '@/types/survey';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SurveyFormProps {
  surveyId: string;
  surveyTitle: string;
  surveyDescription: string;
  questions: SurveyQuestion[];
  onSubmitSuccess?: () => void;
}

export default function SurveyForm({
  surveyId,
  surveyTitle,
  surveyDescription,
  questions,
  onSubmitSuccess,
}: SurveyFormProps) {
  const [responses, setResponses] = useState<{ [key: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResponseChange = (questionId: string, value: any, isText: boolean = false) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: isText ? { text: value } : { value },
    }));
  };

  const validateForm = () => {
    const requiredQuestions = questions.filter(q => q.is_required);
    const missingResponses = requiredQuestions.filter(q => {
      const response = responses[q.id];
      if (!response) return true;
      if (q.question_type === 'text') {
        return !response.text || response.text.trim() === '';
      }
      return !response.value;
    });

    if (missingResponses.length > 0) {
      toast.error('Harap jawab semua pertanyaan yang wajib diisi');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const formattedResponses = Object.entries(responses).map(([questionId, response]) => ({
        question_id: questionId,
        answer_value: response.value || null,
        answer_text: response.text || null,
      }));

      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: surveyId,
          responses: formattedResponses,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim survei');
      }

      toast.success('Terima kasih! Survei Anda telah berhasil dikirim');
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      toast.error(error.message || 'Terjadi kesalahan saat mengirim survei');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const response = responses[question.id];

    switch (question.question_type) {
      case 'likert':
        return (
          <RadioGroup
            value={response?.value?.toString()}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="space-y-2"
          >
            {LIKERT_SCALE.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value.toString()} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'rating':
        return (
          <RadioGroup
            value={response?.value?.toString()}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="space-y-2"
          >
            {RATING_SCALE.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value.toString()} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple_choice':
        return (
          <RadioGroup
            value={response?.value}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="space-y-2"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'text':
        return (
          <Textarea
            value={response?.text || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value, true)}
            placeholder="Tulis jawaban Anda di sini..."
            rows={4}
            className="w-full"
          />
        );

      default:
        return null;
    }
  };

  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as { [key: string]: SurveyQuestion[] });

  const categoryLabels: { [key: string]: string } = {
    usability: 'Kemudahan Penggunaan (Usability)',
    functionality: 'Fungsi Sistem (Functionality)',
    design: 'Desain Antarmuka (Design)',
    satisfaction: 'Kepuasan Pengguna (Satisfaction)',
    general: 'Pertanyaan Umum',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{surveyTitle}</CardTitle>
          <CardDescription>{surveyDescription}</CardDescription>
        </CardHeader>
      </Card>

      {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryQuestions.map((question, index) => (
              <div key={question.id} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
                <Label className="text-base font-medium">
                  {index + 1}. {question.question_text}
                  {question.is_required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderQuestion(question)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Survei'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
