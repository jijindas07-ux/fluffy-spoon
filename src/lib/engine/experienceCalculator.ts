/**
 * Professional Experience Calculator
 * 
 * Strict compliance rules:
 * 1. Calculate total professional experience using EMPLOYMENT HISTORY AND JOB DATES ONLY.
 * 2. NEVER include school, college, university, degree, or education duration.
 * 3. Avoid double-counting overlapping jobs through interval merging.
 * 4. Do not invent experience when dates are missing or ambiguous (default to 0).
 * 5. Fresh graduates / candidates with no paid employment history return 0.
 */

export interface DateInterval {
  startMonthIndex: number; // year * 12 + month (0-11)
  endMonthIndex: number;   // year * 12 + month (0-11)
}

export interface WorkRoleItem {
  title?: string;
  role?: string;
  duration?: string;
  description?: string;
}

interface ParsedDateResult {
  monthIndex: number;
  hasExplicitMonth: boolean;
  isPresent: boolean;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

// Patterns indicating education/schooling rather than professional employment
const EDUCATION_INDICATOR_REGEX = /\b(?:bachelor|master|ph\.?d|doctorate|diploma|b\.?s\.?|b\.?a\.?|b\.?tech|b\.?e\.?|m\.?s\.?|m\.?a\.?|m\.?tech|mca|bca|university|college|school|higher\s+secondary|high\s+school|cgpa|gpa|matriculation|graduated|graduation|sslc|hsc|cbse|icse|secondary\s+school|undergraduate|student|coursework|thesis)\b/i;

// Patterns indicating section transitions in resume text
const EXPERIENCE_SECTION_HEADER_REGEX = /^(?:work\s+experience|professional\s+experience|employment\s+history|work\s+history|career\s+history|relevant\s+experience|professional\s+background|experience|employment)\b/i;
const EDUCATION_SECTION_HEADER_REGEX = /^(?:education|academic\s+background|academic\s+qualifications|academics|academic\s+profile|educational\s+qualifications|degrees|university|college|schooling|academic\s+history)\b/i;
const OTHER_SECTION_HEADER_REGEX = /^(?:projects|academic\s+projects|personal\s+projects|certifications|certificates|licenses|skills|technical\s+skills|core\s+competencies|achievements|awards|publications|volunteer|activities|extracurricular|hobbies|interests|languages|personal\s+details|declaration|references|summary|about\s+me)\b/i;

export class ExperienceCalculator {
  /**
   * Parse a single date point. Returns monthIndex and whether month was explicit.
   */
  public static parseDatePoint(dateStr: string, isEnd: boolean = false, currentYear?: number, currentMonth?: number): ParsedDateResult | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim().toLowerCase();

    const now = new Date();
    const currY = currentYear !== undefined ? currentYear : now.getFullYear();
    const currM = currentMonth !== undefined ? currentMonth : now.getMonth();

    if (/\b(?:present|current|now|ongoing|till\s+date|till\s+now|today|continuous)\b/i.test(clean)) {
      return {
        monthIndex: currY * 12 + currM,
        hasExplicitMonth: true,
        isPresent: true
      };
    }

    // Match "Month YYYY" e.g., "Jan 2021", "September 2020"
    const monthYearMatch = clean.match(/\b([a-z]{3,9})\.?\s+(\d{4})\b/i);
    if (monthYearMatch) {
      const mStr = monthYearMatch[1].toLowerCase();
      const year = parseInt(monthYearMatch[2], 10);
      if (year >= 1970 && year <= currY + 1) {
        const month = MONTH_NAMES[mStr] !== undefined ? MONTH_NAMES[mStr] : (isEnd ? 11 : 0);
        return {
          monthIndex: year * 12 + month,
          hasExplicitMonth: true,
          isPresent: false
        };
      }
    }

    // Match numeric MM/YYYY or MM-YYYY
    const numericSlashMatch = clean.match(/\b(0?[1-9]|1[0-2])[\/\-\.](\d{4})\b/);
    if (numericSlashMatch) {
      const month = parseInt(numericSlashMatch[1], 10) - 1;
      const year = parseInt(numericSlashMatch[2], 10);
      if (year >= 1970 && year <= currY + 1) {
        return {
          monthIndex: year * 12 + month,
          hasExplicitMonth: true,
          isPresent: false
        };
      }
    }

    // Match YYYY-MM
    const isoMonthMatch = clean.match(/\b(\d{4})[\/\-\.](0?[1-9]|1[0-2])\b/);
    if (isoMonthMatch) {
      const year = parseInt(isoMonthMatch[1], 10);
      const month = parseInt(isoMonthMatch[2], 10) - 1;
      if (year >= 1970 && year <= currY + 1) {
        return {
          monthIndex: year * 12 + month,
          hasExplicitMonth: true,
          isPresent: false
        };
      }
    }

    // Match plain 4-digit Year
    const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1970 && year <= currY + 1) {
        return {
          monthIndex: year * 12 + 0,
          hasExplicitMonth: false,
          isPresent: false
        };
      }
    }

    return null;
  }

  /**
   * Parse a date range string like "Jan 2020 - Dec 2022", "2021 - Present", "2020 to 2022"
   */
  public static parseDateRange(rangeStr: string, currentYear?: number, currentMonth?: number): DateInterval | null {
    if (!rangeStr || typeof rangeStr !== 'string') return null;

    // Reject ranges containing education keywords
    if (EDUCATION_INDICATOR_REGEX.test(rangeStr)) {
      return null;
    }

    // Normalize separators: - – — to | /
    const separatorPattern = /\s*(?:–|—|-|\bto\b|\btill\b)\s*/i;
    const parts = rangeStr.split(separatorPattern).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 2) {
      const start = this.parseDatePoint(parts[0], false, currentYear, currentMonth);
      const end = this.parseDatePoint(parts[1], true, currentYear, currentMonth);
      if (start !== null && end !== null && end.monthIndex >= start.monthIndex) {
        // If neither had explicit months, e.g. "2020 - 2022":
        // start is 2020*12, end is 2022*12 -> exactly (2022-2020) = 2 years (24 months)
        // If start and end are the same year with no months, e.g. "2022 - 2022":
        // give at least 6 months
        let startIdx = start.monthIndex;
        let endIdx = end.monthIndex;

        if (!start.hasExplicitMonth && !end.hasExplicitMonth) {
          if (startIdx === endIdx) {
            endIdx = startIdx + 6;
          }
        } else if (end.hasExplicitMonth && !end.isPresent) {
          // If explicit end month was given e.g. "Dec 2022", include the full ending month (+1)
          endIdx += 1;
        }

        return { startMonthIndex: startIdx, endMonthIndex: endIdx };
      }
    } else if (parts.length === 1) {
      if (/\b(?:present|current)\b/i.test(parts[0])) return null;
      const start = this.parseDatePoint(parts[0], false, currentYear, currentMonth);
      if (start !== null) {
        // Single year role without end date is counted as 6 to 12 months
        return { startMonthIndex: start.monthIndex, endMonthIndex: start.monthIndex + 6 };
      }
    }

    return null;
  }

  /**
   * Merge overlapping and adjacent date intervals to avoid double-counting concurrent roles
   */
  public static mergeIntervals(intervals: DateInterval[]): DateInterval[] {
    if (!intervals || intervals.length === 0) return [];

    const valid = intervals.filter(i => i.endMonthIndex >= i.startMonthIndex);
    if (valid.length === 0) return [];

    // Sort by startMonthIndex ascending
    valid.sort((a, b) => a.startMonthIndex - b.startMonthIndex);

    const merged: DateInterval[] = [valid[0]];
    for (let i = 1; i < valid.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = valid[i];

      // Overlap or contiguous (+1 month gap allowed for seamless job transition)
      if (curr.startMonthIndex <= prev.endMonthIndex + 1) {
        prev.endMonthIndex = Math.max(prev.endMonthIndex, curr.endMonthIndex);
      } else {
        merged.push({ ...curr });
      }
    }

    return merged;
  }

  /**
   * Calculate total experience years from structured work history / projects.
   * STRICTLY ignores education, degrees, academic projects, or student roles.
   */
  public static calculateFromWorkHistory(
    roles: WorkRoleItem[],
    currentYear?: number,
    currentMonth?: number
  ): number {
    if (!roles || !Array.isArray(roles) || roles.length === 0) return 0;

    const intervals: DateInterval[] = [];

    for (const item of roles) {
      const combinedMeta = `${item.role || ''} ${item.title || ''} ${item.description || ''}`;
      // Exclude school, college, degrees, academic thesis, or student roles
      if (EDUCATION_INDICATOR_REGEX.test(combinedMeta)) {
        continue;
      }

      if (item.duration) {
        const interval = this.parseDateRange(item.duration, currentYear, currentMonth);
        if (interval) {
          intervals.push(interval);
        }
      }
    }

    if (intervals.length === 0) return 0;

    const merged = this.mergeIntervals(intervals);
    const totalMonths = merged.reduce((acc, curr) => acc + (curr.endMonthIndex - curr.startMonthIndex), 0);

    // Rule: Under 10 months is considered entry-level/internship (< 1 full year)
    if (totalMonths < 10) return 0;

    return Math.round(totalMonths / 12);
  }

  /**
   * Calculate total experience years directly from raw resume text.
   * Robust state-machine that parses ONLY employment sections and strictly ignores education sections.
   */
  public static calculateFromResumeText(
    rawText: string,
    currentYear?: number,
    currentMonth?: number
  ): number {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return 0;

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    let currentSection: 'none' | 'experience' | 'education' | 'other' = 'none';
    const intervals: DateInterval[] = [];

    // Date range pattern to search within lines
    // Matches: "Jan 2020 - Dec 2022", "2021 - Present", "04/2019 - 11/2021", "2020 – 2023"
    const dateRangeRegex = /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[\/\-\.]\d{4}|\b\d{4}\b)\s*(?:–|—|-|\bto\b|\btill\b)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[\/\-\.]\d{4}|\b\d{4}\b|present|current|now|ongoing|till\s+date)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/^[#*•\-_:\s]+/, '').replace(/[:\s]+$/, '');

      // Check section header changes (only for reasonably short header lines)
      if (cleanLine.length <= 45) {
        if (EXPERIENCE_SECTION_HEADER_REGEX.test(cleanLine)) {
          currentSection = 'experience';
          continue;
        } else if (EDUCATION_SECTION_HEADER_REGEX.test(cleanLine)) {
          currentSection = 'education';
          continue;
        } else if (OTHER_SECTION_HEADER_REGEX.test(cleanLine)) {
          currentSection = 'other';
          continue;
        }
      }

      // If we are in the EDUCATION section, NEVER extract experience dates
      if (currentSection === 'education') {
        continue;
      }

      // If this individual line contains education/degree indicators, NEVER extract dates
      if (EDUCATION_INDICATOR_REGEX.test(line)) {
        continue;
      }

      // We only extract dates when:
      // A) We are inside an EXPERIENCE section, OR
      // B) The line contains a recognized professional role/employment pattern and date range, while not in education
      const inExpSection = currentSection === 'experience';
      const hasJobIndicators = /\b(?:engineer|developer|analyst|manager|specialist|lead|consultant|officer|associate|director|coordinator|architect|designer|administrator|intern|assistant|executive|practitioner|nurse|accountant)\b/i.test(line);

      if (inExpSection || hasJobIndicators) {
        const match = line.match(dateRangeRegex);
        if (match) {
          const rangeStr = match[0];
          const interval = this.parseDateRange(rangeStr, currentYear, currentMonth);
          if (interval) {
            intervals.push(interval);
          }
        }
      }
    }

    if (intervals.length === 0) return 0;

    const merged = this.mergeIntervals(intervals);
    const totalMonths = merged.reduce((acc, curr) => acc + (curr.endMonthIndex - curr.startMonthIndex), 0);

    if (totalMonths < 10) return 0;

    return Math.round(totalMonths / 12);
  }

  /**
   * Unified master calculation:
   * Combines structured work history with raw text verification.
   * If candidate has no employment history or only education, returns strictly 0.
   */
  public static calculate(params: {
    workHistory?: WorkRoleItem[];
    rawText?: string;
    currentYear?: number;
    currentMonth?: number;
  }): number {
    const { workHistory, rawText, currentYear, currentMonth } = params;

    // 1. Calculate from structured work history if available
    let workExp = 0;
    if (workHistory && workHistory.length > 0) {
      workExp = this.calculateFromWorkHistory(workHistory, currentYear, currentMonth);
    }

    // 2. If workHistory gave a result, verify it isn't based on empty/missing dates
    if (workExp > 0) {
      return workExp;
    }

    // 3. Fallback to scanning raw text for explicit employment sections
    if (rawText && rawText.trim().length > 0) {
      const textExp = this.calculateFromResumeText(rawText, currentYear, currentMonth);
      if (textExp > 0) {
        return textExp;
      }
    }

    // 4. If no employment dates found, return 0 (never invent experience!)
    return 0;
  }
}
