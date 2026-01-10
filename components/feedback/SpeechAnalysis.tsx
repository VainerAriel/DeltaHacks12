'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Transcription } from '@/types/transcription';

interface SpeechAnalysisProps {
  transcription: Transcription;
}

const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically', 'kind of', 'sort of'];

export default function SpeechAnalysis({ transcription }: SpeechAnalysisProps) {
  // Highlight filler words in transcription
  const highlightFillerWords = (text: string): React.ReactNode[] => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
      if (fillerWords.includes(cleanWord)) {
        return (
          <span
            key={index}
            className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded"
          >
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  // Get most used words (excluding common words)
  const getMostUsedWords = (words: string[], limit: number = 10): { word: string; count: number }[] => {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    const wordCount: Record<string, number> = {};

    words.forEach((word) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
      if (cleanWord.length > 2 && !commonWords.includes(cleanWord) && !fillerWords.includes(cleanWord)) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });

    return Object.entries(wordCount)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const mostUsedWords = getMostUsedWords(transcription.words.map(w => w.word));

  return (
    <div className="space-y-4">
      {/* Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Speech Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Words Per Minute</p>
              <p className="text-2xl font-bold">{transcription.metrics.wpm}</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Filler Words</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {transcription.metrics.fillerWordsCount}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Longest Pause</p>
              <p className="text-2xl font-bold">{transcription.metrics.longestPause}s</p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Total Pauses</p>
              <p className="text-2xl font-bold">{transcription.metrics.totalPauses}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription</CardTitle>
          <CardDescription>
            Filler words are highlighted in yellow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-md min-h-[200px]">
            <p className="text-sm leading-relaxed">
              {highlightFillerWords(transcription.text)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Word Cloud Card */}
      {mostUsedWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used Words</CardTitle>
            <CardDescription>Key vocabulary from your speech</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mostUsedWords.map(({ word, count }) => (
                <Badge
                  key={word}
                  variant="secondary"
                  className="text-sm py-1 px-2"
                >
                  {word} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
