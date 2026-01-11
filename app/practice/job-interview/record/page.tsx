'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface RecordingInfo {
  recordingId: string;
  questionText: string;
}

function JobInterviewRecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [sessionId] = useState<string>(() => generateUUID());
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const videoRecorderKey = useRef(0); // Force re-render of VideoRecorder

  useEffect(() => {
    // Get questions from URL params
    const questionsParam = searchParams.get('questions');
    if (questionsParam) {
      try {
        const parsedQuestions = JSON.parse(decodeURIComponent(questionsParam));
        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
          setQuestions(parsedQuestions);
        } else {
          router.push('/practice/job-interview/setup');
        }
      } catch (error) {
        console.error('Error parsing questions:', error);
        router.push('/practice/job-interview/setup');
      }
    } else {
      router.push('/practice/job-interview/setup');
    }
  }, [searchParams, router]);

  const handleUploadComplete = async (uploadedRecordingId: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    setCurrentRecordingId(uploadedRecordingId);
    
    // Store recording info
    const newRecording: RecordingInfo = {
      recordingId: uploadedRecordingId,
      questionText: currentQuestion,
    };
    setRecordings([...recordings, newRecording]);
    setHasRecorded(true);

    // Start processing this recording
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId: uploadedRecordingId,
          scenario: 'job-interview',
        }),
      });

      if (!response.ok) {
        console.error('Processing failed for recording:', uploadedRecordingId);
      }
    } catch (error) {
      console.error('Error processing recording:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setHasRecorded(false);
      setCurrentRecordingId(null);
      videoRecorderKey.current += 1; // Force VideoRecorder to reset
    } else {
      // All questions answered, redirect to feedback
      // Use the first recording's ID to access the session
      if (recordings.length > 0) {
        router.push(`/feedback/${recordings[0].recordingId}`);
      }
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const canProceed = hasRecorded && !isProcessing;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/practice/job-interview/setup')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Interview Practice</h1>
            <p className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Recording Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Question Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Question {currentQuestionIndex + 1}</CardTitle>
                <CardDescription>
                  Read the question carefully before recording your answer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-muted rounded-lg">
                  <p className="text-lg leading-relaxed">{currentQuestion}</p>
                </div>
              </CardContent>
            </Card>

            {/* Video Recorder */}
            <Card>
              <CardHeader>
                <CardTitle>Record Your Answer</CardTitle>
                <CardDescription>
                  Click &quot;Start Record&quot; when you&apos;re ready to answer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VideoRecorder
                  key={videoRecorderKey.current}
                  sessionId={sessionId}
                  questionText={currentQuestion}
                  onUploadComplete={handleUploadComplete}
                />
              </CardContent>
            </Card>

            {/* Status and Navigation */}
            {hasRecorded && (
              <Card className={isProcessing ? 'border-primary' : 'border-green-200 dark:border-green-800'}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <div>
                            <p className="font-medium">Processing your answer...</p>
                            <p className="text-sm text-muted-foreground">
                              This may take a moment
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              Answer recorded!
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isLastQuestion
                                ? 'Ready to review your session'
                                : 'Ready to move to next question'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!canProceed}
                      size="lg"
                    >
                      {isLastQuestion ? 'Submit and Review' : 'Submit Answer & Move On'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Progress Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>
                  {currentQuestionIndex} of {questions.length} questions answered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative pt-4 pb-8">
                  {/* Progress bar */}
                  <div className="h-3 bg-muted rounded-full relative overflow-visible w-full">
                    {/* Completed portion */}
                    <div
                      className="h-3 bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
                    />
                  </div>
                  
                  {/* Question markers */}
                  <div className="relative -mt-3 w-full">
                    {questions.map((_, index) => {
                      const percentage = index === 0 ? 0 : (index / questions.length) * 100;
                      const isAnswered = recordings.some((r, idx) => idx === index);
                      const isCurrent = index === currentQuestionIndex;
                      const isPast = index < currentQuestionIndex;
                      
                      return (
                        <div
                          key={index}
                          className="absolute flex flex-col items-center"
                          style={{ 
                            left: `${percentage}%`, 
                            transform: 'translateX(-50%)',
                            top: '0'
                          }}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 transition-all ${
                              isCurrent || isPast
                                ? 'bg-foreground border-foreground'
                                : 'bg-background border-muted-foreground'
                            }`}
                            style={{ marginTop: '-2px' }}
                          />
                          <span className="text-xs mt-1 font-medium">
                            Q{index + 1}
                          </span>
                        </div>
                      );
                    })}
                    {/* Review marker at 100% */}
                    <div
                      className="absolute flex flex-col items-center"
                      style={{ 
                        left: '100%', 
                        transform: 'translateX(-50%)',
                        top: '0'
                      }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border-2 bg-background border-muted-foreground"
                        style={{ marginTop: '-2px' }}
                      />
                      <span className="text-xs mt-1 font-medium">
                        Review
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobInterviewRecordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <JobInterviewRecordContent />
    </Suspense>
  );
}
