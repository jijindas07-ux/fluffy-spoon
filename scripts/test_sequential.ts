import fs from 'fs';
import path from 'path';
import { extractTextFromPdfBuffer } from '../src/lib/engine/pdfParser';
import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { AdaptiveInterviewEngine } from '../src/lib/engine/adaptiveEngine';
import { memoryStore } from '../src/lib/db/client';

async function run() {
  console.log('================================================================');
  console.log('🧪 RUNNING SEQUENTIAL UPLOAD ISOLATION & STALE DATA TEST');
  console.log('================================================================\n');

  const pdfA = fs.readFileSync(path.resolve('scratch/test_pdfs/1_normal_resume.pdf'));
  const pdfB = fs.readFileSync(path.resolve('scratch/test_pdfs/2_canva_two_column_resume.pdf'));
  const pdfC = fs.readFileSync(path.resolve('scratch/test_pdfs/3_word_exported_resume.pdf'));

  // Step 1: Upload Resume A
  console.log('--- Step 1: Uploading Resume A (Jane Doe) ---');
  const textA = await extractTextFromPdfBuffer(pdfA);
  const profileA = extractClaimsFromText(textA, 'Jane Doe');
  await memoryStore.saveCandidate(profileA);
  console.log(`[PROFILE A] ID: ${profileA.id}, Name: "${profileA.name}", Title: "${profileA.title}"`);
  console.log(`[CLAIMS A] Count: ${profileA.claims.length}`);
  profileA.claims.forEach((c, i) => console.log(`   Claim #${i+1}: ${c.rawClaim}`));

  if (!profileA.name.includes('Jane') && !profileA.name.includes('Doe')) {
    throw new Error(`Expected Jane Doe in Profile A, got ${profileA.name}`);
  }

  // Generate question for A
  const qA = AdaptiveInterviewEngine.generateNextQuestion(
    profileA,
    { roleTitle: profileA.title, seniority: 'Senior', durationMinutes: 15, focusArea: 'Deep Technical Verification', rigorLevel: 'Rigorous & Challenging' },
    [],
    0,
    1
  );
  console.log(`[INTERVIEW Q for A]: "${qA.question}"\n`);

  // Step 2: Upload Resume B
  console.log('--- Step 2: Uploading Resume B (Marcus Vance) ---');
  const textB = await extractTextFromPdfBuffer(pdfB);
  const profileB = extractClaimsFromText(textB, 'Marcus Vance');
  await memoryStore.saveCandidate(profileB);
  console.log(`[PROFILE B] ID: ${profileB.id}, Name: "${profileB.name}", Title: "${profileB.title}"`);
  console.log(`[CLAIMS B] Count: ${profileB.claims.length}`);
  profileB.claims.forEach((c, i) => console.log(`   Claim #${i+1}: ${c.rawClaim}`));

  // Verify B has NO Jane Doe info or IDs
  if (profileB.id === profileA.id) {
    throw new Error(`Profile B reused Profile A's ID! ${profileB.id}`);
  }
  if (profileB.name.includes('Jane') || profileB.name.includes('Doe')) {
    throw new Error(`Profile B leaked Profile A's name!`);
  }
  for (const claimB of profileB.claims) {
    if (claimB.rawClaim.toLowerCase().includes('jane') || claimB.rawClaim.toLowerCase().includes('fintech core')) {
      throw new Error(`Profile B leaked Profile A's claim: ${claimB.rawClaim}`);
    }
  }

  const qB = AdaptiveInterviewEngine.generateNextQuestion(
    profileB,
    { roleTitle: profileB.title, seniority: 'Staff / Lead', durationMinutes: 15, focusArea: 'System Architecture & Scale', rigorLevel: 'Rigorous & Challenging' },
    [],
    0,
    1
  );
  console.log(`[INTERVIEW Q for B]: "${qB.question}"\n`);
  if (qB.question.toLowerCase().includes('jane') || qB.question.toLowerCase().includes('fintech core')) {
    throw new Error(`Interview engine for B leaked A's data!`);
  }

  // Step 3: Upload Resume C
  console.log('--- Step 3: Uploading Resume C (David Kim) ---');
  const textC = await extractTextFromPdfBuffer(pdfC);
  const profileC = extractClaimsFromText(textC, 'David Kim');
  await memoryStore.saveCandidate(profileC);
  console.log(`[PROFILE C] ID: ${profileC.id}, Name: "${profileC.name}", Title: "${profileC.title}"`);
  console.log(`[CLAIMS C] Count: ${profileC.claims.length}`);
  profileC.claims.forEach((c, i) => console.log(`   Claim #${i+1}: ${c.rawClaim}`));

  if (profileC.id === profileA.id || profileC.id === profileB.id) {
    throw new Error(`Profile C reused an old ID!`);
  }
  if (profileC.name.includes('Jane') || profileC.name.includes('Marcus')) {
    throw new Error(`Profile C leaked prior candidate's name!`);
  }

  // Step 4: Re-upload Resume A (A -> B -> A sequence test)
  console.log('--- Step 4: Re-uploading Resume A (Jane Doe) in A -> B -> A test ---');
  const textA2 = await extractTextFromPdfBuffer(pdfA);
  const profileA2 = extractClaimsFromText(textA2, 'Jane Doe');
  await memoryStore.saveCandidate(profileA2);
  console.log(`[PROFILE A2] ID: ${profileA2.id}, Name: "${profileA2.name}", Title: "${profileA2.title}"`);
  console.log(`[CLAIMS A2] Count: ${profileA2.claims.length}`);

  if (profileA2.id === profileA.id) {
    throw new Error(`Re-uploaded Profile A should receive a fresh unique ID!`);
  }
  if (profileA2.name.includes('Marcus') || profileA2.name.includes('David')) {
    throw new Error(`Re-uploaded Profile A leaked B or C data!`);
  }

  console.log('\n================================================================');
  console.log('✅ ALL SEQUENTIAL ISOLATION TESTS PASSED WITH 100% DATA INTEGRITY!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
