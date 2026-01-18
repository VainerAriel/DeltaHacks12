'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Recording, RecordingStatus } from '@/types/recording';
import { FeedbackReport } from '@/types/feedback';
import { Video, Plus, TrendingUp, Loader2, LogOut } from 'lucide-react';

// Dynamically import recharts to reduce initial bundle size and compilation time
const ProgressChart = dynamic(
  () => import('recharts').then((mod) => {
    const { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = mod;
    return function ProgressChartComponent({ data }: { data: Array<{ date: string; score: number; timestamp: number; sessionNumber?: number; fullDate?: string }> }) {
      // Custom tooltip with better formatting
      const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
              <p className="text-sm font-semibold mb-1">{data.fullDate || data.date}</p>
              {data.sessionNumber && (
                <p className="text-xs text-muted-foreground mb-1">Session #{data.sessionNumber}</p>
              )}
              <p className="text-sm">
                <span className="font-medium text-primary">Score: </span>
                <span className="font-bold">{data.score}/100</span>
              </p>
            </div>
          );
        }
        return null;
      };

      // Format X-axis label - show session number
      const formatXAxisLabel = (value: any) => {
        return `Session ${value}`;
      };

      // Calculate ticks based on data length
      // If more than 10 sessions, show every nth session to avoid overlap
      const dataLength = data.length;
      let ticks: number[];
      let interval: number | 'preserveStartEnd';
      
      if (dataLength <= 10) {
        // Show all sessions if 10 or fewer
        ticks = data.map((_, index) => index + 1);
        interval = 0;
      } else {
        // Calculate interval to show approximately 10 ticks
        const tickInterval = Math.ceil(dataLength / 10);
        // Generate ticks: first, last, and every nth in between
        ticks = [];
        for (let i = 0; i < dataLength; i += tickInterval) {
          ticks.push(i + 1);
        }
        // Always include the last session
        if (ticks[ticks.length - 1] !== dataLength) {
          ticks.push(dataLength);
        }
        interval = 'preserveStartEnd';
      }

      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
            <XAxis 
              dataKey="sessionNumber" 
              tickFormatter={formatXAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              type="number"
              domain={[0.5, 'dataMax + 0.5']}
              allowDecimals={false}
              interval={interval}
              ticks={ticks}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#scoreGradient)"
              name="Score"
              dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="0"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    };
  }),
  { 
    ssr: false, // Disable SSR for charts (they're client-only anyway)
    loading: () => <div className="h-[350px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
  }
);

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
    // Clear global loading state when dashboard loads
    sessionStorage.removeItem('globalLoading');
    sessionStorage.removeItem('loadingMessage');
    
    // Fetch user and recordings in parallel for better performance
    Promise.all([fetchUser(), fetchRecordings()]);
  }, [fetchUser, fetchRecordings]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are included
      });
      
      // Clear user state immediately
      setUser(null);
      setRecordings([]);
      
      if (response.ok) {
        // Force a hard refresh to ensure middleware sees the cleared cookie
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Still redirect to home even if API call fails
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect to home even if there's an error
      window.location.href = '/';
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

  // Prepare data for progress chart - sort by actual timestamp, not date string
  const progressData = displayRecordings
    .filter((r) => r.feedback)
    .map((r, index) => {
      const date = new Date(r.createdAt);
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        }),
        score: r.feedback?.overallScore || 0,
        timestamp: date.getTime(),
        sessionNumber: index + 1,
        fullDate: date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
      };
    })
    // Sort by timestamp (oldest first) to show chronological progression
    .sort((a, b) => a.timestamp - b.timestamp)
    // Update session numbers after sorting
    .map((item, index) => ({
      ...item,
      sessionNumber: index + 1,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">Loading Dashboard</p>
            <p className="text-sm text-muted-foreground">Fetching your practice sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
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
                  {displayRecordings.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {displayRecordings.length <= 5 ? "Keep it up!" :
                       displayRecordings.length <= 10 ? "You're on a roll!" :
                       displayRecordings.length <= 20 ? "You're crushing it!" :
                       "You're a practice champion!"}
                    </p>
                  )}
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
                  {displayRecordings.filter((r) => r.feedback).length > 0 && (() => {
                    const avgScore = Math.round(
                      displayRecordings
                        .filter((r) => r.feedback)
                        .reduce((sum, r) => sum + (r.feedback?.overallScore || 0), 0) /
                      displayRecordings.filter((r) => r.feedback).length
                    );
                    return (
                      <p className="text-xs text-muted-foreground mt-1">
                        {avgScore >= 80 ? "Outstanding work!" :
                         avgScore >= 60 ? "Great progress!" :
                         "Every session helps you improve!"}
                      </p>
                    );
                  })()}
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
                  {displayRecordings.filter((r) => r.status === RecordingStatus.COMPLETE).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Well done!</p>
                  )}
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
              <CardDescription>See how far you&apos;ve come on your speaking journey</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressChart data={progressData} />
            </CardContent>
          </Card>
        )}

        {/* Recordings List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Recordings</CardTitle>
            <CardDescription>Celebrate your practice and track your growth</CardDescription>
          </CardHeader>
          <CardContent>
            {displayRecordings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to start your journey? Your first practice session awaits!</h3>
                <p className="text-muted-foreground mb-4">
                  Click the button below to begin practicing and track your progress
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
                      className="cursor-pointer hover:border-primary transition-all duration-200 hover:-translate-y-1"
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">
                                  {isSession ? 'Job Interview Session' : 'Practice Session'}
                                </h3>
                                {isSession && sessionSize && (
                                  <Badge variant="secondary" className="text-xs">
                                    {sessionSize} Question{sessionSize !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(recording.createdAt).toLocaleDateString()} at{' '}
                                {new Date(recording.createdAt).toLocaleTimeString()}
                              </p>
                              {isSession && recording.questionText && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                  &ldquo;{recording.questionText}&rdquo;
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(recording.status)}
                                {recording.feedback && (
                                  <span className={`text-lg font-bold ${getScoreColor(recording.feedback.overallScore)}`}>
                                    {isSession && 'sessionSize' in recording 
                                      ? `Avg: ${recording.feedback.overallScore}/100`
                                      : `${recording.feedback.overallScore}/100`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="hover:translate-x-1 transition-transform duration-200">
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
