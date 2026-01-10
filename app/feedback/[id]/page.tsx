'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import BiometricChart from '@/components/feedback/BiometricChart';
import SpeechAnalysis from '@/components/feedback/SpeechAnalysis';
import { FeedbackReport } from '@/types/feedback';
import { BiometricData } from '@/types/biometrics';
import { Transcription } from '@/types/transcription';
import { Recording } from '@/types/recording';
import { Loader2, ArrowLeft, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbackData();
  }, [recordingId]);

  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recording
      const recordingRes = await fetch(`/api/recordings/${recordingId}`);
      if (!recordingRes.ok) throw new Error('Failed to fetch recording');
      const recordingData = await recordingRes.json();
      setRecording(recordingData);

      // Fetch biometric data
      const biometricRes = await fetch(`/api/biometrics/${recordingId}`);
      if (biometricRes.ok) {
        const biometricData = await biometricRes.json();
        setBiometricData(biometricData);
      }

      // Fetch transcription
      const transcriptionRes = await fetch(`/api/transcriptions/${recordingId}`);
      if (transcriptionRes.ok) {
        const transcriptionData = await transcriptionRes.json();
        setTranscription(transcriptionData);
      }

      // Fetch feedback
      const feedbackRes = await fetch(`/api/feedback/${recordingId}`);
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        setFeedback(feedbackData);
      } else {
        // If feedback doesn't exist, trigger processing
        await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordingId }),
        });
        // Retry fetching feedback after a delay
        setTimeout(fetchFeedbackData, 3000);
      }
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeClick = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Recording not found'}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Feedback Report</h1>
              <p className="text-muted-foreground">
                {new Date(recording.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push('/practice')} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Practice Again
          </Button>
        </div>

        {/* Overall Score */}
        {feedback && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Overall Score</h2>
                  <p className="text-muted-foreground">
                    Based on biometric data and speech analysis
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(feedback.overallScore)}`}>
                    {feedback.overallScore}
                  </div>
                  <Badge variant={getScoreBadgeVariant(feedback.overallScore)} className="mt-2">
                    {feedback.overallScore >= 80 ? 'Excellent' : feedback.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={feedback.overallScore} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Player */}
          <Card>
            <CardHeader>
              <CardTitle>Recording</CardTitle>
              <CardDescription>Click on the chart timeline to jump to specific moments</CardDescription>
            </CardHeader>
            <CardContent>
              {recording.videoUrl ? (
                <video
                  ref={videoRef}
                  src={recording.videoUrl}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                  playsInline
                  onError={(e) => {
                    console.error('Video load error:', e);
                    const video = e.currentTarget;
                    if (video.error) {
                      console.error('Video error code:', video.error.code);
                      console.error('Video error message:', video.error.message);
                    }
                  }}
                >
                  <source src={recording.videoUrl} type="video/webm" />
                  <source src={recording.videoUrl} type="video/mp4" />
                  <source src={recording.videoUrl} type="video/quicktime" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Video not available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biometric Chart */}
          {biometricData && (
            <BiometricChart biometricData={biometricData} onTimeClick={handleTimeClick} />
          )}
        </div>

        {/* Speech Analysis */}
        {transcription && <SpeechAnalysis transcription={transcription} />}

        {/* Insights and Recommendations */}
        {feedback && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biometric Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Physical Confidence Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Heart Rate Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.biometricInsights.heartRateAnalysis}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Breathing Pattern</h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.biometricInsights.breathingPattern}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Facial Expressions</h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.biometricInsights.facialExpressionNotes}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Speech Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Speech Quality Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Clarity Score</h3>
                    <Badge>{feedback.speechInsights.clarityScore}/100</Badge>
                  </div>
                  <Progress value={feedback.speechInsights.clarityScore} className="h-2" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Pause Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.speechInsights.pauseAnalysis}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Pronunciation Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {feedback.speechInsights.pronunciationNotes}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        {feedback && feedback.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Actionable Recommendations</CardTitle>
              <CardDescription>
                Focus on these areas to improve your speaking skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.recommendations.map((rec, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <Badge variant="outline" className="mt-2">
                        {rec.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
