'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SectorScore } from '@/types/feedback';

interface SectorAnalysisProps {
  sectorScores: {
    tone: SectorScore;
    fluency: SectorScore;
    vocabulary: SectorScore;
    pronunciation: SectorScore;
    engagement: SectorScore;
    confidence: SectorScore;
  };
  confidenceData?: Array<{ timestamp: number; confidence: number }>;
  engagementData?: Array<{ timestamp: number; engagement: number }>;
  onTimeClick?: (timestamp: number) => void;
}

const sectorLabels: Record<keyof SectorAnalysisProps['sectorScores'], { title: string; description: string }> = {
  tone: { title: 'Tone', description: 'Appropriateness and balance of vocal tone' },
  fluency: { title: 'Fluency', description: 'Smoothness and flow of speech' },
  vocabulary: { title: 'Vocabulary', description: 'Word choice and language clarity' },
  pronunciation: { title: 'Pronunciation', description: 'Clarity and accuracy of pronunciation' },
  engagement: { title: 'Engagement', description: 'Energy and connection with audience' },
  confidence: { title: 'Confidence', description: 'Presence and composure in delivery' },
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'destructive';
};

export default function SectorAnalysis({ sectorScores, onTimeClick }: SectorAnalysisProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>6 Sector Analysis</CardTitle>
        <CardDescription>
          Detailed breakdown of performance across key communication areas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(sectorLabels) as Array<keyof typeof sectorLabels>).map((sectorKey) => {
            const sector = sectorScores[sectorKey];
            const label = sectorLabels[sectorKey];
            const score = sector.score;
            
            return (
              <Card key={sectorKey} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{label.title}</CardTitle>
                    <Badge variant={getScoreBadgeVariant(score)}>
                      {score}/100
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {label.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Progress value={score} className="h-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sector.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
