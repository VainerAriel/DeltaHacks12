'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import BiometricChart from '@/components/feedback/BiometricChart';
import SpeechAnalysis from '@/components/feedback/SpeechAnalysis';
import SectorAnalysis from '@/components/feedback/SectorAnalysis';
import { FeedbackReport } from '@/types/feedback';
import { BiometricData } from '@/types/biometrics';
import { Transcription } from '@/types/transcription';
import { Recording, RecordingStatus } from '@/types/recording';
import { Loader2, ArrowLeft, RotateCcw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  // Session mode state
  const [isSessionMode, setIsSessionMode] = useState(false);
  const [sessionRecordings, setSessionRecordings] = useState<(Recording & { feedback?: FeedbackReport })[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Track retry attempts to prevent infinite loops
  const retryCountRef = useRef<number>(0);
  const maxRetries = 20; // Maximum 20 retries (about 1 minute with 3s intervals)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const feedbackRef = useRef<FeedbackReport | null>(null);

  const loadRecordingData = useCallback(async (recId: string, scenarioOverride?: string, sessionDataOverride?: (Recording & { feedback?: FeedbackReport })[]) => {
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

    // Check if feedback exists in session recordings first (for session mode)
    // Use sessionDataOverride if provided (for initial load), otherwise use state
    const recordingsToCheck = sessionDataOverride || sessionRecordings;
    if (isSessionMode && recordingsToCheck.length > 0) {
      const sessionRecording = recordingsToCheck.find(r => r.id === recId);
      if (sessionRecording?.feedback) {
        feedbackRef.current = sessionRecording.feedback;
        setFeedback(sessionRecording.feedback);
        return; // Feedback found in session recordings, no need to fetch
      }
    }

    // Fetch feedback from API
    const feedbackRes = await fetch(`/api/feedback/${recId}`);
    if (feedbackRes.ok) {
      const feedbackData = await feedbackRes.json();
      feedbackRef.current = feedbackData;
      setFeedback(feedbackData);
      setProcessingError(null); // Clear any previous processing errors
    } else {
      // If feedback doesn't exist, trigger processing
      // Use scenarioOverride if provided, otherwise check if recording has questionText
      const rec = recordingsToCheck.find(r => r.id === recId) || recording;
      const scenario = scenarioOverride || (rec?.questionText ? 'job-interview' : undefined);
      
      try {
        const processRes = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordingId: recId, scenario }),
        });
        
        const processResult = await processRes.json();
        
        // Check if feedback was successfully generated
        if (processResult.feedback) {
          // Feedback was generated, set it and clear any errors
          feedbackRef.current = processResult.feedback;
          setFeedback(processResult.feedback);
          setProcessingError(null);
          return;
        }
        
        // Check if there was an error, especially API key issues
        if (processResult.error) {
          if (processResult.error.includes('Failed to analyze') || processResult.error.includes('API key')) {
            setProcessingError('Unable to generate feedback: API key error. Please check your Gemini API key configuration.');
            return; // Don't retry if it's an API key issue
          } else {
            setProcessingError('Failed to generate feedback. Please try again later.');
            return;
          }
        }
        
        // If biometrics and transcription succeeded but feedback wasn't generated yet, retry after delay
        if (processResult.biometrics && processResult.transcription && !processResult.feedback) {
          retryCountRef.current += 1;
          if (retryCountRef.current >= maxRetries) {
            setProcessingError('Processing is taking longer than expected. Please refresh the page or try again later.');
            return;
          }
          pollingTimeoutRef.current = setTimeout(() => {
            loadRecordingData(recId, scenario, sessionDataOverride);
          }, 3000);
        } else if (!processResult.biometrics || !processResult.transcription) {
          setProcessingError('Failed to process recording data. Please try again later.');
        }
      } catch (err) {
        console.error('Error processing recording:', err);
        setProcessingError('Failed to process recording. Please try again later.');
      }
    }
  }, [isSessionMode, sessionRecordings, recording]);

  const fetchFeedbackData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // Fetch recording
      const recordingRes = await fetch(`/api/recordings/${recordingId}`);
      if (!recordingRes.ok) throw new Error('Failed to fetch recording');
      const recordingData = await recordingRes.json();
      setRecording(recordingData);
      
      // Stop polling if recording is failed or complete (and we have feedback)
      if (recordingData.status === RecordingStatus.FAILED || 
          (recordingData.status === RecordingStatus.COMPLETE && feedbackRef.current)) {
        retryCountRef.current = 0; // Reset retry count
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
          pollingTimeoutRef.current = null;
        }
      }
      
      // Generate presigned URL if it's an S3 URL
      if (recordingData.videoUrl) {
        try {
          const presignedRes = await fetch('/api/videos/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: recordingData.videoUrl }),
          });
          if (presignedRes.ok) {
            const { presignedUrl } = await presignedRes.json();
            setVideoUrl(presignedUrl);
          } else {
            // Fallback to original URL if presigned URL generation fails
            setVideoUrl(recordingData.videoUrl);
          }
        } catch (error) {
          console.error('Failed to get presigned URL:', error);
          setVideoUrl(recordingData.videoUrl);
        }
      }

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
          
          // Check if feedback exists in session data and set it immediately
          const currentSessionRecording = sessionData.find((r: Recording & { feedback?: FeedbackReport }) => r.id === recordingId);
          if (currentSessionRecording?.feedback) {
            feedbackRef.current = currentSessionRecording.feedback;
            setFeedback(currentSessionRecording.feedback);
          }
          
          // Load data for the current recording
          await loadRecordingData(recordingId, recordingData.questionText ? 'job-interview' : undefined, sessionData);
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
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [recordingId, loadRecordingData]);

  useEffect(() => {
    // Reset retry count when recording ID changes
    retryCountRef.current = 0;
    
    fetchFeedbackData();
    
    // Cleanup: clear any pending polling timeouts
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]); // Only depend on recordingId, not fetchFeedbackData

  const switchToQuestion = async (index: number) => {
    if (index < 0 || index >= sessionRecordings.length) return;
    
    setCurrentQuestionIndex(index);
    const targetRecording = sessionRecordings[index];
    setRecording(targetRecording);
    
    // Generate presigned URL for the new recording
    if (targetRecording.videoUrl) {
      try {
        const presignedRes = await fetch('/api/videos/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: targetRecording.videoUrl }),
        });
        if (presignedRes.ok) {
          const { presignedUrl } = await presignedRes.json();
          setVideoUrl(presignedUrl);
        } else {
          setVideoUrl(targetRecording.videoUrl);
        }
      } catch (error) {
        console.error('Failed to get presigned URL:', error);
        setVideoUrl(targetRecording.videoUrl);
      }
    }
    
    // If feedback is already in the session recording, set it immediately
    if (targetRecording.feedback) {
      feedbackRef.current = targetRecording.feedback;
      setFeedback(targetRecording.feedback);
    }
    
    // Load data for the new recording (biometrics, transcription, and feedback if not already set)
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

        {/* Question Navigation for Session Mode - Moved to top for better visibility */}
        {isSessionMode && sessionRecordings.length > 1 && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => switchToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="text-center flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Interview Question</p>
                  <p className="text-lg font-semibold">
                    {currentQuestionIndex + 1} of {sessionRecordings.length}
                  </p>
                  {recording?.questionText && (
                    <p className="text-sm text-muted-foreground mt-2 px-4 line-clamp-2">
                      {recording.questionText}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => switchToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === sessionRecordings.length - 1}
                  className="shrink-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                    {feedback.sectorScores 
                      ? 'Average of 6 Sector Scores'
                      : 'Based on biometric data and speech analysis'}
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

        {/* Processing Error Alert */}
        {processingError && !feedback && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-1">Feedback Generation Failed</h3>
                  <p className="text-sm text-muted-foreground">{processingError}</p>
                  {processingError.includes('API key') && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Please update your GEMINI_API_KEY in your environment variables and restart the server.
                    </p>
                  )}
                </div>
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
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
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
                  <source src={videoUrl} type="video/webm" />
                  <source src={videoUrl} type="video/mp4" />
                  <source src={videoUrl} type="video/quicktime" />
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

        {/* Sector Analysis */}
        {feedback && feedback.sectorScores && (
          <SectorAnalysis 
            sectorScores={feedback.sectorScores}
            confidenceData={feedback.confidenceData}
            engagementData={feedback.engagementData}
            onTimeClick={handleTimeClick}
          />
        )}

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
                {(feedback.recommendations || []).filter(rec => rec != null).map((rec, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{rec?.title || 'Recommendation'}</h3>
                        <Badge
                          variant={
                            rec?.priority === 'high'
                              ? 'destructive'
                              : rec?.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {rec?.priority || 'medium'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec?.description || ''}</p>
                      {rec?.category && (
                        <Badge variant="outline" className="mt-2">
                          {rec.category}
                        </Badge>
                      )}
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
