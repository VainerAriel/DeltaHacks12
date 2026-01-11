import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY not set. Question generation will fail without API key.');
}

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!genAI) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY is required but not set' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { numQuestions } = body;

    if (!numQuestions || typeof numQuestions !== 'number' || numQuestions < 1 || numQuestions > 5) {
      return NextResponse.json(
        { error: 'numQuestions must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    const prompt = `Generate exactly ${numQuestions} behavioral interview questions for job interview practice. These should be common behavioral interview questions that assess skills like problem-solving, teamwork, leadership, conflict resolution, and adaptability.

Return ONLY a JSON array of strings, where each string is one interview question. Do not include any additional text, explanations, or formatting.

Example format:
["Tell me about a time when you had to work under pressure.", "Describe a situation where you had to resolve a conflict with a team member.", "Give an example of a time when you demonstrated leadership."]

Generate ${numQuestions} unique behavioral interview questions now:`;

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
          console.error('Response text:', jsonText.substring(0, 500));
          throw new Error('Failed to parse Gemini API response');
        }

        // Validate that we got an array of strings
        if (!Array.isArray(parsed)) {
          throw new Error('Response is not an array');
        }

        const questions = parsed.filter(q => typeof q === 'string' && q.trim().length > 0);

        if (questions.length !== numQuestions) {
          console.warn(`Expected ${numQuestions} questions but got ${questions.length}`);
        }

        return NextResponse.json({ questions: questions.slice(0, numQuestions) });
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
  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
