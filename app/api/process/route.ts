import { NextRequest, NextResponse } from 'next/server';

/**
 * Process a recording through the full pipeline:
 * 1. Extract biometrics (Presage)
 * 2. Transcribe audio (ElevenLabs)
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
      biometrics?: unknown;
      transcription?: unknown;
      feedback?: unknown;
      error?: string;
    } = {};

    // Step 1 & 2: Extract biometrics and transcribe audio in parallel for better performance
    const [presageResult, transcriptionResult] = await Promise.allSettled([
      fetch(`${request.nextUrl.origin}/api/presage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      }),
      fetch(`${request.nextUrl.origin}/api/whisper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      }),
    ]);

    // Process biometrics result
    if (presageResult.status === 'fulfilled' && presageResult.value.ok) {
      try {
        results.biometrics = await presageResult.value.json();
      } catch (error) {
        console.error('Presage response parsing error:', error);
        results.error = 'Failed to process biometrics';
      }
    } else {
      console.error('Presage processing error:', presageResult.status === 'rejected' ? presageResult.reason : 'Request failed');
      results.error = 'Failed to process biometrics';
    }

    // Process transcription result
    if (transcriptionResult.status === 'fulfilled' && transcriptionResult.value.ok) {
      try {
        results.transcription = await transcriptionResult.value.json();
      } catch (error) {
        console.error('Transcription response parsing error:', error);
        results.error = results.error ? `${results.error}; Failed to transcribe` : 'Failed to transcribe';
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
      console.error('ElevenLabs transcription error:', errorDetails);
      results.error = results.error ? `${results.error}; Failed to transcribe: ${errorDetails}` : `Failed to transcribe: ${errorDetails}`;
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
