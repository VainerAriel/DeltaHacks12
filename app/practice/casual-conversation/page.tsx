'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function CasualConversationPracticePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const handleUploadComplete = async (uploadedRecordingId: string) => {
    setRecordingId(uploadedRecordingId);
    setIsProcessing(true);
    setProcessingStatus('Uploading video...');

    try {
      // Start processing pipeline
      setProcessingStatus('Processing video...');
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recordingId: uploadedRecordingId,
          scenario: 'casual-conversation'
        }),
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const result = await response.json();

      if (result.error) {
        setProcessingStatus(`Error: ${result.error}`);
      } else {
        setProcessingStatus('Processing complete!');
        // Redirect to feedback page after a short delay
        setTimeout(() => {
          router.push(`/feedback/${uploadedRecordingId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingStatus('Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/practice')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Casual Conversation Practice</h1>
              <p className="text-muted-foreground">
                Practice natural conversation skills for everyday situations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Recording Area */}
          <div className="lg:col-span-2">
            <VideoRecorder onUploadComplete={handleUploadComplete} />
            
            {/* Processing Status */}
            {isProcessing && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Processing your recording...</p>
                      <p className="text-sm text-muted-foreground">{processingStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {recordingId && !isProcessing && processingStatus.includes('complete') && (
              <Card className="mt-4 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        Processing complete!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Redirecting to feedback page...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {recordingId && !isProcessing && processingStatus.includes('Error') && (
              <Card className="mt-4 border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        {processingStatus}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => router.push(`/feedback/${recordingId}`)}
                      >
                        View Recording Anyway
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Practice Scenario Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Casual Conversation</CardTitle>
                <CardDescription>
                  Practice natural conversation skills for everyday situations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Suggested Prompt:</p>
                  <p className="text-sm italic">
                    &quot;Have a conversation about your hobbies and interests. Keep it natural and engaging.&quot;
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Tips:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Speak naturally and relax</li>
                    <li>Use everyday vocabulary</li>
                    <li>Show interest in the topic</li>
                    <li>Practice active listening responses</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
