'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, BarChart3 } from 'lucide-react';
import SurveyResults from '@/components/survey/survey-results';
import { SurveyStatistics } from '@/types/survey';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GuruSurveyPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [statistics, setStatistics] = useState<SurveyStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurveyId) {
      fetchStatistics(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  const fetchSurveys = async () => {
    try {
      setIsLoading(true);
      
      // Temporarily disable auth check - fetch directly
      const res = await fetch('/api/survey');
      const data = await res.json();

      if (res.ok) {
        const surveyList = Array.isArray(data) ? data : [data];
        setSurveys(surveyList);
        if (surveyList.length > 0) {
          setSelectedSurveyId(surveyList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async (surveyId: string) => {
    try {
      setIsLoadingStats(true);
      const res = await fetch(`/api/survey/statistics?survey_id=${surveyId}`);
      const data = await res.json();

      if (res.ok) {
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const exportToCSV = () => {
    if (!statistics) return;

    let csv = 'Pertanyaan,Kategori,Tipe,Rata-rata,Total Responden\n';

    statistics.question_stats.forEach((stat) => {
      const avgRating = stat.average_rating?.toFixed(2) || 'N/A';
      csv += `"${stat.question_text}","${stat.category}","${stat.question_type}","${avgRating}","${stat.total_responses}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-results-${selectedSurveyId}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Belum Ada Survei</CardTitle>
            <CardDescription>
              Belum ada survei yang dibuat. Hubungi admin untuk membuat survei.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Hasil Survei
        </h1>
        <p className="text-muted-foreground">
          Analisis dan statistik dari survei evaluasi sistem
        </p>
      </div>

      <Tabs value={selectedSurveyId} onValueChange={setSelectedSurveyId} className="space-y-6">
        <TabsList>
          {surveys.map((survey) => (
            <TabsTrigger key={survey.id} value={survey.id}>
              {survey.title} (Iterasi {survey.iteration})
            </TabsTrigger>
          ))}
        </TabsList>

        {surveys.map((survey) => (
          <TabsContent key={survey.id} value={survey.id}>
            {isLoadingStats ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : statistics ? (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{statistics.survey_title}</CardTitle>
                        <CardDescription>{statistics.survey_description}</CardDescription>
                      </div>
                      <Button onClick={exportToCSV} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Responden</p>
                        <p className="text-3xl font-bold text-primary">{statistics.total_responses}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Iterasi</p>
                        <p className="text-3xl font-bold">{statistics.iteration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Pertanyaan</p>
                        <p className="text-3xl font-bold">{statistics.question_stats.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <SurveyResults statistics={statistics} />
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Gagal memuat statistik</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
