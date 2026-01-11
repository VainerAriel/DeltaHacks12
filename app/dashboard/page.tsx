'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Recording, RecordingStatus } from '@/types/recording';
import { FeedbackReport } from '@/types/feedback';
import { Video, Plus, TrendingUp, Loader2, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<(Recording & { feedback?: FeedbackReport })[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser({ name: data.name, email: data.email });
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [router]);

  const fetchRecordings = useCallback(async () => {
    try {
      const response = await fetch('/api/recordings');
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      } else if (response.status === 401) {
        // User is not authenticated, redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
    fetchRecordings();
  }, [fetchUser, fetchRecordings]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Clear user state and redirect to login
        setUser(null);
        router.push('/login');
      } else {
        console.error('Logout failed');
        // Still redirect to login even if API call fails
        router.push('/login');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect to login even if there's an error
      router.push('/login');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = (status: RecordingStatus) => {
    const variants: Record<RecordingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      [RecordingStatus.UPLOADING]: { label: 'Uploading', variant: 'outline' },
      [RecordingStatus.PROCESSING]: { label: 'Processing', variant: 'outline' },
      [RecordingStatus.EXTRACTING_BIOMETRICS]: { label: 'Extracting Data', variant: 'outline' },
      [RecordingStatus.TRANSCRIBING]: { label: 'Transcribing', variant: 'outline' },
      [RecordingStatus.ANALYZING]: { label: 'Analyzing', variant: 'outline' },
      [RecordingStatus.COMPLETE]: { label: 'Complete', variant: 'default' },
      [RecordingStatus.FAILED]: { label: 'Failed', variant: 'destructive' },
    };

    const config = variants[status] || { label: String(status), variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Group recordings by sessionId for job interview sessions
  const processRecordings = () => {
    const sessionMap = new Map<string, (Recording & { feedback?: FeedbackReport })[]>();
    const standaloneRecordings: (Recording & { feedback?: FeedbackReport })[] = [];
    
    recordings.forEach((recording) => {
      if (recording.sessionId) {
        if (!sessionMap.has(recording.sessionId)) {
          sessionMap.set(recording.sessionId, []);
        }
        sessionMap.get(recording.sessionId)!.push(recording);
      } else {
        standaloneRecordings.push(recording);
      }
    });
    
    // Create session entries (one per session, using first recording)
    const sessionEntries = Array.from(sessionMap.entries()).map(([sessionId, sessionRecordings]) => {
      // Sort by creation time to get the first question
      const sorted = sessionRecordings.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const firstRecording = sorted[0];
      
      // Calculate average score for the session
      const scores = sessionRecordings
        .map(r => r.feedback?.overallScore)
        .filter((s): s is number => s !== undefined);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : undefined;
      
      return {
        ...firstRecording,
        isSession: true,
        sessionSize: sessionRecordings.length,
        sessionAvgScore: avgScore,
        feedback: avgScore ? {
          ...firstRecording.feedback,
          overallScore: avgScore,
        } as FeedbackReport : firstRecording.feedback,
      };
    });
    
    // Combine standalone recordings and session entries, sort by date
    return [...standaloneRecordings, ...sessionEntries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const displayRecordings = processRecordings();

  // Prepare data for progress chart
  const progressData = displayRecordings
    .filter((r) => r.feedback)
    .map((r) => ({
      date: new Date(r.createdAt).toLocaleDateString(),
      score: r.feedback?.overallScore || 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || 'User'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/practice">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Practice Session
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{displayRecordings.length}</p>
                </div>
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">
                    {displayRecordings.filter((r) => r.feedback).length > 0
                      ? Math.round(
                          displayRecordings
                            .filter((r) => r.feedback)
                            .reduce((sum, r) => sum + (r.feedback?.overallScore || 0), 0) /
                            displayRecordings.filter((r) => r.feedback).length
                        )
                      : 'N/A'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">
                    {displayRecordings.filter((r) => r.status === RecordingStatus.COMPLETE).length}
                  </p>
                </div>
                <Badge variant="default">Complete</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        {progressData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Your speaking score improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Score"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recordings List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Recordings</CardTitle>
            <CardDescription>View and manage your practice sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {displayRecordings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start your first practice session to see your recordings here
                </p>
                <Link href="/practice">
                  <Button>Start Practicing</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRecordings.map((recording) => {
                  const isSession = 'isSession' in recording && (recording as any).isSession;
                  const sessionSize = 'sessionSize' in recording ? (recording as any).sessionSize : undefined;
                  
                  return (
                    <Card
                      key={recording.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => router.push(`/feedback/${recording.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16 bg-muted">
                              <AvatarFallback>
                                <Video className="w-8 h-8" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {isSession ? 'Job Interview Session' : 'Practice Session'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(recording.createdAt).toLocaleDateString()} at{' '}
                                {new Date(recording.createdAt).toLocaleTimeString()}
                                {isSession && sessionSize && (
                                  <span> • {sessionSize} question{sessionSize !== 1 ? 's' : ''}</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(recording.status)}
                                {recording.feedback && (
                                  <span className={`text-lg font-bold ${getScoreColor(recording.feedback.overallScore)}`}>
                                    {recording.feedback.overallScore}/100
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
