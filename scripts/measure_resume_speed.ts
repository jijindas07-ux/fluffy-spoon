import { extractTextFromPdfBuffer } from '../src/lib/engine/pdfParser';
import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { SAMPLE_CANDIDATES } from '../src/lib/data/sampleResumes';

async function benchmark() {
  console.log('=== RESUME EXTRACTION SPEED BENCHMARK ===');

  const sampleText = SAMPLE_CANDIDATES[0].summary + '\n' + SAMPLE_CANDIDATES[0].projects.map(p => `${p.title} - ${p.role}: ${p.description} ${p.highlights.join(' ')}`).join('\n');

  console.log(`Testing text length: ${sampleText.length} chars`);

  const t0 = performance.now();
  const profile = extractClaimsFromText(sampleText, 'Alex Rivera');
  const t1 = performance.now();

  console.log(`Local Claim Extractor Time: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Extracted Claims: ${profile.claims.length}`);
  console.log(`Detected Name: ${profile.name}, Title: ${profile.title}`);
}

benchmark();
