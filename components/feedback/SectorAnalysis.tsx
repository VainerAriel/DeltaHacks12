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

const getScoreBadgeBackground = (score: number): string => {
  if (score > 60) return 'bg-green-600 dark:bg-green-500';
  if (score < 50) return 'bg-red-600 dark:bg-red-500';
  return 'bg-yellow-600 dark:bg-yellow-500';
};

const renderSectorCard = (sectorKey: keyof typeof sectorLabels, sector: SectorScore) => {
  const label = sectorLabels[sectorKey];
  const score = sector.score;
  
  return (
    <Card key={sectorKey} className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{label.title}</CardTitle>
          <Badge 
            variant="outline"
            className={`${getScoreBadgeBackground(score)} text-white border-transparent`}
          >
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
};

export default function SectorAnalysis({ sectorScores, onTimeClick }: SectorAnalysisProps) {
  // Communication Style sectors: tone, fluency, vocabulary, pronunciation
  const communicationStyleSectors: Array<keyof typeof sectorLabels> = ['tone', 'fluency', 'vocabulary', 'pronunciation'];
  
  // Other sectors: engagement, confidence
  const otherSectors: Array<keyof typeof sectorLabels> = ['engagement', 'confidence'];
  
  return (
    <div className="space-y-6">
      {/* Communication Style Section */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Style</CardTitle>
          <CardDescription>
            How you express yourself through language and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communicationStyleSectors.map((sectorKey) => 
              renderSectorCard(sectorKey, sectorScores[sectorKey])
            )}
          </div>
        </CardContent>
      </Card>

      {/* Other Sectors */}
      {otherSectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Presence & Delivery</CardTitle>
            <CardDescription>
              Your physical presence and connection with the audience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherSectors.map((sectorKey) => 
                renderSectorCard(sectorKey, sectorScores[sectorKey])
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
