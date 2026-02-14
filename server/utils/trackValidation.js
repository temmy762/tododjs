// DJ Pool Track Validation Rules

/**
 * Validation Rule C1 (hard gate)
 * To publish a track, these fields must exist:
 * - title, artist, genre, pack, versionType, audioFile.url
 */
export const validatePublishGate = (track) => {
  const errors = [];

  if (!track.title || track.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!track.artist || track.artist.trim() === '') {
    errors.push('Artist is required');
  }

  if (!track.genre) {
    errors.push('Genre is required');
  }

  if (!track.pack) {
    errors.push('Pack is required - track must belong to a weekly/monthly drop');
  }

  if (!track.versionType) {
    errors.push('Version type is required (Intro/Outro/Extended/Edit/etc.)');
  }

  if (!track.audioFile || !track.audioFile.url) {
    errors.push('Audio file is required');
  }

  return {
    canPublish: errors.length === 0,
    errors
  };
};

/**
 * Validation Rule C2 (soft gate)
 * If BPM/Key missing, allow publish but flag as "Needs DJ Data"
 */
export const checkDJDataComplete = (track) => {
  const warnings = [];
  let needsDJData = false;

  if (!track.bpm) {
    warnings.push('BPM is missing');
    needsDJData = true;
  }

  if (!track.tonality) {
    warnings.push('Camelot key/tonality is missing');
    needsDJData = true;
  }

  return {
    needsDJData,
    warnings
  };
};

/**
 * Validation Rule D1
 * Auto-cleanup filename/title - remove garbage tokens
 */
export const cleanTrackTitle = (title) => {
  if (!title) return title;

  // Remove common garbage tokens
  const garbageTokens = [
    /128kbps/gi,
    /320kbps/gi,
    /\bfinal\b/gi,
    /\bmaster\b/gi,
    /\bnew\b/gi,
    /\bcopy\b/gi,
    /\(copy\)/gi,
    /\[copy\]/gi,
    /_+/g, // Multiple underscores
    /\s+/g // Multiple spaces
  ];

  let cleaned = title;
  garbageTokens.forEach(token => {
    cleaned = cleaned.replace(token, ' ');
  });

  // Normalize separators
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

/**
 * Validation Rule D2
 * Auto-detect version type from title/filename
 */
export const detectVersionType = (title, filename = '') => {
  const text = `${title} ${filename}`.toLowerCase();

  const versionPatterns = {
    'Intro': /\b(intro|intro\s*edit|intro\s*mix)\b/i,
    'Outro': /\b(outro|outro\s*edit|outro\s*mix)\b/i,
    'Extended': /\b(extended|ext\s*mix|extended\s*mix|long\s*version)\b/i,
    'Edit': /\b(edit|radio\s*edit|short\s*edit)\b/i,
    'Transition': /\b(transition|trans|quick\s*hit)\b/i,
    'Acapella': /\b(acapella|acap|vocal\s*only|vocals)\b/i,
    'Instrumental': /\b(instrumental|inst|beat\s*only)\b/i,
    'Clean': /\b(clean|radio\s*version)\b/i,
    'Dirty': /\b(dirty|explicit|unedited)\b/i
  };

  for (const [versionType, pattern] of Object.entries(versionPatterns)) {
    if (pattern.test(text)) {
      return versionType;
    }
  }

  return 'Original Mix';
};

/**
 * Validation Rule D2 - Detect Clean/Dirty
 */
export const detectCleanDirty = (title, filename = '') => {
  const text = `${title} ${filename}`.toLowerCase();

  if (/\b(clean|radio\s*version)\b/i.test(text)) {
    return 'Clean';
  }

  if (/\b(dirty|explicit|unedited|parental\s*advisory)\b/i.test(text)) {
    return 'Dirty';
  }

  return 'N/A';
};

/**
 * Generate canonical display name
 * Format: Artist - Title (Version) [BPM Key] (Clean/Dirty)
 */
export const generateDisplayName = (track) => {
  let displayName = `${track.artist} - ${track.title}`;

  // Add version if not Original Mix
  if (track.versionType && track.versionType !== 'Original Mix') {
    displayName += ` (${track.versionType})`;
  }

  // Add BPM and Key if available
  if (track.bpm || track.tonality) {
    const djData = [];
    if (track.bpm) djData.push(`${track.bpm} BPM`);
    if (track.tonality) djData.push(track.tonality);
    displayName += ` [${djData.join(' ')}]`;
  }

  // Add Clean/Dirty if applicable
  if (track.cleanDirty && track.cleanDirty !== 'N/A') {
    displayName += ` (${track.cleanDirty})`;
  }

  return displayName;
};

/**
 * Validation Rule E1
 * Every track must belong to exactly one pack
 */
export const validatePackAssignment = (track) => {
  if (!track.pack) {
    return {
      valid: false,
      error: 'Track must be assigned to a pack (weekly/monthly drop)'
    };
  }

  return { valid: true };
};

/**
 * Complete track validation for publishing
 */
export const validateTrackForPublish = (track) => {
  // Hard gate validation
  const publishGate = validatePublishGate(track);
  if (!publishGate.canPublish) {
    return {
      canPublish: false,
      status: 'draft',
      errors: publishGate.errors,
      warnings: []
    };
  }

  // Soft gate validation
  const djDataCheck = checkDJDataComplete(track);

  return {
    canPublish: true,
    status: djDataCheck.needsDJData ? 'ready' : 'published',
    needsDJData: djDataCheck.needsDJData,
    errors: [],
    warnings: djDataCheck.warnings
  };
};
