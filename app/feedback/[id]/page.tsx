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
import { Loader2, ArrowLeft, RotateCcw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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
  
  // Session mode state
  const [isSessionMode, setIsSessionMode] = useState(false);
  const [sessionRecordings, setSessionRecordings] = useState<(Recording & { feedback?: FeedbackReport })[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

      // Check if this is part of a session
      if (recordingData.sessionId) {
        setIsSessionMode(true);
        // Fetch all recordings in the session
        const sessionRes = await fetch(`/api/recordings/session/${recordingData.sessionId}`);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSessionRecordings(sessionData);
          
          // Find the index of the current recording
          const currentIndex = sessionData.findIndex((r: Recording) => r.id === recordingId);
          if (currentIndex !== -1) {
            setCurrentQuestionIndex(currentIndex);
          }
          
          // Load data for the current recording
          await loadRecordingData(recordingId, recordingData.questionText ? 'job-interview' : undefined);
        } else {
          // Fallback to single recording mode
          setIsSessionMode(false);
          await loadRecordingData(recordingId, recordingData.questionText ? 'job-interview' : undefined);
        }
      } else {
        // Single recording mode
        setIsSessionMode(false);
        await loadRecordingData(recordingId, recordingData.questionText ? 'job-interview' : undefined);
      }
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordingData = async (recId: string, scenarioOverride?: string) => {
    // Fetch biometric data
    const biometricRes = await fetch(`/api/biometrics/${recId}`);
    if (biometricRes.ok) {
      const biometricData = await biometricRes.json();
      setBiometricData(biometricData);
    }

    // Fetch transcription
    const transcriptionRes = await fetch(`/api/transcriptions/${recId}`);
    if (transcriptionRes.ok) {
      const transcriptionData = await transcriptionRes.json();
      setTranscription(transcriptionData);
    }

    // Fetch feedback
    const feedbackRes = await fetch(`/api/feedback/${recId}`);
    if (feedbackRes.ok) {
      const feedbackData = await feedbackRes.json();
      setFeedback(feedbackData);
    } else {
      // If feedback doesn't exist, trigger processing
      // Use scenarioOverride if provided, otherwise check if recording has questionText
      const rec = sessionRecordings.find(r => r.id === recId) || recording;
      const scenario = scenarioOverride || (rec?.questionText ? 'job-interview' : undefined);
      await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId: recId, scenario }),
      });
      // Retry fetching feedback after a delay
      setTimeout(() => loadRecordingData(recId, scenario), 3000);
    }
  };

  const switchToQuestion = async (index: number) => {
    if (index < 0 || index >= sessionRecordings.length) return;
    
    setCurrentQuestionIndex(index);
    const targetRecording = sessionRecordings[index];
    setRecording(targetRecording);
    
    // Load data for the new recording
    await loadRecordingData(targetRecording.id);
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

        {/* Overall Score - Show session average if in session mode */}
        {isSessionMode && sessionRecordings.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Overall Session Score</h2>
                  <p className="text-muted-foreground">
                    Average score across all {sessionRecordings.length} questions
                  </p>
                </div>
                <div className="text-center">
                  {(() => {
                    const scores = sessionRecordings
                      .map(r => r.feedback?.overallScore)
                      .filter((s): s is number => s !== undefined);
                    const avgScore = scores.length > 0
                      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                      : 0;
                    return (
                      <>
                        <div className={`text-6xl font-bold ${getScoreColor(avgScore)}`}>
                          {avgScore}
                        </div>
                        <Badge variant={getScoreBadgeVariant(avgScore)} className="mt-2">
                          {avgScore >= 80 ? 'Excellent' : avgScore >= 60 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="mt-4">
                {(() => {
                  const scores = sessionRecordings
                    .map(r => r.feedback?.overallScore)
                    .filter((s): s is number => s !== undefined);
                  const avgScore = scores.length > 0
                    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                    : 0;
                  return <Progress value={avgScore} className="h-3" />;
                })()}
              </div>
            </CardContent>
          </Card>
        ) : feedback ? (
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
        ) : null}

        {/* Question Navigation for Session Mode */}
        {isSessionMode && sessionRecordings.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => switchToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="text-center flex-1">
                  <p className="text-sm text-muted-foreground">Question</p>
                  <p className="text-lg font-semibold">
                    {currentQuestionIndex + 1} of {sessionRecordings.length}
                  </p>
                  {recording?.questionText && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl mx-auto">
                      {recording.questionText}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => switchToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === sessionRecordings.length - 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Display for Session Mode */}
        {isSessionMode && recording?.questionText && (
          <Card>
            <CardHeader>
              <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
              <CardDescription>The question you answered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-lg">{recording.questionText}</p>
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
