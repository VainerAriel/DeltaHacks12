import { NextRequest, NextResponse } from 'next/server';

/**
 * Process a recording through the full pipeline:
 * 1. Transcribe audio (Whisper)
 * 2. Analyze and generate feedback (Gemini)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId, scenario } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: 'recordingId is required' },
        { status: 400 }
      );
    }

    const results: {
      transcription?: unknown;
      feedback?: unknown;
      error?: string;
    } = {};

    // Step 1: Transcribe audio
    const transcriptionResult = await Promise.allSettled([
      fetch(`${request.nextUrl.origin}/api/whisper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      }),
    ]).then(([result]) => result);

    // Process transcription result
    if (transcriptionResult.status === 'fulfilled' && transcriptionResult.value.ok) {
      try {
        results.transcription = await transcriptionResult.value.json();
      } catch (error) {
        console.error('Transcription response parsing error:', error);
        results.error = 'Failed to transcribe';
      }
    } else {
      let errorDetails = 'Request failed';
      if (transcriptionResult.status === 'rejected') {
        errorDetails = transcriptionResult.reason?.message || String(transcriptionResult.reason);
      } else if (transcriptionResult.status === 'fulfilled') {
        // Request completed but with error status
        try {
          const errorText = await transcriptionResult.value.text();
          errorDetails = `HTTP ${transcriptionResult.value.status}: ${errorText}`;
        } catch (e) {
          errorDetails = `HTTP ${transcriptionResult.value.status}: Failed to read error response`;
        }
      }
      console.error('Whisper transcription error:', errorDetails);
      results.error = `Failed to transcribe: ${errorDetails}`;
    }

    // Step 2: Analyze and generate feedback
    if (results.transcription) {
      try {
        const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordingId, scenario }),
        });
        if (geminiResponse.ok) {
          results.feedback = await geminiResponse.json();
        }
      } catch (error) {
        console.error('Gemini processing error:', error);
        results.error = results.error ? `${results.error}; Failed to analyze` : 'Failed to analyze';
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Processing pipeline error:', error);
    return NextResponse.json(
      { error: 'Failed to process recording' },
      { status: 500 }
    );
  }
}
