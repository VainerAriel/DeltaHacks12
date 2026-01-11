'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SectorScore } from '@/types/feedback';
import ConfidenceEngagementChart from './ConfidenceEngagementChart';

interface BusinessPresentationFeedbackProps {
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

export default function BusinessPresentationFeedback({
  sectorScores,
  confidenceData,
  engagementData,
  onTimeClick,
}: BusinessPresentationFeedbackProps) {
  // Group tone, pronunciation, and vocabulary together
  const groupedScores = {
    tone: sectorScores.tone,
    pronunciation: sectorScores.pronunciation,
    vocabulary: sectorScores.vocabulary,
  };

  // Focus on confidence and engagement
  const primaryScores = {
    confidence: sectorScores.confidence,
    engagement: sectorScores.engagement,
  };

  return (
    <div className="space-y-6">
      {/* Confidence and Engagement Charts - Above feedback */}
      <ConfidenceEngagementChart
        confidenceData={confidenceData}
        engagementData={engagementData}
        onTimeClick={onTimeClick}
      />

      {/* Primary Focus: Confidence and Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Confidence</CardTitle>
              <Badge variant={getScoreBadgeVariant(primaryScores.confidence.score)} className="text-lg">
                {primaryScores.confidence.score}/100
              </Badge>
            </div>
            <CardDescription>
              Presence, composure, and delivery confidence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={primaryScores.confidence.score} className="h-3" />
            <div>
              <p className="text-base leading-relaxed">
                {primaryScores.confidence.feedback}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Engagement</CardTitle>
              <Badge variant={getScoreBadgeVariant(primaryScores.engagement.score)} className="text-lg">
                {primaryScores.engagement.score}/100
              </Badge>
            </div>
            <CardDescription>
              Energy, connection, and audience interest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={primaryScores.engagement.score} className="h-3" />
            <div>
              <p className="text-base leading-relaxed">
                {primaryScores.engagement.feedback}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped: Tone, Pronunciation, and Vocabulary */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
          <CardDescription>
            Tone, pronunciation, and vocabulary analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-2 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tone</CardTitle>
                  <Badge variant={getScoreBadgeVariant(groupedScores.tone.score)}>
                    {groupedScores.tone.score}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={groupedScores.tone.score} className="h-2" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {groupedScores.tone.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pronunciation</CardTitle>
                  <Badge variant={getScoreBadgeVariant(groupedScores.pronunciation.score)}>
                    {groupedScores.pronunciation.score}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={groupedScores.pronunciation.score} className="h-2" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {groupedScores.pronunciation.feedback}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Vocabulary</CardTitle>
                  <Badge variant={getScoreBadgeVariant(groupedScores.vocabulary.score)}>
                    {groupedScores.vocabulary.score}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={groupedScores.vocabulary.score} className="h-2" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {groupedScores.vocabulary.feedback}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Fluency (still included but less prominent) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fluency</CardTitle>
              <CardDescription>
                Smoothness and flow of speech
              </CardDescription>
            </div>
            <Badge variant={getScoreBadgeVariant(sectorScores.fluency.score)}>
              {sectorScores.fluency.score}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={sectorScores.fluency.score} className="h-2" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {sectorScores.fluency.feedback}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
