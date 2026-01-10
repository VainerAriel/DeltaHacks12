import { GoogleGenerativeAI } from '@google/generative-ai';
import { BiometricData } from '@/types/biometrics';
import { Transcription } from '@/types/transcription';
import { FeedbackReport, Recommendation } from '@/types/feedback';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY not set. Analysis will use mock data.');
}

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

/**
 * Analyze presentation using Google Gemini API
 * @param biometricData - Biometric data from Presage
 * @param transcription - Transcription data from ElevenLabs
 * @returns Structured feedback report
 */
export async function analyzePresentation(
  biometricData: BiometricData,
  transcription: Transcription
): Promise<FeedbackReport> {
  if (!genAI) {
    // Return mock data if API key is not set
    return generateMockFeedbackReport(biometricData, transcription);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Calculate average metrics for prompt
    const avgHeartRate = biometricData.heartRate.length > 0
      ? biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length
      : 70; // Default heart rate if no data
    const avgBreathing = biometricData.breathing.length > 0
      ? biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length
      : 12; // Default breathing rate if no data
    const expressions = biometricData.facialExpressions.map(e => e.expression);

    const prompt = `You are analyzing a public speaking practice session for an ESL learner.

Biometric Data:
- Average Heart Rate: ${avgHeartRate.toFixed(1)} bpm
- Average Breathing Rate: ${avgBreathing.toFixed(1)} breaths/min
- Facial Expressions: ${expressions.join(', ')}

Speech Data:
- Words Per Minute: ${transcription.metrics.wpm}
- Filler Words Count: ${transcription.metrics.fillerWordsCount}
- Longest Pause: ${transcription.metrics.longestPause}s
- Transcription: "${transcription.text}"

Provide structured feedback on:
1) Physical confidence indicators (heart rate, breathing, facial expressions)
2) Speech quality (pace, clarity, filler words, pauses)
3) Overall presentation effectiveness
4) Specific actionable recommendations for ESL learners

Format your response as JSON with this exact structure:
{
  "overallScore": <number 1-100>,
  "biometricInsights": {
    "heartRateAnalysis": "<string>",
    "breathingPattern": "<string>",
    "facialExpressionNotes": "<string>"
  },
  "speechInsights": {
    "wpm": ${transcription.metrics.wpm},
    "fillerWordsCount": ${transcription.metrics.fillerWordsCount},
    "pauseAnalysis": "<string>",
    "clarityScore": <number 1-100>,
    "pronunciationNotes": "<string>"
  },
  "recommendations": [
    {
      "category": "<physical|speech|content|general>",
      "title": "<string>",
      "description": "<string>",
      "priority": "<high|medium|low>"
    }
  ]
}

Only return the JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
      console.error('Response text:', jsonText.substring(0, 500)); // Log first 500 chars
      // Return mock data on parse error
      return generateMockFeedbackReport(biometricData, transcription);
    }

    // Map to FeedbackReport structure
    return {
      id: `feedback-${Date.now()}`,
      recordingId: '', // Will be set by caller
      overallScore: parsed.overallScore || 70,
      biometricInsights: {
        heartRateAnalysis: parsed.biometricInsights?.heartRateAnalysis || '',
        breathingPattern: parsed.biometricInsights?.breathingPattern || '',
        facialExpressionNotes: parsed.biometricInsights?.facialExpressionNotes || '',
      },
      speechInsights: {
        wpm: parsed.speechInsights?.wpm || transcription.metrics.wpm,
        fillerWordsCount: parsed.speechInsights?.fillerWordsCount || transcription.metrics.fillerWordsCount,
        pauseAnalysis: parsed.speechInsights?.pauseAnalysis || '',
        clarityScore: parsed.speechInsights?.clarityScore || 75,
        pronunciationNotes: parsed.speechInsights?.pronunciationNotes || '',
      },
      recommendations: parsed.recommendations || [],
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error analyzing presentation:', error);
    // Return mock data on error
    return generateMockFeedbackReport(biometricData, transcription);
  }
}

/**
 * Generate mock feedback report for testing
 */
function generateMockFeedbackReport(
  biometricData: BiometricData,
  transcription: Transcription
): FeedbackReport {
  const avgHeartRate = biometricData.heartRate.length > 0
    ? biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length
    : 70; // Default heart rate if no data
  const avgBreathing = biometricData.breathing.length > 0
    ? biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length
    : 12; // Default breathing rate if no data

  const recommendations: Recommendation[] = [
    {
      category: 'physical',
      title: 'Practice Deep Breathing',
      description: 'Your breathing rate is slightly elevated. Practice deep breathing exercises before speaking to help calm your nerves.',
      priority: 'medium',
    },
    {
      category: 'speech',
      title: 'Reduce Filler Words',
      description: `You used ${transcription.metrics.fillerWordsCount} filler words. Try pausing instead of using "um" or "uh".`,
      priority: 'high',
    },
    {
      category: 'speech',
      title: 'Adjust Speaking Pace',
      description: `Your speaking pace is ${transcription.metrics.wpm} WPM. Aim for 140-160 WPM for clear communication.`,
      priority: 'medium',
    },
  ];

  // Calculate overall score based on metrics
  let score = 70;
  if (avgHeartRate < 80) score += 10;
  if (transcription.metrics.fillerWordsCount < 5) score += 10;
  if (transcription.metrics.wpm >= 140 && transcription.metrics.wpm <= 160) score += 10;
  score = Math.min(100, score);

  return {
    id: `feedback-${Date.now()}`,
    recordingId: '',
    overallScore: score,
    biometricInsights: {
      heartRateAnalysis: `Average heart rate of ${avgHeartRate.toFixed(1)} bpm indicates ${avgHeartRate > 85 ? 'some nervousness' : 'relative calm'}.`,
      breathingPattern: `Breathing rate of ${avgBreathing.toFixed(1)} breaths/min is ${avgBreathing > 15 ? 'slightly elevated' : 'within normal range'}.`,
      facialExpressionNotes: 'Facial expressions show a mix of confidence and concern. Practice maintaining a calm, confident expression.',
    },
    speechInsights: {
      wpm: transcription.metrics.wpm,
      fillerWordsCount: transcription.metrics.fillerWordsCount,
      pauseAnalysis: `You had ${transcription.metrics.totalPauses} noticeable pauses, with the longest being ${transcription.metrics.longestPause}s.`,
      clarityScore: 75,
      pronunciationNotes: 'Overall pronunciation is clear. Continue practicing to improve fluency.',
    },
    recommendations,
    createdAt: new Date(),
  };
}
