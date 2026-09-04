import { getDocumentProxy, extractText, extractImages } from 'unpdf';
import Tesseract from 'tesseract.js';

export interface TextQualityResult {
  isValid: boolean;
  qualityScore: number;
  reason?: string;
  wordCount: number;
  nullByteCount: number;
  cidTagCount: number;
}

/**
 * Validates text quality to ensure it is authentic, readable resume content
 * rather than raw font glyph indices, CID markers, or corrupted binary streams.
 */
export function validateTextQuality(text: string): TextQualityResult {
  if (!text || typeof text !== 'string') {
    return { isValid: false, qualityScore: 0, reason: 'Empty or missing text', wordCount: 0, nullByteCount: 0, cidTagCount: 0 };
  }

  const trimmed = text.trim();
  if (trimmed.length < 25) {
    return { isValid: false, qualityScore: 0, reason: 'Text is too short (< 25 characters)', wordCount: 0, nullByteCount: 0, cidTagCount: 0 };
  }

  // Count null bytes and unprintable control characters
  const nullMatches = text.match(/\x00|\\0/g);
  const nullByteCount = nullMatches ? nullMatches.length : 0;
  if (nullByteCount > 0) {
    return { isValid: false, qualityScore: 0, reason: `Contains ${nullByteCount} null bytes (raw glyph corruption)`, wordCount: 0, nullByteCount, cidTagCount: 0 };
  }

  // Count CID font tags e.g. (cid:123)
  const cidMatches = text.match(/\(cid:\d+\)/gi);
  const cidTagCount = cidMatches ? cidMatches.length : 0;
  if (cidTagCount > 2) {
    return { isValid: false, qualityScore: 0.1, reason: `Contains ${cidTagCount} unresolved CID font tags`, wordCount: 0, nullByteCount, cidTagCount };
  }

  // Count replacement characters \uFFFD
  const replacementMatches = text.match(/\uFFFD/g);
  const replacementCount = replacementMatches ? replacementMatches.length : 0;
  if (replacementCount / text.length > 0.05) {
    return { isValid: false, qualityScore: 0.15, reason: 'Excessive unicode replacement characters', wordCount: 0, nullByteCount, cidTagCount };
  }

  // Count unprintable control bytes (excluding \t, \n, \r)
  const controlMatches = text.match(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
  const controlCount = controlMatches ? controlMatches.length : 0;
  if (controlCount / text.length > 0.05) {
    return { isValid: false, qualityScore: 0.2, reason: 'Excessive unprintable control characters', wordCount: 0, nullByteCount, cidTagCount };
  }

  // Check word readability and token coherence
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 5) {
    return { isValid: false, qualityScore: 0.2, reason: 'Insufficient word count (< 5 words)', wordCount: words.length, nullByteCount, cidTagCount };
  }

  let validWordCount = 0;
  for (const w of words) {
    // Strip leading and trailing punctuation but preserve internal symbols like C++, .NET, Node.js, C#, /
    const cleanWord = w.replace(/^[^\w+#.]+|[^\w+#.]+$/g, '');
    
    // Check for standard resume words, numbers, tech stacks, or email/domain tokens
    if (
      cleanWord.length >= 1 && (
        /^[a-zA-Z0-9+#./@_-]+$/.test(cleanWord) ||
        /^(?:C\+\+|C#|\.NET|Node\.js|React\.js|Vue\.js|Next\.js|CI\/CD|TCP\/IP|UI\/UX|REST|GraphQL|SQL|AWS|GCP|AI|ML)$/i.test(w)
      )
    ) {
      validWordCount++;
    }
  }

  const wordRatio = validWordCount / words.length;
  const qualityScore = Math.min(1, Math.max(0, wordRatio));

  if (wordRatio < 0.45 || validWordCount < 5) {
    return {
      isValid: false,
      qualityScore,
      reason: `Low readable word ratio (${Math.round(wordRatio * 100)}%)`,
      wordCount: words.length,
      nullByteCount,
      cidTagCount
    };
  }

  return {
    isValid: true,
    qualityScore,
    wordCount: words.length,
    nullByteCount,
    cidTagCount
  };
}

/**
 * Checks if a string contains legitimate, human-readable text.
 * Safely handles technical acronyms, skill lists, metrics, and standard resume formats.
 */
export function isReadableEnglishText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const clean = text.trim();
  if (clean.length < 3) return false;

  // Reject raw PDF object markers or stream leftovers
  if (/\b(?:stream|endobj|endstream|FlateDecode|Catalog|Outlines)\b/i.test(clean) && clean.includes('/')) return false;
  if (/\b\d+\s+\d+\s+R\b/.test(clean)) return false;

  // Must have at least some alphanumeric characters
  const alphanumericCount = (clean.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount === 0) return false;

  return true;
}

/**
 * Clean and sanitize extracted text from PDF documents.
 * Fixes broken formatting, PDF ligatures, unicode quotes, and hyphenated line wraps.
 * Preserves all legitimate resume tokens: C++, C#, .NET, Node.js, dates, URLs, emails, phone numbers, metrics, and bullets.
 */
export function cleanPdfText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove null bytes and unprintable control characters (keep \t, \n, \r)
    .replace(/[\x00\u0000]/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalize unicode ligatures
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Normalize smart quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // Normalize bullet points
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25CF]/g, '• ')
    // Normalize non-breaking spaces and BOM
    .replace(/\u00A0/g, ' ')
    .replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '')
    // Normalize carriage returns and line endings
    .replace(/\r\n|\r/g, '\n');

  // Fix hyphenated words broken across line wraps (e.g. "micro-\nservices" -> "microservices")
  cleaned = cleaned.replace(/([a-zA-Z]{2,})-\s*[\r\n]+\s*([a-zA-Z]{2,})/g, '$1$2');

  // Replace excessive line breaks (3 or more -> double newline)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Clean individual lines while preserving bullets, emails, links, and tech terms
  const lines = cleaned.split('\n').map(line => {
    return line.replace(/[ \t]+/g, ' ').trim();
  });

  return lines.join('\n').trim();
}

/**
 * Layout-aware spatial PDF text extractor.
 * Reconstructs reading order for two-column resumes, sidebars, headers, and tables.
 */
async function extractSpatialTextFromPdf(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    interface TextItemInfo {
      str: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const items: TextItemInfo[] = [];

    for (const item of textContent.items as any[]) {
      const str = item.str || '';
      if (!str.trim()) continue;
      const x = Array.isArray(item.transform) ? item.transform[4] : 0;
      const y = Array.isArray(item.transform) ? item.transform[5] : 0;
      const width = item.width || 0;
      const height = item.height || 0;
      items.push({ str, x, y, width, height });
    }

    if (items.length === 0) continue;

    // Detect if page has two distinct columns
    let minX = Infinity;
    let maxX = -Infinity;
    for (const item of items) {
      if (item.x < minX) minX = item.x;
      if (item.x + item.width > maxX) maxX = item.x + item.width;
    }

    const pageWidth = maxX - minX;
    const midX = minX + pageWidth * 0.45;

    // Check if there is a column split
    let leftCount = 0;
    let rightCount = 0;
    let crossCount = 0;

    for (const item of items) {
      if (item.x + item.width < midX) {
        leftCount++;
      } else if (item.x > midX) {
        rightCount++;
      } else {
        crossCount++;
      }
    }

    const isTwoColumn = pageWidth > 250 && leftCount > 6 && rightCount > 6 && crossCount < (leftCount + rightCount) * 0.35;

    const formatColumnItems = (colItems: TextItemInfo[]): string => {
      // Group items into lines by Y coordinate (within 3.5 points)
      const lines: { y: number; items: TextItemInfo[] }[] = [];
      const sortedByY = [...colItems].sort((a, b) => b.y - a.y);

      for (const item of sortedByY) {
        let placed = false;
        for (const line of lines) {
          if (Math.abs(line.y - item.y) <= 3.5) {
            line.items.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lines.push({ y: item.y, items: [item] });
        }
      }

      // Sort lines top-to-bottom (descending Y)
      lines.sort((a, b) => b.y - a.y);

      // Sort items within each line left-to-right (ascending X)
      const formattedLines: string[] = [];
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
        const lineText = line.items.map(i => i.str.trim()).filter(Boolean).join(' ');
        if (lineText) {
          formattedLines.push(lineText);
        }
      }

      return formattedLines.join('\n');
    };

    if (isTwoColumn) {
      // Split into Left column and Right column
      const leftItems = items.filter(i => (i.x + i.width / 2) < midX);
      const rightItems = items.filter(i => (i.x + i.width / 2) >= midX);

      const leftText = formatColumnItems(leftItems);
      const rightText = formatColumnItems(rightItems);

      pageTexts.push(`${leftText}\n\n${rightText}`);
    } else {
      pageTexts.push(formatColumnItems(items));
    }
  }

  return cleanPdfText(pageTexts.join('\n\n'));
}

/**
 * Converts raw PDF.js pixel data into a BMP buffer for reliable OCR processing.
 */
function convertRawPixelsToBmp(img: any): Buffer | null {
  try {
    const width = img.width;
    const height = img.height;
    if (!width || !height || !img.data) return null;

    const channels = (img.kind === 1 || img.kind === 0) ? 1 : 3;
    const rowSize = Math.floor((channels * width * 8 + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;
    const bmpBuf = Buffer.alloc(fileSize);

    // Bitmap File Header
    bmpBuf.write('BM', 0);
    bmpBuf.writeUInt32LE(fileSize, 2);
    bmpBuf.writeUInt32LE(54, 10);
    // DIB Header
    bmpBuf.writeUInt32LE(40, 14);
    bmpBuf.writeInt32LE(width, 18);
    bmpBuf.writeInt32LE(height, 22);
    bmpBuf.writeUInt16LE(1, 26);
    bmpBuf.writeUInt16LE(channels * 8, 28);
    bmpBuf.writeUInt32LE(0, 30);
    bmpBuf.writeUInt32LE(pixelArraySize, 34);

    const srcData = img.data;
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y; // BMP is bottom-to-top
      const dstRowOffset = 54 + y * rowSize;
      const srcRowOffset = srcY * width * channels;
      for (let x = 0; x < width; x++) {
        if (channels === 3) {
          bmpBuf[dstRowOffset + x * 3] = srcData[srcRowOffset + x * 3 + 2]; // Blue
          bmpBuf[dstRowOffset + x * 3 + 1] = srcData[srcRowOffset + x * 3 + 1]; // Green
          bmpBuf[dstRowOffset + x * 3 + 2] = srcData[srcRowOffset + x * 3]; // Red
        } else {
          bmpBuf[dstRowOffset + x] = srcData[srcRowOffset + x];
        }
      }
    }

    return bmpBuf;
  } catch (err) {
    console.warn('Error converting raw pixels to BMP:', err);
    return null;
  }
}

/**
 * Optical Character Recognition (OCR) fallback for scanned/image-only PDFs.
 * Extracts embedded page image objects from PDF.js and processes them via Tesseract.js.
 */
async function extractTextWithOcr(buffer: Buffer): Promise<string> {
  try {
    const data = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(data);
    const ocrResults: string[] = [];
    const processedImageKeys = new Set<string>();

    const maxPages = Math.min(pdf.numPages, 4);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const ops = await page.getOperatorList();

        for (let i = 0; i < ops.fnArray.length; i++) {
          const args = ops.argsArray[i];
          if (args && args[0] && typeof args[0] === 'string' && (args[0].startsWith('img_') || args[0].startsWith('g_') || args[0].startsWith('Im'))) {
            const imgName = args[0];
            if (processedImageKeys.has(imgName)) continue;
            processedImageKeys.add(imgName);

            try {
              const img: any = await new Promise((resolve) => {
                const timer = setTimeout(() => resolve(null), 1500);
                (page.objs as any).get(imgName, (res: any) => {
                  clearTimeout(timer);
                  resolve(res);
                });
              });

              if (img && img.data && img.width >= 100 && img.height >= 100) {
                const bmpBuf = convertRawPixelsToBmp(img);
                if (bmpBuf) {
                  const result = await Tesseract.recognize(bmpBuf, 'eng');
                  if (result?.data?.text && result.data.text.trim().length > 10) {
                    ocrResults.push(result.data.text);
                  }
                }
              }
            } catch (imgErr) {
              console.warn(`Error recognizing image ${imgName}:`, imgErr);
            }
          }
        }
      } catch (pageErr) {
        console.warn(`Error processing OCR for page ${pageNum}:`, pageErr);
      }
    }

    return cleanPdfText(ocrResults.join('\n\n'));
  } catch (err) {
    console.warn('OCR extraction error:', err);
    return '';
  }
}

/**
 * Main PDF text extractor function.
 * Uses layout-aware PDF.js parsing with Unicode CMap decoding, standard fallback,
 * text quality validation, and automatic OCR fallback for scanned documents.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  // 1. Primary: Try Spatial / Layout-Aware PDF extraction
  try {
    const spatialText = await extractSpatialTextFromPdf(buffer);
    const validation = validateTextQuality(spatialText);
    if (validation.isValid && validation.qualityScore >= 0.5) {
      return spatialText;
    }
  } catch (err) {
    console.warn('Spatial PDF extraction warning:', err);
  }

  // 2. Secondary: Try standard unpdf extraction
  try {
    const data = new Uint8Array(buffer);
    const standardResult = await extractText(data, { mergePages: true });
    const standardText = cleanPdfText(typeof standardResult === 'string' ? standardResult : (standardResult as any).text || '');
    const validation = validateTextQuality(standardText);
    if (validation.isValid && validation.qualityScore >= 0.5) {
      return standardText;
    }
  } catch (err) {
    console.warn('Standard PDF extraction warning:', err);
  }

  // 3. Fallback: Try OCR on scanned/image PDFs
  try {
    console.info('PDF text layer is empty or low quality. Attempting OCR fallback...');
    const ocrText = await extractTextWithOcr(buffer);
    const ocrValidation = validateTextQuality(ocrText);
    if (ocrValidation.isValid) {
      return ocrText;
    }
  } catch (ocrErr) {
    console.warn('OCR fallback failed:', ocrErr);
  }

  // If all extraction attempts failed to produce valid text, return empty string
  return '';
}

/**
 * Extract distinct, verbatim key points from the scanned PDF text without AI.
 * Captures bullet points, action statements, metrics, and experience highlights.
 */
export function extractKeyPointsFromPdfText(rawText: string): string[] {
  if (!rawText) return [];

  const cleaned = cleanPdfText(rawText);
  const rawLines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const keyPoints: string[] = [];
  const seen = new Set<string>();

  const metricsRegex = /(\d[\d,.]*\s*[%kKmMbB\+]|\d[\d,.]*\s*(?:users|rps|tps|ms|requests|concurrent|million|billion|queries|events|tb|gb|sec|min|hrs|percent|reduction|increase|downloads|clients|\$))/i;
  const actionVerbRegex = /^(?:built|architected|designed|developed|implemented|optimized|scaled|reduced|created|managed|directed|spearheaded|engineered|led|delivered|handled|improved|analyzed|coordinated|maintained|authored|resolved|established|automated|launched|integrated|collaborated|executed|configured|deployed|mentored|refactored|secured|migrated|tested)\b/i;

  for (const line of rawLines) {
    if (!isReadableEnglishText(line)) continue;

    // Strip leading bullet marks
    let cleanLine = line.replace(/^[•\-\*\+\d\.\)\:\>\s]+/, '').trim();
    if (cleanLine.length < 25 || cleanLine.length > 300) continue;

    // Filter out standard section headers
    if (/^(experience|education|skills|summary|projects|contact|certifications|awards|languages|hobbies|references|interests|technical skills|professional experience)$/i.test(cleanLine)) {
      continue;
    }

    // Check if line is a bullet point or key statement
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line);
    const hasMetrics = metricsRegex.test(cleanLine);
    const startsWithAction = actionVerbRegex.test(cleanLine);

    if (isBullet || hasMetrics || startsWithAction || cleanLine.length > 40) {
      // Normalize capitalization
      cleanLine = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);
      if (!/[.!?]$/.test(cleanLine)) cleanLine += '.';

      const lowerKey = cleanLine.toLowerCase().slice(0, 50);
      if (!seen.has(lowerKey)) {
        seen.add(lowerKey);
        keyPoints.push(cleanLine);
      }
    }
  }

  return keyPoints;
}

// Backwards compatibility export
export function stripPdfSyntax(raw: string): string {
  return cleanPdfText(raw);
}
