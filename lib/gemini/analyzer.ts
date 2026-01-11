import { GoogleGenerativeAI } from '@google/generative-ai';
import { BiometricData } from '@/types/biometrics';
import { Transcription } from '@/types/transcription';
import { FeedbackReport, Recommendation } from '@/types/feedback';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY not set. Analysis will fail without API key.');
}

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

/**
 * Analyze presentation using Google Gemini API
 * @param biometricData - Biometric data from Presage
 * @param transcription - Transcription data from ElevenLabs
 * @param scenario - Optional scenario type (e.g., 'job-interview')
 * @param questionText - Optional question text (for job interview scenarios)
 * @param referenceContent - Optional reference content (slides/script text)
 * @param referenceType - Optional reference type ('slides' or 'script')
 * @param minDuration - Optional minimum duration in seconds
 * @param maxDuration - Optional maximum duration in seconds
 * @param actualDuration - Optional actual duration in seconds
 * @returns Structured feedback report
 */
export async function analyzePresentation(
  biometricData: BiometricData,
  transcription: Transcription,
  scenario?: string,
  questionText?: string,
  referenceContent?: string,
  referenceType?: 'slides' | 'script',
  minDuration?: number,
  maxDuration?: number,
  actualDuration?: number
): Promise<FeedbackReport> {
  if (!genAI) {
    throw new Error('GOOGLE_GEMINI_API_KEY is required but not set. Please configure it in your .env.local file.');
  }

  // Calculate average metrics for prompt
  const avgHeartRate = biometricData.heartRate.length > 0
    ? biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length
    : 70; // Default heart rate if no data
  const avgBreathing = biometricData.breathing.length > 0
    ? biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length
    : 12; // Default breathing rate if no data
  const expressions = biometricData.facialExpressions.map(e => e.expression);

  // Build prompt based on scenario
  let prompt: string;
  
  // Build reference comparison section if available
  let referenceSection = '';
  if (referenceContent && referenceType) {
    referenceSection = `

Reference ${referenceType === 'slides' ? 'Slide Deck' : 'Script'}:
"${referenceContent.substring(0, 5000)}"${referenceContent.length > 5000 ? '...' : ''}

IMPORTANT: Compare the presentation to the provided ${referenceType === 'slides' ? 'slide deck' : 'script'}.
Evaluate how well the presenter follows the ${referenceType === 'slides' ? 'slides' : 'script'}.
Note any deviations, missed points, or areas where they could better align with the reference material.
Include this comparison in your analysis.`;
  }
  
  // Build duration feedback section if constraints provided
  let durationSection = '';
  if (actualDuration !== undefined && (minDuration !== undefined || maxDuration !== undefined)) {
    const tooShort = minDuration !== undefined && actualDuration < minDuration;
    const tooLong = maxDuration !== undefined && actualDuration > maxDuration;
    
    if (tooShort || tooLong) {
      durationSection = `

Duration Analysis:
- Actual Duration: ${actualDuration} seconds
- Target Duration: ${minDuration !== undefined ? `Minimum: ${minDuration}s` : ''}${minDuration !== undefined && maxDuration !== undefined ? ', ' : ''}${maxDuration !== undefined ? `Maximum: ${maxDuration}s` : ''}
- Status: ${tooShort ? 'TOO SHORT' : tooLong ? 'TOO LONG' : 'WITHIN RANGE'}

Provide specific feedback on how to adjust the presentation length:
${tooShort ? '- Suggest what content to expand or add to meet the minimum duration' : ''}
${tooLong ? '- Suggest what content to trim or cut to meet the maximum duration' : ''}
Include duration-related recommendations in your response.`;
    }
  }
  
  if (scenario === 'job-interview' && questionText) {
    prompt = `You are analyzing a job interview practice session. The candidate answered a behavioral interview question.

Interview Question: "${questionText}"

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
1) Physical confidence indicators (heart rate, breathing, facial expressions) - assess interview presence
2) Speech quality (pace, clarity, filler words, pauses) - important for clear communication
3) Answer structure and content quality - how well they answered the behavioral question using STAR method
4) Interview-specific recommendations (confidence, clarity, structure, professionalism)${referenceSection}${durationSection}

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
  } else {
    prompt = `You are analyzing a public speaking practice session for an ESL learner.

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
4) Specific actionable recommendations for ESL learners${referenceSection}${durationSection}

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
  }

  // Try different model names in order of preference
  const modelNames = process.env.GEMINI_MODEL_NAME 
    ? [process.env.GEMINI_MODEL_NAME]
    : ['gemini-2.5-flash', 'gemini-1.0-pro', 'gemini-pro'];
  
  let lastError: Error | null = null;
  
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
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
        throw new Error('Failed to parse Gemini API response');
      }

      // Generate duration feedback if needed
      let durationFeedback: FeedbackReport['durationFeedback'] | undefined;
      if (actualDuration !== undefined && (minDuration !== undefined || maxDuration !== undefined)) {
        const tooShort = minDuration !== undefined && actualDuration < minDuration;
        const tooLong = maxDuration !== undefined && actualDuration > maxDuration;
        
        if (tooShort || tooLong) {
          let feedbackText = '';
          if (tooShort) {
            feedbackText = `Your presentation is ${minDuration - actualDuration} seconds too short. Consider expanding on key points, adding examples, or providing more detail to meet the minimum duration of ${minDuration} seconds.`;
          } else if (tooLong) {
            feedbackText = `Your presentation is ${actualDuration - maxDuration} seconds too long. Consider trimming less essential content, speaking more concisely, or cutting redundant points to meet the maximum duration of ${maxDuration} seconds.`;
          }
          
          durationFeedback = {
            actual: actualDuration,
            target: {
              ...(minDuration !== undefined && { min: minDuration }),
              ...(maxDuration !== undefined && { max: maxDuration }),
            },
            feedback: feedbackText,
          };
        }
      }
      
      // Generate reference adherence feedback if reference content exists
      let referenceAdherence: FeedbackReport['referenceAdherence'] | undefined;
      if (referenceContent && referenceType) {
        // Extract reference adherence from parsed response if available
        if (parsed.referenceAdherence) {
          referenceAdherence = parsed.referenceAdherence;
        } else {
          // Fallback: generate basic feedback from recommendations
          const contentRecommendations = parsed.recommendations?.filter((r: any) => 
            r.category === 'content' && 
            (r.description?.toLowerCase().includes('reference') || 
             r.description?.toLowerCase().includes('slide') || 
             r.description?.toLowerCase().includes('script'))
          ) || [];
          
          if (contentRecommendations.length > 0) {
            referenceAdherence = {
              score: 75, // Default score
              analysis: contentRecommendations.map((r: any) => r.description).join(' '),
            };
          }
        }
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
        ...(referenceAdherence && { referenceAdherence }),
        ...(durationFeedback && { durationFeedback }),
      };
    } catch (error: any) {
      // If it's a 404 model not found error, try next model
      if (error?.status === 404 && modelNames.indexOf(modelName) < modelNames.length - 1) {
        console.warn(`Model ${modelName} not found (${error.message}), trying next model...`);
        lastError = error;
        continue;
      }
      // Otherwise, re-throw the error
      throw error;
    }
  }
  
  // If we get here, all models failed
  console.error('All Gemini models failed. Last error:', lastError);
  throw lastError || new Error('Failed to use any available Gemini model');
}

