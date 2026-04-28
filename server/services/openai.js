import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

function getOpenAITimeoutMs() {
  const raw = process.env.OPENAI_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 25000;
  return parsed;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: getOpenAITimeoutMs()
});

export async function detectTonalityWithAI(trackTitle, artist, album = null) {
  if (!process.env.TONALITY_AI_FALLBACK || process.env.TONALITY_AI_FALLBACK !== 'true') {
    return null;
  }

  const prompt = `Identify the musical key (tonality) for this track:

Title: ${trackTitle}
Artist: ${artist}
${album ? `Album: ${album}` : ''}

Provide the key in both standard notation and Camelot wheel notation.
Format your response as JSON:
{
  "key": "C",
  "scale": "minor",
  "camelot": "5A",
  "confidence": "high"
}

Confidence levels: "high", "medium", "low", "unknown"
If you don't know the key, return: {"key": null, "scale": null, "camelot": null, "confidence": "unknown"}`;

  try {
    const timeoutMs = getOpenAITimeoutMs();
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a music theory expert specializing in key detection for DJ mixing. Provide accurate musical key information in Camelot notation. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" }
      },
      { timeout: timeoutMs }
    );

    const result = JSON.parse(response.choices[0].message.content);
    
    if (!result.key || result.confidence === 'unknown') {
      return null;
    }

    const confidenceMap = {
      'high': 0.9,
      'medium': 0.7,
      'low': 0.5,
      'unknown': 0
    };

    return {
      key: result.key,
      scale: result.scale,
      camelot: result.camelot,
      source: 'openai',
      confidence: confidenceMap[result.confidence] || 0.7
    };
  } catch (error) {
    console.error('OpenAI tonality detection error:', error.message);
    return null;
  }
}

/**
 * Google Gemini fallback for tonality detection.
 * Uses Gemini's broad music knowledge to infer the Camelot key when
 * audio analysis and external lookups all fail.
 * Requires GOOGLE_AI_API_KEY in .env.
 */
export async function detectTonalityWithGemini(trackTitle, artist, album = null) {
  if (!process.env.GOOGLE_AI_API_KEY) return null;

  const prompt = `You are a music theory expert with deep knowledge of DJ record pools, Latin music, and popular tracks.

Identify the musical key (tonality) for this specific track:
Title: ${trackTitle}
Artist: ${artist}
${album ? `Album: ${album}` : ''}

Instructions:
- Use your training knowledge of this exact track if you know it
- Provide the Camelot wheel key (used by DJs) such as "5A", "10B", "8B", etc.
- Set confidence "high" if you know this track's key specifically, "medium" if educated guess from genre/artist style, "low" if uncertain
- If you truly have no idea, return null values

Respond ONLY with valid JSON, no markdown, no explanation:
{"key": "C", "scale": "minor", "camelot": "5A", "confidence": "high"}`;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash-lite',
    generationConfig: { temperature: 0.1, maxOutputTokens: 120 }
  });

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

      const parsed = JSON.parse(raw);
      if (!parsed.camelot || parsed.confidence === 'unknown' || parsed.camelot === null) return null;

      const confidenceMap = { high: 0.88, medium: 0.65, low: 0.45, unknown: 0 };
      return {
        key:        parsed.key   || null,
        scale:      parsed.scale || null,
        camelot:    parsed.camelot,
        source:     'gemini',
        confidence: confidenceMap[parsed.confidence] ?? 0.65,
      };
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests');
      if (is429 && attempt < MAX_RETRIES) {
        const wait = (attempt + 1) * 8000;
        console.log(`   ⏳ Gemini rate-limited, retrying in ${wait / 1000}s… (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      console.error('Gemini tonality detection error:', err.message);
      return null;
    }
  }
  return null;
}

export async function detectGenreWithAI(trackTitle, artist, album = null) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const prompt = `Classify the music genre for this track using ONLY one of the 10 allowed genres listed below.

Title: ${trackTitle}
Artist: ${artist}
${album ? `Album: ${album}` : ''}

You MUST pick exactly one genre from this closed list:
1. Reggaeton
2. Old School Reggaeton
3. Dembow
4. Trap
5. House
6. EDM
7. Afro House
8. Remember
9. International
10. Others

Rules:
- "Old School Reggaeton" = classic reggaeton from the early 2000s era (Daddy Yankee, Tego Calderón, Don Omar early works, etc.)
- "Dembow" = Dominican dembow style
- "Trap" = Latin trap / drill
- "Remember" = throwback / retro / 80s-90s club classics
- "International" = English-language pop, hip-hop, R&B, rock, or any non-Latin genre
- "Others" = anything that does not fit the above categories
- If unsure, choose "Others"

Respond ONLY with valid JSON: {"genre": "<one of the 10 genres above>"}`;

  try {
    const timeoutMs = getOpenAITimeoutMs();
    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a music genre classifier for a Latin DJ record pool. You MUST always respond with valid JSON and MUST pick exactly one genre from the provided closed list of 10 genres.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 30,
        response_format: { type: "json_object" }
      },
      { timeout: timeoutMs }
    );

    const result = JSON.parse(response.choices[0].message.content);
    return result.genre || null;
  } catch (error) {
    console.error('OpenAI genre detection error:', error.message);
    return null;
  }
}

export async function batchDetectTonality(tracks) {
  const results = [];
  
  for (const track of tracks) {
    try {
      const tonality = await detectTonalityWithAI(
        track.title,
        track.artist,
        track.album
      );
      
      results.push({
        trackId: track.id,
        tonality
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error detecting tonality for ${track.title}:`, error.message);
      results.push({
        trackId: track.id,
        tonality: null
      });
    }
  }
  
  return results;
}
