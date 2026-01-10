import { NextRequest, NextResponse } from 'next/server';

/**
 * Process a recording through the full pipeline:
 * 1. Extract biometrics (Presage)
 * 2. Transcribe audio (Whisper)
 * 3. Analyze and generate feedback (Gemini)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: 'recordingId is required' },
        { status: 400 }
      );
    }

    const results: {
      biometrics?: any;
      transcription?: any;
      feedback?: any;
      error?: string;
    } = {};

    // Step 1: Extract biometrics
    try {
      const presageResponse = await fetch(`${request.nextUrl.origin}/api/presage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      });
      if (presageResponse.ok) {
        results.biometrics = await presageResponse.json();
      }
    } catch (error) {
      console.error('Presage processing error:', error);
      results.error = 'Failed to process biometrics';
    }

    // Step 2: Transcribe audio
    try {
      const whisperResponse = await fetch(`${request.nextUrl.origin}/api/whisper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      });
      if (whisperResponse.ok) {
        results.transcription = await whisperResponse.json();
      }
    } catch (error) {
      console.error('Whisper processing error:', error);
      results.error = results.error ? `${results.error}; Failed to transcribe` : 'Failed to transcribe';
    }

    // Step 3: Analyze and generate feedback
    if (results.biometrics && results.transcription) {
      try {
        const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordingId }),
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
