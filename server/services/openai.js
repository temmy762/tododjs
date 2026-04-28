import OpenAI from 'openai';
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
 * Strip feat./remix/version noise from a title or artist string so
 * the search query hits the canonical track name on DJ databases.
 */
function cleanSearchTerm(str) {
  return str
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\[feat\..*?\]/gi, '')
    .replace(/\s*ft\..*$/gi, '')
    .replace(/\s*feat\..*$/gi, '')
    .replace(/\s*\((radio edit|extended mix|club mix|original mix|instrumental|acapella|vip mix)\)/gi, '')
    .replace(/\s*\[(radio edit|extended mix|club mix|original mix|instrumental)\]/gi, '')
    .trim();
}

/**
 * Build the high-intensity search prompt targeting specific DJ databases.
 */
function buildWebSearchPrompt(title, artist, album) {
  return `You are a professional DJ data researcher. Find the EXACT musical key (Camelot notation) and BPM for this track.

Track: "${title}"
Artist: "${artist}"${album ? `\nAlbum: "${album}"` : ''}

Search these databases IN ORDER until you find data — do NOT stop after one failure:
1. tunebat.com — best source, search: ${title} ${artist}
2. musicstax.com — search: ${title} ${artist}
3. beatport.com — search: ${title} ${artist}
4. songbpm.com or getstockmusic.com
5. last.fm or any music data aggregator

Rules:
- Try with the full title first, then WITHOUT featured artist credits (e.g. "Gasolina" not "Gasolina (feat. ...)")
- Try with just the main artist if the full artist string fails
- The BPM and key WILL be on at least one of these sites for any commercially released track
- A Camelot key looks like "8A", "5B", "10B" — it MUST be in this format
- BPM should be a number between 60 and 200
- DO NOT give up until all 5 sources have been tried

Return ONLY valid JSON — no markdown, no explanation:
{"key": "A", "scale": "minor", "camelot": "8A", "bpm": 95, "confidence": "high"}

confidence: "high" = confirmed on a database | "medium" = secondary/aggregated source | "low" = estimated
Only return {"key":null,"scale":null,"camelot":null,"bpm":null,"confidence":"unknown"} if ALL 5 sources genuinely returned no data.`;
}

/**
 * OpenAI web-search tonality detection.
 * Uses gpt-4o-search-preview with high search context to look up the
 * track's key and BPM from live DJ databases (Tunebat, Beatport, Musicstax).
 * Two-pass: first with original title/artist, then with cleaned version.
 * Requires OPENAI_API_KEY in .env — no extra setup needed.
 */
export async function detectTonalityWithWebSearch(trackTitle, artist, album = null) {
  if (!process.env.OPENAI_API_KEY) return null;

  const confidenceMap = { high: 0.95, medium: 0.78, low: 0.55, unknown: 0 };

  const runSearch = async (title, art) => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      web_search_options: { search_context_size: 'high' },
      messages: [
        {
          role: 'system',
          content: 'You are a professional DJ music database researcher. You ALWAYS search multiple sources exhaustively and NEVER give up without checking all listed databases. Respond ONLY with valid JSON.',
        },
        { role: 'user', content: buildWebSearchPrompt(title, art, album) },
      ],
    }, { timeout: 45000 });

    const raw = (response.choices[0].message.content || '').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parsed = JSON.parse(raw);
    if (!parsed.camelot || parsed.camelot === null || parsed.confidence === 'unknown') return null;

    return {
      key:        parsed.key   || null,
      scale:      parsed.scale || null,
      camelot:    parsed.camelot,
      bpm:        (parsed.bpm && parsed.bpm > 0) ? Math.round(parsed.bpm) : null,
      source:     'openai-websearch',
      confidence: confidenceMap[parsed.confidence] ?? 0.78,
    };
  };

  try {
    // Pass 1: original title + artist
    console.log(`   🌐 Web-search pass 1: "${trackTitle}" - ${artist}`);
    const result1 = await runSearch(trackTitle, artist);
    if (result1) return result1;

    // Pass 2: cleaned title + artist (strips feat./remix/version noise)
    const cleanTitle  = cleanSearchTerm(trackTitle);
    const cleanArtist = cleanSearchTerm(artist);
    if (cleanTitle !== trackTitle || cleanArtist !== artist) {
      console.log(`   🌐 Web-search pass 2 (cleaned): "${cleanTitle}" - ${cleanArtist}`);
      const result2 = await runSearch(cleanTitle, cleanArtist);
      if (result2) return result2;
    }

    return null;
  } catch (err) {
    console.error('OpenAI web-search tonality error:', err.message);
    return null;
  }
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
