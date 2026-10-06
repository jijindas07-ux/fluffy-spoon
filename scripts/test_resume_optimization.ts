import { extractTextFromDocxBuffer, computeBufferSha256 } from '../src/lib/engine/pdfParser';
import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { memoryStore } from '../src/lib/db/client';
import { SAMPLE_CANDIDATES } from '../src/lib/data/sampleResumes';
import zlib from 'zlib';

async function testOptimizations() {
  console.log('===========================================================');
  console.log('⚡ RESUME UPLOAD & ANALYSIS OPTIMIZATION BENCHMARK');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Benchmark Native DOCX Extraction Speed
  console.log('--- 1. DOCX Native Extraction Benchmark ---');
  // Construct a minimal valid DOCX zip buffer with word/document.xml
  const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      <w:p><w:r><w:t>Emily Watson</w:t></w:r></w:p>
      <w:p><w:r><w:t>Clinical Nurse Specialist with 7 years acute care experience.</w:t></w:r></w:p>
      <w:p><w:r><w:t>• Reduced patient triage wait time by 38% across ICU department.</w:t></w:r></w:p>
      <w:p><w:r><w:t>• Led EHR transition to Epic for 65 medical staff with 100% compliance.</w:t></w:r></w:p>
    </w:body>
  </w:document>`;
  
  const compressedXml = zlib.deflateRawSync(Buffer.from(xmlContent, 'utf-8'));
  const fileName = 'word/document.xml';
  const fileNameBuf = Buffer.from(fileName, 'utf-8');

  // Build ZIP local file header
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // signature
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // general flags
  header.writeUInt16LE(8, 8); // compression method (deflate)
  header.writeUInt16LE(0, 10); // mod time
  header.writeUInt16LE(0, 12); // mod date
  header.writeUInt32LE(0, 14); // crc32
  header.writeUInt32LE(compressedXml.length, 18); // compressed size
  header.writeUInt32LE(Buffer.byteLength(xmlContent), 22); // uncompressed size
  header.writeUInt16LE(fileNameBuf.length, 26); // file name length
  header.writeUInt16LE(0, 28); // extra field length

  const mockDocxBuffer = Buffer.concat([header, fileNameBuf, compressedXml]);

  const tDocx0 = performance.now();
  const extractedDocxText = extractTextFromDocxBuffer(mockDocxBuffer);
  const tDocx1 = performance.now();
  const docxDuration = tDocx1 - tDocx0;

  console.log(`DOCX Extraction Duration: ${docxDuration.toFixed(2)}ms`);
  assert(docxDuration < 20, `DOCX extraction is sub-20ms (Got ${docxDuration.toFixed(2)}ms)`);
  assert(extractedDocxText.includes('Emily Watson'), 'Extracted candidate name from DOCX');
  assert(extractedDocxText.includes('38%'), 'Extracted quantifiable metrics from DOCX');

  // 2. Benchmark SHA-256 Content-Hash Duplicate Caching
  console.log('\n--- 2. SHA-256 Duplicate Content-Hash Caching (SRS FR-002) ---');
  const dummyBuffer = Buffer.from(extractedDocxText, 'utf-8');
  const hash = computeBufferSha256(dummyBuffer);
  assert(hash.length === 64, `Computed valid SHA-256 hash (${hash.slice(0, 16)}...)`);

  const mockProfile = extractClaimsFromText(extractedDocxText, 'Emily Watson');
  memoryStore.saveCachedResume(hash, mockProfile);

  const tCache0 = performance.now();
  const cachedProfile = memoryStore.getCachedResume(hash);
  const tCache1 = performance.now();
  const cacheDuration = tCache1 - tCache0;

  console.log(`Cache Retrieval Duration: ${cacheDuration.toFixed(2)}ms`);
  assert(cacheDuration < 5, `Cache retrieval is sub-5ms (Got ${cacheDuration.toFixed(2)}ms)`);
  assert(cachedProfile !== null, 'Found cached profile for identical file hash');

  // 3. Test Candidate Data Isolation on Cache Hit
  console.log('\n--- 3. Candidate Data Isolation on Repeat Uploads ---');
  assert(cachedProfile?.id !== mockProfile.id, 'Cached clone generates fresh unique candidate ID');
  assert(cachedProfile?.claims[0]?.id !== mockProfile.claims[0]?.id, 'Cached clone generates fresh unique claim IDs');

  // 4. Test Extraction Accuracy Across Diverse Domains
  console.log('\n--- 4. Extraction Accuracy Across Domains ---');
  const domains = [
    { domain: 'Finance', text: 'Senior VP of Finance with 10 years experience. Managed $45M portfolio with 14% annual return in SAP and Oracle Financials.' },
    { domain: 'HR', text: 'Talent Acquisition Director. Sourced 320 hires via Greenhouse and LinkedIn Recruiter, reducing agency spend by $240K.' },
    { domain: 'Tech', text: 'Lead Cloud Architect. Migrated 40 microservices to Kubernetes on AWS, achieving 99.99% uptime and sub-50ms latency.' }
  ];

  for (const d of domains) {
    const t0 = performance.now();
    const p = extractClaimsFromText(d.text);
    const t1 = performance.now();
    console.log(`[${d.domain}] Extracted in ${(t1 - t0).toFixed(2)}ms -> ${p.claims.length} claims, Title: "${p.title}"`);
    assert(p.claims.length > 0, `Extracted verified claims for ${d.domain}`);
  }

  console.log('\n===========================================================');
  console.log(`🏁 OPTIMIZATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');
}

testOptimizations();
