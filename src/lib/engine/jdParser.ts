import { JobDescription, SeniorityLevel } from '../types';

export class JDParser {
  /**
   * Parse Job Description text into structured skills, themes, and seniority level (FR-005).
   */
  public static parseJobDescription(rawText: string, title?: string, tenantId?: string): JobDescription {
    if (!rawText || rawText.trim().length === 0) {
      return {
        id: `jd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tenantId,
        title: title || 'Target Professional Role',
        rawText: '',
        requiredSkills: [],
        preferredSkills: [],
        roleThemes: ['Core Competencies', 'Operational Execution'],
        status: 'draft'
      };
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract title if not provided
    let detectedTitle = title || '';
    if (!detectedTitle && lines.length > 0) {
      const firstLine = lines[0].replace(/^(?:job description|role|title|position):\s*/i, '');
      if (firstLine.length < 50) detectedTitle = firstLine;
    }
    if (!detectedTitle) detectedTitle = 'Professional Role';

    // Seniority detection
    let detectedSeniority: SeniorityLevel = 'Mid-Level';
    const lower = rawText.toLowerCase();
    if (/\b(?:director|vp|head of|executive|chief|partner)\b/i.test(lower)) detectedSeniority = 'Executive / Director';
    else if (/\b(?:principal|lead architect|chief architect|staff)\b/i.test(lower)) detectedSeniority = 'Principal / Architect';
    else if (/\b(?:senior|lead|sr\.)\b/i.test(lower)) detectedSeniority = 'Senior';
    else if (/\b(?:junior|entry|associate|graduate|intern|trainee)\b/i.test(lower)) detectedSeniority = 'Junior';

    // Universal skill & keyword extractor
    const requiredSkills: string[] = [];
    const preferredSkills: string[] = [];
    const roleThemes: string[] = [];

    // Parse sections
    let currentSection: 'req' | 'pref' | 'resp' | 'none' = 'none';

    for (const line of lines) {
      if (/\b(?:requirements|qualifications|must have|what you will need|basic qualifications)\b/i.test(line)) {
        currentSection = 'req';
        continue;
      }
      if (/\b(?:preferred|nice to have|bonus|plus|desirable|preferred qualifications)\b/i.test(line)) {
        currentSection = 'pref';
        continue;
      }
      if (/\b(?:responsibilities|what you will do|duties|scope|overview)\b/i.test(line)) {
        currentSection = 'resp';
        continue;
      }

      const cleanBullet = line.replace(/^[•\-\*\+\d\.\)\:\>\s]+/, '').trim();
      if (cleanBullet.length > 4 && cleanBullet.length < 120) {
        if (currentSection === 'req') {
          if (requiredSkills.length < 10) requiredSkills.push(cleanBullet);
        } else if (currentSection === 'pref') {
          if (preferredSkills.length < 8) preferredSkills.push(cleanBullet);
        } else if (currentSection === 'resp') {
          if (roleThemes.length < 6) roleThemes.push(cleanBullet);
        }
      }
    }

    // Default themes if none extracted from headings
    if (roleThemes.length === 0) {
      roleThemes.push('Domain Expertise & Execution', 'Stakeholder Communication', 'Problem Solving & Quality Assurance');
    }

    return {
      id: `jd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      title: detectedTitle,
      rawText,
      requiredSkills,
      preferredSkills,
      roleThemes,
      seniorityLevel: detectedSeniority,
      parsedAt: Date.now(),
      status: 'active'
    };
  }
}
