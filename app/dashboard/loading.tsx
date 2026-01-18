'use client';

import { useState, useEffect } from 'react';

export default function DashboardLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    { title: 'Compiling dashboard...', subtitle: 'This may take a moment on first load' },
    { title: 'Loading components...', subtitle: 'Preparing your dashboard' },
    { title: 'Fetching your data...', subtitle: 'Getting your practice sessions ready' },
    { title: 'Almost there...', subtitle: 'Just a few more seconds' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[messageIndex];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold">{currentMessage.title}</p>
          <p className="text-sm text-muted-foreground">{currentMessage.subtitle}</p>
        </div>
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden mt-4">
          <div className="h-full bg-primary animate-pulse" style={{ width: '70%' }}></div>
        </div>
      </div>
    </div>
  );
}
