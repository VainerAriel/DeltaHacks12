import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BiometricData } from '@/types/biometrics';
import { Transcription } from '@/types/transcription';
import { FeedbackReport, Recommendation } from '@/types/feedback';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY not set. Analysis will fail without API key.');
}

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

// Cache for the base prompt
let basePromptCache: string | null = null;

/**
 * Load base prompt from newprompt.txt file
 */
function loadBasePrompt(): string {
  if (basePromptCache) {
    return basePromptCache;
  }

  try {
    // Try to read from root directory
    const promptPath = join(process.cwd(), 'newprompt.txt');
    const promptContent = readFileSync(promptPath, 'utf-8');
    // Remove the triple quotes from the beginning and end if present
    basePromptCache = promptContent.trim().replace(/^"""/, '').replace(/"""$/, '').trim();
    return basePromptCache;
  } catch (error) {
    console.error('Failed to load base prompt from newprompt.txt:', error);
    throw new Error('Failed to load base prompt template. Please ensure newprompt.txt exists in the root directory.');
  }
}

/**
 * Get scenario-specific tailoring text
 */
function getScenarioTailoring(scenario?: string): string {
  switch (scenario) {
    case 'job-interview':
      return 'In addition to the above general analysis, take into account when grading each of the 6 sectors appropriate tailoring to a job interview. Consider: professional tone, clear articulation for interviewers, structured responses using STAR method, appropriate vocabulary for workplace contexts, confidence in high-stakes situations, and engagement that demonstrates genuine interest in the role.';
    
    case 'elevator-pitch':
      return 'In addition to the above general analysis, take into account when grading each of the 6 sectors appropriate tailoring to a 60 second elevator pitch. Consider: energetic yet professional tone, concise and fluent delivery within time constraints, impactful vocabulary choices, clear pronunciation for quick understanding, high engagement to capture attention immediately, and confident presence despite brevity.';
    
    case 'business-presentation':
      return 'In addition to the above general analysis, take into account when grading each of the 6 sectors appropriate tailoring to a formal business presentation. Consider: authoritative yet approachable tone, smooth fluency without filler words, professional vocabulary appropriate for business context, clear pronunciation for diverse audiences, engagement that maintains audience attention throughout, and confident delivery that establishes credibility.';
    
    default:
      return '';
  }
}

/**
 * Build the complete prompt with data and scenario-specific tailoring
 */
function buildPrompt(
  basePrompt: string,
  biometricData: BiometricData,
  transcription: Transcription,
  duration: number,
  scenario?: string,
  questionText?: string
): string {
  // Calculate average metrics
  const avgHeartRate = biometricData.heartRate.length > 0
    ? biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length
    : 70;
  const avgBreathing = biometricData.breathing.length > 0
    ? biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length
    : 12;
  const expressions = biometricData.facialExpressions.map(e => e.expression);

  // Build data section to prepend
  let dataSection = `Biometric Data:
- Average Heart Rate: ${avgHeartRate.toFixed(1)} bpm
- Average Breathing Rate: ${avgBreathing.toFixed(1)} breaths/min
- Facial Expressions: ${expressions.join(', ')}

Speech Data:
- Words Per Minute: ${transcription.metrics.wpm}
- Filler Words Count: ${transcription.metrics.fillerWordsCount}
- Longest Pause: ${transcription.metrics.longestPause}s
- Transcription: "${transcription.text}"
- Recording Duration: ${duration} seconds

`;

  // Add interview question if present
  if (scenario === 'job-interview' && questionText) {
    dataSection = `Interview Question: "${questionText}"

${dataSection}`;
  }

  // Start with data section, then base prompt
  let prompt = dataSection + basePrompt;

  // Update video duration references in the prompt
  prompt = prompt.replace(/up to the video duration/g, `up to ${duration} seconds (timestamp: 0, 1, 2, 3, ... up to ${duration})`);
  prompt = prompt.replace(/the video/g, 'the recording');

  // Add scenario-specific tailoring at the end (before the JSON format section)
  const tailoring = getScenarioTailoring(scenario);
  if (tailoring) {
    // Insert before "Provide data in only the following JSON format"
    const jsonFormatIndex = prompt.indexOf('Provide data in only the following JSON format');
    if (jsonFormatIndex !== -1) {
      prompt = prompt.substring(0, jsonFormatIndex) + '\n\n' + tailoring + '\n\n' + prompt.substring(jsonFormatIndex);
    } else {
      // If not found, append at the end
      prompt += '\n\n' + tailoring;
    }
  }

  return prompt;
}

/**
 * Analyze presentation using Google Gemini API
 * @param biometricData - Biometric data from Presage
 * @param transcription - Transcription data from ElevenLabs
 * @param scenario - Optional scenario type (e.g., 'job-interview', 'elevator-pitch', 'business-presentation')
 * @param questionText - Optional question text (for job interview scenarios)
 * @param duration - Video duration in seconds
 * @returns Structured feedback report
 */
export async function analyzePresentation(
  biometricData: BiometricData,
  transcription: Transcription,
  scenario?: string,
  questionText?: string,
  duration?: number
): Promise<FeedbackReport> {
  if (!genAI) {
    throw new Error('GOOGLE_GEMINI_API_KEY is required but not set. Please configure it in your .env.local file.');
  }

  // Use duration from recording, or estimate from transcription if not provided
  const videoDuration = duration || Math.max(30, Math.ceil(transcription.text.length / 10)); // Rough estimate: 10 chars per second

  // Load base prompt
  const basePrompt = loadBasePrompt();

  // Build complete prompt
  const prompt = buildPrompt(basePrompt, biometricData, transcription, videoDuration, scenario, questionText);

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

      // Extract sector scores
      const toneScore = parsed.ToneScore || parsed.toneScore || 70;
      const toneFeedback = parsed.ToneFeedback || parsed.toneFeedback || '';
      const fluencyScore = parsed.FluencyScore || parsed.fluencyScore || 70;
      const fluencyFeedback = parsed.FluencyFeedback || parsed.fluencyFeedback || '';
      const vocabularyScore = parsed.VocabularyScore || parsed.vocabularyScore || 70;
      const vocabularyFeedback = parsed.VocabularyFeedback || parsed.vocabularyFeedback || '';
      const pronunciationScore = parsed.PronunciationScore || parsed.pronunciationScore || 70;
      const pronunciationFeedback = parsed.PronunciationFeedback || parsed.pronunciationFeedback || '';
      const engagementScore = parsed.EngagementScore || parsed.engagementScore || 70;
      const engagementFeedback = parsed.EngagementFeedback || parsed.engagementFeedback || '';
      const confidenceScore = parsed.ConfidenceScore || parsed.confidenceScore || 70;
      const confidenceFeedback = parsed.ConfidenceFeedback || parsed.confidenceFeedback || '';

      // Calculate overall score as average of 6 sector scores
      const overallScore = Math.round(
        (toneScore + fluencyScore + vocabularyScore + pronunciationScore + engagementScore + confidenceScore) / 6
      );

      // Extract per-second data
      const confidenceData = parsed.confidenceData || [];
      const engagementData = parsed.engagementData || [];

      // Extract biometric insights (for backward compatibility)
      // Generate from existing data if not in response
      const avgHeartRate = biometricData.heartRate.length > 0
        ? biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length
        : 70;
      const avgBreathing = biometricData.breathing.length > 0
        ? biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length
        : 12;
      const expressions = biometricData.facialExpressions.map(e => e.expression);

      // Build feedback report
      const feedbackReport: FeedbackReport = {
        id: `feedback-${Date.now()}`,
        recordingId: '', // Will be set by caller
        overallScore,
        sectorScores: {
          tone: { score: toneScore, feedback: toneFeedback },
          fluency: { score: fluencyScore, feedback: fluencyFeedback },
          vocabulary: { score: vocabularyScore, feedback: vocabularyFeedback },
          pronunciation: { score: pronunciationScore, feedback: pronunciationFeedback },
          engagement: { score: engagementScore, feedback: engagementFeedback },
          confidence: { score: confidenceScore, feedback: confidenceFeedback },
        },
        confidenceData: confidenceData.length > 0 ? confidenceData : undefined,
        engagementData: engagementData.length > 0 ? engagementData : undefined,
        // Keep existing fields for backward compatibility
        biometricInsights: parsed.biometricInsights || {
          heartRateAnalysis: `Average heart rate: ${avgHeartRate.toFixed(1)} bpm. ${avgHeartRate < 70 ? 'Calm and composed.' : avgHeartRate < 85 ? 'Moderate, slight elevation.' : 'Elevated, indicating possible nervousness.'}`,
          breathingPattern: `Average breathing rate: ${avgBreathing.toFixed(1)} breaths/min. ${avgBreathing < 12 ? 'Calm breathing pattern.' : avgBreathing < 16 ? 'Moderate breathing.' : 'Elevated breathing rate.'}`,
          facialExpressionNotes: expressions.length > 0 ? `Observed expressions: ${expressions.join(', ')}.` : 'No facial expression data available.',
        },
        speechInsights: parsed.speechInsights || {
          wpm: transcription.metrics.wpm,
          fillerWordsCount: transcription.metrics.fillerWordsCount,
          pauseAnalysis: `Longest pause: ${transcription.metrics.longestPause}s. ${transcription.metrics.fillerWordsCount > 10 ? 'High use of filler words.' : 'Good flow with minimal filler words.'}`,
          clarityScore: 75,
          pronunciationNotes: 'Pronunciation analysis based on transcription quality.',
        },
        recommendations: parsed.recommendations || [],
        createdAt: new Date(),
      };

      return feedbackReport;
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
