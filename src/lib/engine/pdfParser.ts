import { getDocumentProxy, extractText, extractImages } from 'unpdf';
import Tesseract from 'tesseract.js';
import crypto from 'crypto';
import zlib from 'zlib';

/**
 * Compute SHA-256 content hash for duplicate upload detection (SRS FR-002).
 */
export function computeBufferSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * High-speed native DOCX extractor using Node.js zlib stream decompression.
 * Reads word/document.xml directly in < 5ms without external subprocesses.
 */
export function extractTextFromDocxBuffer(buffer: Buffer): string {
  try {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileName = buffer.slice(offset + 30, offset + 30 + fileNameLength).toString('utf-8');
        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === 'word/document.xml') {
          const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);
          let xmlContent = '';
          if (compressionMethod === 8) {
            xmlContent = zlib.inflateRawSync(compressedData).toString('utf-8');
          } else if (compressionMethod === 0) {
            xmlContent = compressedData.toString('utf-8');
          }

          if (xmlContent) {
            const text = xmlContent
              .replace(/<w:p[^>]*>/gi, '\n')
              .replace(/<w:tab\/>/gi, '\t')
              .replace(/<w:br\/>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
            return cleanPdfText(text);
          }
        }
        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('Native DOCX decompression warning, falling back to string scan:', err);
  }

  // Fallback string scan for XML w:t elements
  const str = buffer.toString('utf-8');
  const xmlMatch = str.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  if (xmlMatch) {
    const text = xmlMatch.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    return cleanPdfText(text);
  }
  return cleanPdfText(str);
}

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

  // Repair legitimate abbreviations, degrees, and tech tokens that may have broken spaces around punctuation
  cleaned = cleaned
    .replace(/\bB\s*\.\s*Tech\b/gi, 'B.Tech')
    .replace(/\bM\s*\.\s*Tech\b/gi, 'M.Tech')
    .replace(/\bB\s*\.\s*E\b/gi, 'B.E')
    .replace(/\bM\s*\.\s*E\b/gi, 'M.E')
    .replace(/\bB\s*\.\s*S\b/gi, 'B.S')
    .replace(/\bM\s*\.\s*S\b/gi, 'M.S')
    .replace(/\bB\s*\.\s*A\b/gi, 'B.A')
    .replace(/\bM\s*\.\s*A\b/gi, 'M.A')
    .replace(/\bPh\s*\.\s*D\b/gi, 'Ph.D')
    .replace(/\bB\s*\.\s*Sc\b/gi, 'B.Sc')
    .replace(/\bM\s*\.\s*Sc\b/gi, 'M.Sc')
    .replace(/\bB\s*\.\s*Com\b/gi, 'B.Com')
    .replace(/\bM\s*\.\s*Com\b/gi, 'M.Com')
    .replace(/\bU\s*\.\s*S\b/gi, 'U.S')
    .replace(/\bNode\s*\.\s*js\b/gi, 'Node.js')
    .replace(/\bVue\s*\.\s*js\b/gi, 'Vue.js')
    .replace(/\bNext\s*\.\s*js\b/gi, 'Next.js')
    .replace(/\bReact\s*\.\s*js\b/gi, 'React.js')
    .replace(/\bExpress\s*\.\s*js\b/gi, 'Express.js')
    .replace(/(^|\s)\.\s*NET\b/g, '$1.NET')
    .replace(/\bC\s*\+\+/g, 'C++')
    .replace(/\bC\s*#/g, 'C#')
    .replace(/\bCI\s*\/\s*CD\b/gi, 'CI/CD')
    .replace(/\bTCP\s*\/\s*IP\b/gi, 'TCP/IP')
    .replace(/\bP\s*&\s*L\b/gi, 'P&L')
    .replace(/\bR\s*&\s*D\b/gi, 'R&D')
    .replace(/\bFull\s*-\s*Stack\b/gi, 'Full-Stack')
    .replace(/\bFront\s*-\s*End\b/gi, 'Front-End')
    .replace(/\bBack\s*-\s*End\b/gi, 'Back-End')
    .replace(/\bReal\s*-\s*Time\b/gi, 'Real-Time')
    .replace(/\bEnd\s*-\s*to\s*-\s*End\b/gi, 'End-to-End');

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

        let reconstructed = '';
        for (let j = 0; j < line.items.length; j++) {
          const item = line.items[j];
          const text = item.str || '';
          if (!text) continue;

          if (j === 0 || !reconstructed) {
            reconstructed += text;
          } else {
            const prev = line.items[j - 1];
            const gap = item.x - (prev.x + prev.width);
            const endsWithSpace = /\s$/.test(reconstructed);
            const startsWithSpace = /^\s/.test(text);

            if (endsWithSpace || startsWithSpace) {
              reconstructed += text;
            } else if (gap >= 1.8) {
              reconstructed += ' ' + text;
            } else {
              // Same word/token (e.g. "B." + "Tech", "Full" + "-Stack", "C" + "++", "$" + "50k")
              reconstructed += text;
            }
          }
        }

        const trimmed = reconstructed.trim();
        if (trimmed) {
          formattedLines.push(trimmed);
        }
      }

      return formattedLines.join('\n');
    };

    // Dynamic column boundary detection for two-column & Canva resumes
    let isTwoColumn = false;
    let splitX = minX + pageWidth * 0.45;

    if (pageWidth > 250 && items.length > 20) {
      // Find the vertical gutter (column gap) between 25% and 75% of page width
      const step = 5;
      let bestX = splitX;
      let minOverlap = Infinity;

      for (let x = minX + pageWidth * 0.25; x <= minX + pageWidth * 0.75; x += step) {
        let left = 0;
        let right = 0;
        let intersecting = 0;

        for (const item of items) {
          const itemStart = item.x;
          const itemEnd = item.x + item.width;
          if (itemEnd < x) {
            left++;
          } else if (itemStart > x) {
            right++;
          } else {
            intersecting++;
          }
        }

        // Substantial items on both sides and minimal intersecting text
        if (left >= 8 && right >= 8 && intersecting < minOverlap) {
          minOverlap = intersecting;
          bestX = x;
        }
      }

      const totalColItems = items.filter(i => (i.x + i.width) < bestX || i.x > bestX).length;
      if (minOverlap <= 4 && totalColItems >= 16) {
        isTwoColumn = true;
        splitX = bestX;
      }
    }

    if (isTwoColumn) {
      // Check for wide top header spanning across splitX (e.g. Name/Title at top of Canva resume)
      const maxY = Math.max(...items.map(i => i.y));
      const headerThresholdY = maxY - 75;
      const headerItems = items.filter(i => i.y > headerThresholdY && (i.x < splitX && (i.x + i.width) > splitX || i.width > pageWidth * 0.45));
      const nonHeaderItems = items.filter(i => !headerItems.includes(i));

      const leftItems = nonHeaderItems.filter(i => (i.x + i.width / 2) < splitX);
      const rightItems = nonHeaderItems.filter(i => (i.x + i.width / 2) >= splitX);

      const headerText = headerItems.length > 0 ? formatColumnItems(headerItems) : '';
      const leftText = formatColumnItems(leftItems);
      const rightText = formatColumnItems(rightItems);

      const combined = [headerText, leftText, rightText].filter(Boolean).join('\n\n');
      pageTexts.push(combined);
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

  const metricsRegex = /(\d[\d,.]*\s*[%kKmMbB\+]|\d[\d,.]*\s*(?:users|rps|tps|ms|requests|concurrent|million|billion|queries|events|tb|gb|sec|min|hrs|percent|reduction|increase|downloads|clients|revenue|budget|sales|leads|roi|accounts|patients|students|cases|hires|interviews|profiles|applications|retention|margin|growth|deals|contracts|units|tickets|\$|€|£|₹))/i;
  const actionVerbRegex = /^(?:built|architected|designed|developed|implemented|optimized|scaled|reduced|created|managed|directed|spearheaded|engineered|led|delivered|handled|improved|analyzed|coordinated|maintained|authored|resolved|established|automated|launched|integrated|collaborated|executed|configured|deployed|mentored|refactored|secured|migrated|tested|audited|forecasted|budgeted|negotiated|recruited|sourced|screened|counseled|trained|taught|administered|closed|treated|advocated|litigated|formulated|standardized|transformed|facilitated|curated|evaluated|monitored)\b/i;

  for (const line of rawLines) {
    if (!isReadableEnglishText(line)) continue;

    // Strip leading bullet marks
    let cleanLine = line.replace(/^[•\-\*\+\d\.\)\:\>\s]+/, '').trim();
    if (cleanLine.length < 25 || cleanLine.length > 300) continue;

    // Filter out standard section headers
    if (/^(experience|education|skills|summary|projects|contact|certifications|awards|languages|hobbies|references|interests|technical skills|professional experience|core competencies|work history|career history|employment history)$/i.test(cleanLine)) {
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
