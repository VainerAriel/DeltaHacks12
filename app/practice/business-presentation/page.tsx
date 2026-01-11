'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoRecorder from '@/components/recording/VideoRecorder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Upload, FileText, X } from 'lucide-react';

type Step = 'upload-prompt' | 'setup' | 'recording';

export default function BusinessPresentationPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('upload-prompt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  
  // Reference document state
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceType, setReferenceType] = useState<'slides' | 'script' | null>(null);
  const [referenceDocumentId, setReferenceDocumentId] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  
  // Setup state
  const [minDuration, setMinDuration] = useState<string>('');
  const [maxDuration, setMaxDuration] = useState<string>('');

  // Pre-populate from query params (for Practice Again)
  useEffect(() => {
    const refDocId = searchParams.get('referenceDocumentId');
    const refType = searchParams.get('referenceType') as 'slides' | 'script' | null;
    const minDur = searchParams.get('minDuration');
    const maxDur = searchParams.get('maxDuration');

    if (refDocId) {
      setReferenceDocumentId(refDocId);
      if (refType) {
        setReferenceType(refType);
      }
      // User can choose to use existing or upload new - don't auto-skip to setup
    }
    if (minDur) {
      setMinDuration(minDur);
    }
    if (maxDur) {
      setMaxDuration(maxDur);
    }
  }, [searchParams]);

  const handleReferenceUpload = async () => {
    if (!referenceFile || !referenceType) return;

    setIsUploadingReference(true);
    try {
      const formData = new FormData();
      formData.append('file', referenceFile);
      formData.append('type', referenceType);

      const response = await fetch('/api/upload-reference', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload reference document';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setReferenceDocumentId(result.documentId);
      setStep('setup');
    } catch (error) {
      console.error('Error uploading reference:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload reference document');
    } finally {
      setIsUploadingReference(false);
    }
  };

  const handleSkipReference = () => {
    setStep('setup');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type on client side
      const validTypes = ['application/pdf', 'text/plain'];
      const validExtensions = ['.pdf', '.txt'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);
      
      if (!isValidType) {
        alert('Invalid file type. Please upload a PDF or TXT file.');
        // Reset the input
        event.target.value = '';
        return;
      }
      
      setReferenceFile(file);
    }
  };

  const handleProceedToRecording = () => {
    setStep('recording');
  };

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
          scenario: 'business-presentation'
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

  // Render upload prompt step
  if (step === 'upload-prompt') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
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
                <h1 className="text-3xl font-bold mb-2">Business Presentation Practice</h1>
                <p className="text-muted-foreground">
                  Deliver a clear and engaging presentation to your team
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Reference Material (Optional)</CardTitle>
              <CardDescription>
                Would you like to upload a slide deck or script to get feedback on how well you follow it?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referenceDocumentId && referenceType && (
                <div className="p-4 bg-muted rounded-md border border-primary/20">
                  <p className="text-sm font-medium mb-2">Previous Reference File</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    You have a {referenceType === 'slides' ? 'slide deck' : 'script'} from your previous practice session.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Use existing reference document
                        setStep('setup');
                      }}
                    >
                      Use Previous File
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Clear and allow new upload
                        setReferenceDocumentId(null);
                        setReferenceFile(null);
                      }}
                    >
                      Upload Different File
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex gap-4">
                  <Button
                    variant={referenceType === 'slides' ? 'default' : 'outline'}
                    onClick={() => {
                      setReferenceType('slides');
                      // Clear existing reference if changing type
                      if (referenceDocumentId) {
                        setReferenceDocumentId(null);
                        setReferenceFile(null);
                      }
                    }}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Slide Deck
                  </Button>
                  <Button
                    variant={referenceType === 'script' ? 'default' : 'outline'}
                    onClick={() => {
                      setReferenceType('script');
                      // Clear existing reference if changing type
                      if (referenceDocumentId) {
                        setReferenceDocumentId(null);
                        setReferenceFile(null);
                      }
                    }}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Script
                  </Button>
                </div>

                {referenceType && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={referenceFileInputRef}
                        type="file"
                        accept="application/pdf,text/plain,.pdf,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => referenceFileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {referenceFile ? referenceFile.name : `Choose ${referenceType === 'slides' ? 'Slide Deck' : 'Script'} File (PDF or TXT)`}
                      </Button>
                    </div>
                    {referenceFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm flex-1">{referenceFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReferenceFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {referenceFile && referenceType && (
                    <Button
                      onClick={handleReferenceUpload}
                      disabled={isUploadingReference}
                      className="flex-1"
                    >
                      {isUploadingReference ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Continue
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleSkipReference}
                    className="flex-1"
                  >
                    Skip & Continue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render setup step
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep('upload-prompt')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Recording Setup</h1>
                <p className="text-muted-foreground">
                  Configure your recording options
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Duration Constraints (Optional)</CardTitle>
                  <CardDescription>
                    Set minimum and maximum duration for your presentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Minimum Duration (seconds)</label>
                      <Input
                        type="number"
                        placeholder="e.g., 60"
                        value={minDuration}
                        onChange={(e) => setMinDuration(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Maximum Duration (seconds)</label>
                      <Input
                        type="number"
                        placeholder="e.g., 300"
                        value={maxDuration}
                        onChange={(e) => setMaxDuration(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleProceedToRecording}
                className="w-full"
                size="lg"
              >
                Continue to Recording
              </Button>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Business Presentation</CardTitle>
                  <CardDescription>
                    Deliver a clear and engaging presentation to your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Suggested Prompt:</p>
                    <p className="text-sm italic">
                      "Present a new product idea to your team. Explain the problem it solves and its key features."
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">Tips:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Structure your presentation clearly</li>
                      <li>Use visual aids effectively</li>
                      <li>Engage with your audience</li>
                      <li>Speak with confidence and authority</li>
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

  // Render recording step
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep('setup')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Business Presentation Practice</h1>
              <p className="text-muted-foreground">
                Deliver a clear and engaging presentation to your team
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Recording Area */}
          <div className="lg:col-span-2">
            <VideoRecorder
              onUploadComplete={handleUploadComplete}
              minDuration={minDuration ? parseInt(minDuration, 10) : undefined}
              maxDuration={maxDuration ? parseInt(maxDuration, 10) : undefined}
              referenceDocumentId={referenceDocumentId || undefined}
              scenario="business-presentation"
            />
            
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
                <CardTitle>Business Presentation</CardTitle>
                <CardDescription>
                  Deliver a clear and engaging presentation to your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Suggested Prompt:</p>
                  <p className="text-sm italic">
                    &quot;Present a new product idea to your team. Explain the problem it solves and its key features.&quot;
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Tips:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Structure your presentation clearly</li>
                    <li>Use visual aids effectively</li>
                    <li>Engage with your audience</li>
                    <li>Speak with confidence and authority</li>
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
