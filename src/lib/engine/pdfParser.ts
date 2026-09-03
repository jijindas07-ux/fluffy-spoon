import zlib from 'zlib';

/**
 * Clean and sanitize extracted text from PDF documents.
 * Fixes broken formatting, PDF ligatures, CID codes, hyphenated line wraps,
 * octal escape codes, and non-English / corrupted font artifacts.
 */
export function cleanPdfText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove octal string codes like \001\000\002\000\003\000
    .replace(/\\00[0-7]/g, ' ')
    .replace(/\\u00[0-1][0-9a-fA-F]/g, ' ')
    // Remove null bytes and invisible control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u0000-\u001F]/g, ' ')
    // Replace CID font markers like (cid:123)
    .replace(/\(cid:\d+\)/gi, ' ')
    // Normalize unicode ligatures
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '\n• ')
    .replace(/\u00A0/g, ' ');

  // Fix hyphenated words split across line breaks (e.g. "micro-\nservices" -> "microservices")
  cleaned = cleaned.replace(/([a-zA-Z]{2,})-\s*[\r\n]+\s*([a-zA-Z]{2,})/g, '$1$2');

  // Replace excessive carriage returns / newlines with clean double newline
  cleaned = cleaned.replace(/(\r\n|\r|\n){3,}/g, '\n\n');

  // Clean lines: strip leading bullet junk and whitespace
  const lines = cleaned.split('\n').map(line => {
    let l = line.trim();
    // Normalize BOM and leading garbage
    l = l.replace(/^[\uFEFF\uFFFE\u00EF\u00BB\u00BF]+/, '');
    l = l.replace(/^[^\w\s•\-\(\)\[\]"'.,:;/$%#&%+@]+/, '');
    return l;
  }).filter(line => line.length > 0);

  return lines.join('\n');
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
  const actionVerbRegex = /^(?:built|architected|designed|developed|implemented|optimized|scaled|reduced|created|managed|directed|spearheaded|engineered|led|delivered|handled|improved|analyzed|coordinated|maintained|authored|resolved|established|automated|launched|integrated|collaborated|executed|configured|deployed|mentored|authored|refactored|secured|migrated)\b/i;

  for (const line of rawLines) {
    // Strip leading bullet marks
    let cleanLine = line.replace(/^[•\-\*\+\d\.\)\:\>\s]+/, '').trim();
    if (cleanLine.length < 20 || cleanLine.length > 300) continue;

    // Filter out standard section headers
    if (/^(experience|education|skills|summary|projects|contact|certifications|awards|languages|hobbies|references|interests|technical skills|professional experience)$/i.test(cleanLine)) {
      continue;
    }

    // Check if line is a bullet point or key statement
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line);
    const hasMetrics = metricsRegex.test(cleanLine);
    const startsWithAction = actionVerbRegex.test(cleanLine);

    if (isBullet || hasMetrics || startsWithAction || cleanLine.length > 45) {
      // Normalize capitalization
      cleanLine = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);
      if (!/[.!?]$/.test(cleanLine)) cleanLine += '.';

      const lowerKey = cleanLine.toLowerCase().slice(0, 60);
      if (!seen.has(lowerKey)) {
        seen.add(lowerKey);
        keyPoints.push(cleanLine);
      }
    }
  }

  return keyPoints;
}

/**
 * Decode PDF octal escapes \ddd in raw PDF literal strings
 */
function decodePdfOctalString(raw: string): string {
  if (!raw) return '';
  let decoded = raw.replace(/\\([0-7]{1,3})/g, (_, oct) => {
    const charCode = parseInt(oct, 8);
    return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
  });
  decoded = decoded.replace(/\\([\(\)\\])/g, '$1');
  return decoded.replace(/[\x00-\x1F\x7F-\x9F\u0000-\u001F]/g, ' ');
}

/**
 * Fallback PDF text stream extractor for raw PDF Buffers.
 * Decompresses FlateDecode streams using native Node zlib and extracts BT...ET text blocks.
 */
function extractTextFromRawPdfBuffer(buffer: Buffer): string {
  const textChunks: string[] = [];
  const content = buffer.toString('binary');

  // Regex to find stream objects
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStreamData = match[1];
    let streamText = '';

    // Try decompressing FlateDecode stream
    try {
      const streamBuf = Buffer.from(rawStreamData, 'binary');
      const decompressed = zlib.inflateSync(streamBuf);
      streamText = decompressed.toString('latin1');
    } catch {
      // If decompression fails or stream is uncompressed
      streamText = rawStreamData;
    }

    // Extract text operators inside BT...ET
    const btRegex = /BT[\s\S]*?ET/g;
    let btMatch: RegExpExecArray | null;
    while ((btMatch = btRegex.exec(streamText)) !== null) {
      const btBlock = btMatch[0];

      // Match (string) Tj or (string) ' or (string) "
      const tjRegex = /\((.*?)\)\s*(?:Tj|'|")/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
        const decoded = decodePdfOctalString(tjMatch[1]);
        if (decoded.trim().length > 0) textChunks.push(decoded);
      }

      // Match [(array)] TJ
      const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = arrayTjRegex.exec(btBlock)) !== null) {
        const arrayContent = arrayMatch[1];
        const stringInArrayRegex = /\((.*?)\)/g;
        let strMatch: RegExpExecArray | null;
        let lineAcc = '';
        while ((strMatch = stringInArrayRegex.exec(arrayContent)) !== null) {
          lineAcc += decodePdfOctalString(strMatch[1]);
        }
        if (lineAcc.trim().length > 0) textChunks.push(lineAcc);
      }
    }
  }

  // Fallback to extracting ASCII string sequences if stream parsing found nothing
  if (textChunks.length === 0) {
    const asciiRegex = /[A-Za-z0-9\s.,;:()\/\-%#@&$+='"]{4,}/g;
    let asciiMatch: RegExpExecArray | null;
    while ((asciiMatch = asciiRegex.exec(content)) !== null) {
      const str = asciiMatch[0].trim();
      if (!str.includes('obj') && !str.includes('endobj') && !str.includes('Filter') && !str.includes('FlateDecode')) {
        textChunks.push(str);
      }
    }
  }

  return cleanPdfText(textChunks.join(' '));
}

/**
 * Main PDF text extractor function.
 * Supports both pdf-parse v2 (PDFParse class) and v1 (function), with fallback to raw stream decompressor.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // 1. Try pdf-parse v2 (PDFParse class)
  try {
    const pdfModule = require('pdf-parse');
    const PDFParseClass = pdfModule.PDFParse || (typeof pdfModule === 'function' ? pdfModule : null);
    
    if (PDFParseClass && PDFParseClass.prototype && typeof PDFParseClass.prototype.getText === 'function') {
      const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      if (typeof parser.destroy === 'function') {
        try { await parser.destroy(); } catch {}
      }
      if (textResult && textResult.text && textResult.text.trim().length > 15) {
        return cleanPdfText(textResult.text);
      }
    }
  } catch (e) {
    console.warn('pdf-parse v2 extraction warning:', e);
  }

  // 2. Try legacy pdf-parse v1 function
  try {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
      const parsed = await pdfModule(buffer);
      if (parsed && parsed.text && parsed.text.trim().length > 15) {
        return cleanPdfText(parsed.text);
      }
    }
  } catch (e) {
    console.warn('pdf-parse v1 extraction warning:', e);
  }

  // 3. Fallback to native Node zlib PDF stream decompressor
  return extractTextFromRawPdfBuffer(buffer);
}
