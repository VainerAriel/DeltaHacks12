'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobInterviewPracticePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to setup page
    router.replace('/practice/job-interview/setup');
  }, [router]);

  return null;
}
