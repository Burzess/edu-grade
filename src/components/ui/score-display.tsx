"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'

interface ScoreDisplayProps {
    score: number | null
    feedback: string | null
    isGraded: boolean
    questionType: 'essay' | 'multiple_choice'
}

export function ScoreDisplay({ score, feedback, isGraded, questionType }: ScoreDisplayProps) {
    if (!isGraded) {
        return (
            <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-orange-700">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {questionType === 'essay' 
                                ? 'Menunggu penilaian AI...' 
                                : 'Menunggu penilaian otomatis...'
                            }
                        </span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-700 bg-green-50 border-green-200'
        if (score >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
        return 'text-red-700 bg-red-50 border-red-200'
    }

    const getScoreIcon = (score: number) => {
        if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
        if (score >= 60) return <Trophy className="h-4 w-4 text-yellow-600" />
        return <XCircle className="h-4 w-4 text-red-600" />
    }

    return (
        <Card className={`${getScoreColor(score || 0)}`}>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Score Display */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getScoreIcon(score || 0)}
                            <span className="font-medium">
                                {questionType === 'essay' ? 'Penilaian AI' : 'Penilaian Otomatis'}
                            </span>
                        </div>
                        <Badge variant="outline" className="font-bold">
                            {score}/100
                        </Badge>
                    </div>

                    {/* Feedback */}
                    {feedback && (
                        <div className="text-sm">
                            <div className="font-medium mb-1">Feedback:</div>
                            <div className="whitespace-pre-wrap">{feedback}</div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
