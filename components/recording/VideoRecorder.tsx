'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Upload, Play, Pause, Square, Loader2 } from 'lucide-react';

interface VideoRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  onUploadComplete?: (recordingId: string) => void;
}

export default function VideoRecorder({ onRecordingComplete, onUploadComplete }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedTime, setRecordedTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        chunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordedTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordedTime((prev) => prev + 1);
      }, 1000);
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
        timerRef.current = setInterval(() => {
          setRecordedTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
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
      }
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

  const uploadVideo = async (file: File | Blob) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file, 'recording.webm');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const response = await new Promise<{ recordingId: string; videoUrl: string; status: string }>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      setUploadProgress(100);
      
      if (onUploadComplete) {
        onUploadComplete(response.recordingId);
      }
    } catch (err) {
      setError('Failed to upload video. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

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
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isRecording ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <Video className="w-16 h-16 mx-auto mb-2" />
                    <p>Camera preview will appear here</p>
                    <p className="text-sm mt-2">or drag and drop a video file</p>
                  </div>
                )}
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
                onClick={() => uploadVideo(videoBlob!)}
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
