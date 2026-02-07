'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import SurveyForm from '@/components/survey/survey-form';
import { SurveyWithQuestions } from '@/types/survey';
import { useRouter } from 'next/navigation';

export default function SurveyPage() {
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(false); // Changed to false

  useEffect(() => {
    fetchActiveSurvey();
  }, []);

  const fetchActiveSurvey = async () => {
    try {
      setIsLoading(true);
      
      // Get active survey
      const surveyRes = await fetch('/api/survey?includeQuestions=true');
      const surveyData = await surveyRes.json();

      if (surveyRes.ok && surveyData) {
        const activeSurvey = Array.isArray(surveyData) ? surveyData[0] : surveyData;
        setSurvey(activeSurvey);

        // Temporarily disabled submission check to preview UI
        // if (activeSurvey?.id) {
        //   setIsCheckingSubmission(true);
        //   const submitRes = await fetch(`/api/survey/submit?survey_id=${activeSurvey.id}`);
        //   const submitData = await submitRes.json();
        //   
        //   if (submitRes.ok) {
        //     setHasSubmitted(submitData.hasSubmitted);
        //   }
        //   setIsCheckingSubmission(false);
        // }
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitSuccess = () => {
    setHasSubmitted(true);
  };

  if (isLoading || isCheckingSubmission) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Tidak Ada Survei Aktif</CardTitle>
            <CardDescription>
              Saat ini tidak ada survei yang tersedia. Silakan cek kembali nanti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Terima Kasih!</CardTitle>
            <CardDescription className="text-base">
              Anda telah menyelesaikan survei ini. Respons Anda sangat berarti untuk pengembangan sistem Edu-Grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Survei ini adalah bagian dari penelitian pengembangan sistem dengan model prototyping.
              Masukan Anda akan membantu kami meningkatkan kualitas sistem.
            </p>
            <Button onClick={() => router.push('/siswa')}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Survei Evaluasi Sistem</h1>
        <p className="text-muted-foreground">
          Bantuan Anda dalam mengisi survei ini sangat penting untuk pengembangan sistem Edu-Grade
        </p>
      </div>

      <SurveyForm
        surveyId={survey.id}
        surveyTitle={survey.title}
        surveyDescription={survey.description}
        questions={survey.questions}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  );
}
