'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SurveyStatistics } from '@/types/survey';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SurveyResultsProps {
  statistics: SurveyStatistics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SurveyResults({ statistics }: SurveyResultsProps) {
  const categoryLabels: { [key: string]: string } = {
    usability: 'Kemudahan Penggunaan',
    functionality: 'Fungsi Sistem',
    design: 'Desain Antarmuka',
    satisfaction: 'Kepuasan Pengguna',
    general: 'Pertanyaan Umum',
  };

  const groupedStats = statistics.question_stats.reduce((acc, stat) => {
    if (!acc[stat.category]) {
      acc[stat.category] = [];
    }
    acc[stat.category].push(stat);
    return acc;
  }, {} as { [key: string]: typeof statistics.question_stats });

  const renderLikertRatingStats = (stat: any) => {
    const chartData = stat.response_distribution?.map((item: any) => ({
      name: `Nilai ${item.value}`,
      count: item.count,
      percentage: item.percentage.toFixed(1),
    })) || [];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Rata-rata Rating</p>
            <p className="text-3xl font-bold text-primary">
              {stat.average_rating?.toFixed(2) || 'N/A'} / 5
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Total Responden</p>
            <p className="text-3xl font-bold">{stat.total_responses}</p>
          </div>
        </div>

        <div className="space-y-2">
          {stat.response_distribution?.map((item: any) => (
            <div key={item.value} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Nilai {item.value}</span>
                <span>{item.count} ({item.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Jumlah Responden" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const renderMultipleChoiceStats = (stat: any) => {
    const chartData = stat.response_distribution?.map((item: any, index: number) => ({
      name: item.value,
      value: item.count,
      percentage: item.percentage.toFixed(1),
    })) || [];

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Total Responden</p>
          <p className="text-3xl font-bold">{stat.total_responses}</p>
        </div>

        <div className="space-y-2">
          {stat.response_distribution?.map((item: any, index: number) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{item.value}</span>
                <span>{item.count} ({item.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const renderTextStats = (stat: any) => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Total Responden: {stat.text_responses?.length || 0}
        </p>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {stat.text_responses && stat.text_responses.length > 0 ? (
            stat.text_responses.map((response: string, index: number) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <p className="text-sm">{response}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">Tidak ada jawaban</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Hasil Survei</CardTitle>
          <CardDescription>
            Total Responden: <span className="font-bold text-lg">{statistics.total_responses}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {Object.entries(groupedStats).map(([category, stats]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-bold">{categoryLabels[category]}</h2>
          
          {stats.map((stat, index) => (
            <Card key={stat.question_id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {index + 1}. {stat.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(stat.question_type === 'likert' || stat.question_type === 'rating') &&
                  renderLikertRatingStats(stat)}
                {stat.question_type === 'multiple_choice' && renderMultipleChoiceStats(stat)}
                {stat.question_type === 'text' && renderTextStats(stat)}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
