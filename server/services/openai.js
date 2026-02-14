import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
    const response = await openai.chat.completions.create({
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
    });

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
