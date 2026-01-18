'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  useEffect(() => {
    // Check for loading state in sessionStorage
    const checkLoading = () => {
      const isLoading = sessionStorage.getItem('globalLoading') === 'true';
      const message = sessionStorage.getItem('loadingMessage') || 'Loading...';
      if (isLoading) {
        setLoading(true);
        setLoadingMessage(message);
      } else {
        setLoading(false);
      }
    };

    checkLoading();

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = () => checkLoading();
    window.addEventListener('storage', handleStorageChange);

    // Check periodically (for same-tab updates)
    const interval = setInterval(checkLoading, 100);

    // Clear loading when route changes
    const handleRouteChange = () => {
      // Small delay to allow loading.tsx to take over
      setTimeout(() => {
        sessionStorage.removeItem('globalLoading');
        sessionStorage.removeItem('loadingMessage');
        setLoading(false);
      }, 500);
    };

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  // Progress message cycling
  useEffect(() => {
    if (!loading) return;

    const progressMessages = [
      'Login successful! Loading dashboard...',
      'Compiling dashboard (first time may take 15-20 seconds)...',
      'Preparing your dashboard...',
      'Loading your practice sessions...',
      'Almost there...',
    ];

    let messageIndex = 0;
    setLoadingMessage(progressMessages[0]);

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % progressMessages.length;
      setLoadingMessage(progressMessages[messageIndex]);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold">{loadingMessage}</p>
          <p className="text-sm text-muted-foreground">
            {loadingMessage.includes('Compiling')
              ? 'This is normal for first-time compilation in development mode'
              : 'Please wait...'}
          </p>
          <div className="w-64 h-1 bg-muted rounded-full overflow-hidden mt-2 mx-auto">
            <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
