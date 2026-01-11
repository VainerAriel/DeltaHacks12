'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Upload, Play, Pause, Square, Loader2 } from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  onUploadComplete?: (recordingId: string) => void;
  sessionId?: string;
  questionText?: string;
  maxDuration?: number; // Maximum recording duration in seconds
}

export default function VideoRecorder({ onRecordingComplete, onUploadComplete, sessionId, questionText, maxDuration }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch((err) => {
          console.error('Error playing video:', err);
        });
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        chunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        
        // Clear the video srcObject to show the recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
        
        // Auto-upload the recording
        console.log('[VideoRecorder] Recording stopped, auto-uploading...');
        uploadVideo(blob).catch((err) => {
          console.error('[VideoRecorder] Auto-upload failed:', err);
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordedTime(0);

      // Initialize countdown timer if maxDuration is provided
      if (maxDuration) {
        setRemainingTime(maxDuration);
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordedTime((prev) => prev + 1);
      }, 1000);

      // Start countdown timer if maxDuration is provided (update every 100ms for smooth animation)
      if (maxDuration) {
        countdownTimerRef.current = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev === null || prev <= 0.1) {
              // Stop recording when countdown reaches 0
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              stopRecording();
              return 0;
            }
            return prev - 0.1;
          });
        }, 100);
      }
    } catch (err) {
      setError('Failed to access camera/microphone. Please check permissions.');
      console.error('Error accessing media devices:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Clear any existing interval before creating a new one
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
          setRecordedTime((prev) => prev + 1);
        }, 1000);
        // Resume countdown timer if maxDuration is provided (update every 100ms for smooth animation)
        if (maxDuration && remainingTime !== null && remainingTime > 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          countdownTimerRef.current = setInterval(() => {
            setRemainingTime((prev) => {
              if (prev === null || prev <= 0.1) {
                // Stop recording when countdown reaches 0
                if (countdownTimerRef.current) {
                  clearInterval(countdownTimerRef.current);
                  countdownTimerRef.current = null;
                }
                stopRecording();
                return 0;
              }
              return prev - 0.1;
            });
          }, 100);
        }
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Pause countdown timer
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setRemainingTime(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, WebM, or MOV files.');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('File size exceeds 100MB limit.');
      return;
    }

    setError(null);
    setVideoBlob(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Auto-upload
    await uploadVideo(file);
  };

  const uploadVideo = useCallback(async (file: File | Blob) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('[VideoRecorder] Starting upload, file size:', file.size, 'bytes');
      console.log('[VideoRecorder] File type:', file instanceof File ? file.type : 'Blob');
      const formData = new FormData();
      
      // Use the original filename if it's a File, otherwise use a default name
      const fileName = file instanceof File ? file.name : 'recording.webm';
      formData.append('video', file, fileName);
      
      // Add sessionId and questionText if provided
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }
      if (questionText) {
        formData.append('questionText', questionText);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const response = await new Promise<{ recordingId: string; videoUrl: string; status: string }>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          console.log('[VideoRecorder] Upload response status:', xhr.status);
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('[VideoRecorder] Upload successful:', result);
              resolve(result);
            } catch (e) {
              console.error('[VideoRecorder] Failed to parse response:', e);
              reject(new Error('Invalid response from server'));
            }
          } else {
            const errorText = xhr.responseText || 'Upload failed';
            console.error('[VideoRecorder] Upload failed with status:', xhr.status, errorText);
            reject(new Error(`Upload failed: ${xhr.status} - ${errorText}`));
          }
        });

        xhr.addEventListener('error', (e) => {
          console.error('[VideoRecorder] Upload network error:', e);
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          console.error('[VideoRecorder] Upload aborted');
          reject(new Error('Upload was aborted'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      setUploadProgress(100);
      
      if (onUploadComplete) {
        onUploadComplete(response.recordingId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video. Please try again.';
      setError(errorMessage);
      console.error('[VideoRecorder] Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, sessionId, questionText]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      const fakeEvent = {
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(fakeEvent);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Video Preview */}
          <div
            className="relative w-full bg-black rounded-lg overflow-hidden aspect-video"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full ${isRecording ? 'object-cover' : 'object-contain'}`}
              style={{ display: isRecording ? 'block' : 'none' }}
            />
            {videoUrl && !isRecording && (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
            {!isRecording && !videoUrl && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Video className="w-16 h-16 mx-auto mb-2" />
                  <p>Camera preview will appear here</p>
                  <p className="text-sm mt-2">or drag and drop a video file</p>
                </div>
              </div>
            )}
            {/* Countdown Progress Bar Overlay */}
            {isRecording && maxDuration && remainingTime !== null && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{
                    width: `${(remainingTime / maxDuration) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Timer */}
          {isRecording && (
            <div className="text-center">
              <div className="text-2xl font-mono font-bold">
                {formatTime(recordedTime)}
              </div>
              {isPaused && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Paused</p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2 justify-center flex-wrap">
            {!isRecording && !videoUrl && (
              <>
                <Button onClick={startRecording} className="gap-2">
                  <Video className="w-4 h-4" />
                  Start Recording
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Video
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}

            {isRecording && (
              <>
                <Button
                  variant="outline"
                  onClick={pauseRecording}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopRecording}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}

            {videoUrl && !isUploading && (
              <Button
                onClick={() => {
                  if (videoBlob) {
                    uploadVideo(videoBlob);
                  }
                }}
                disabled={!videoBlob}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Recording
                  </>
                )}
              </Button>
            )}

            {videoUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  setVideoUrl(null);
                  setVideoBlob(null);
                  setRecordedTime(0);
                  setError(null);
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
