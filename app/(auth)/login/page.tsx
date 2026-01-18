'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Logging in...');
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          // User is already logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // User is not logged in, allow them to see the login page
          setCheckingAuth(false);
        }
      } catch (error) {
        // Error checking auth, allow them to see the login page
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Progress message cycling effect - MUST be called before any conditional returns
  useEffect(() => {
    if (!loading) return;
    
    const progressMessages = [
      'Login successful! Loading dashboard...',
      'Preparing your dashboard...',
      'Loading your practice sessions...',
      'Almost there...',
    ];
    
    let messageIndex = 0;
    setLoadingMessage(progressMessages[0]);
    
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % progressMessages.length;
      setLoadingMessage(progressMessages[messageIndex]);
    }, 2500);
    
    return () => clearInterval(messageInterval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (response.ok) {
        // Set global loading state that persists across navigation
        sessionStorage.setItem('globalLoading', 'true');
        sessionStorage.setItem('loadingMessage', 'Login successful! Loading dashboard...');
        
        // Keep loading state true and navigate - don't clear it
        router.push('/dashboard');
        
        // Loading will be cleared by GlobalLoading component when dashboard loads
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">Checking authentication</p>
            <p className="text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen loading overlay - shows immediately when loading */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground">
                {loadingMessage.includes('Login successful') || loadingMessage.includes('Preparing')
                  ? 'First-time compilation may take 15-20 seconds...' 
                  : loadingMessage.includes('Almost')
                  ? 'Just a moment longer...'
                  : 'Please wait...'}
              </p>
              <div className="w-64 h-1 bg-muted rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="rememberMe" className="text-sm font-medium cursor-pointer">
                Remember me
              </label>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don&apos;t have an account? </span>
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
