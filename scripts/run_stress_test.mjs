import fs from 'fs';
import path from 'path';

async function runStressTest() {
  const { extractTextFromPdfBuffer, validateTextQuality, cleanPdfText } = await import('../src/lib/engine/pdfParser.ts');
  const { extractClaimsFromText } = await import('../src/lib/engine/claimExtractor.ts');
  const { AdaptiveInterviewEngine } = await import('../src/lib/engine/adaptiveEngine.ts');

  const testDir = 'C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs';
  const pdfFiles = [
    { file: '1_normal_resume.pdf', name: 'Normal Text PDF', expectedName: 'Jane Doe', expectedTerms: ['Golang', 'Kafka', 'CockroachDB', '35%'] },
    { file: '2_canva_two_column_resume.pdf', name: 'Canva / Two-Column Resume', expectedName: 'Marcus Vance', expectedTerms: ['React.js', 'Node.js', 'C++', 'C#', '.NET', 'CI/CD', '45%'] },
    { file: '3_word_exported_resume.pdf', name: 'Word/Google Docs Exported PDF', expectedName: 'David Kim', expectedTerms: ['AWS', 'Azure', 'Kubernetes', '99.99%', 'Terraform'] },
    { file: '4_table_resume.pdf', name: 'Resume with Structured Tables', expectedName: 'Elena Rostova', expectedTerms: ['Stripe', 'Airbnb', '800M', '72%', 'Raft'] },
    { file: '5_graphical_resume.pdf', name: 'Resume with Vector Shapes & Badges', expectedName: 'Sarah Connor', expectedTerms: ['99.999%', 'Cyberdyne', 'Prometheus', 'MTTR', '65%'] },
    { file: '6_scanned_image_resume.pdf', name: 'Scanned / Image-Only Resume (OCR)', expectedName: 'Michael Chang', expectedTerms: ['Cypress', 'Playwright', 'QA', '55 percent', '92 percent'] },
    { file: '7_tech_stack_resume.pdf', name: 'Resume with C++, C#, .NET, Node.js, React.js, CI/CD', expectedName: 'Vikram Sharma', expectedTerms: ['C++', 'C#', '.NET', 'Node.js', 'React.js', 'CI/CD', '50M'] },
    { file: '8_full_contact_metrics_resume.pdf', name: 'URLs, Emails, Phones, Dates & Percentages', expectedName: 'Emily Watson', expectedTerms: ['emily.watson@growthlab.co', 'https://emilywatson.dev', '312', '180%', '3.8M'] },
    { file: '9_multi_page_resume.pdf', name: 'Multi-Page Resume (2 Pages)', expectedName: 'Alexander Hayes', expectedTerms: ['NeuralScale', 'DeepMind', '70B', '62%', 'NVIDIA H100'] },
    { file: '10_ligatures_custom_font.pdf', name: 'Ligatures & Custom Font Formatting', expectedName: 'Flora Fitzpatrick', expectedTerms: ['cryptographic', '75%', 'zero-day', 'protocol'] }
  ];

  console.log('================================================================');
  console.log('           VERVE AI RESUME PARSING STRESS-TEST SUITE            ');
  console.log('================================================================\n');

  const results = [];

  for (const tc of pdfFiles) {
    const fullPath = path.join(testDir, tc.file);
    if (!fs.existsSync(fullPath)) {
      console.log('SKIPPED (File not found):', tc.name);
      continue;
    }

    const buffer = fs.readFileSync(fullPath);
    const startTime = Date.now();
    
    // 1. Text Extraction
    const rawExtracted = await extractTextFromPdfBuffer(buffer);
    const durationMs = Date.now() - startTime;
    
    // 2. Text Quality Validation
    const validation = validateTextQuality(rawExtracted);

    // 3. Check for Preserved Expected Terms
    const missingTerms = tc.expectedTerms.filter(t => !rawExtracted.toLowerCase().includes(t.toLowerCase()));

    // 4. Candidate Profile & Claim Extraction
    const profile = extractClaimsFromText(rawExtracted, tc.expectedName);

    // 5. Adaptive Interview Question Generation Test
    const interviewConfig = {
      roleTitle: profile.title || 'Senior Software Engineer',
      seniority: 'Staff / Lead',
      durationMinutes: 15,
      focusArea: 'System Architecture & Scale',
      rigorLevel: 'High-Bar FAANG Style'
    };

    const firstQuestion = AdaptiveInterviewEngine.generateNextQuestion(profile, interviewConfig, [], 0, 1);

    // Evaluate Pass / Fail
    const isReadable = rawExtracted.length > 50 && !rawExtracted.includes('\x00');
    const isNamePreserved = profile.name.toLowerCase().includes(tc.expectedName.toLowerCase()) || rawExtracted.toLowerCase().includes(tc.expectedName.toLowerCase());
    const hasClaims = profile.claims.length > 0;
    const isQuestionGrounded = firstQuestion.question.length > 20 && !firstQuestion.question.includes('undefined');

    const passed = isReadable && validation.isValid && missingTerms.length === 0 && isNamePreserved && hasClaims && isQuestionGrounded;

    results.push({
      testName: tc.name,
      file: tc.file,
      passed,
      textLength: rawExtracted.length,
      qualityScore: Math.round(validation.qualityScore * 100) + '%',
      claimsExtracted: profile.claims.length,
      missingTerms,
      candidateName: profile.name,
      jobTitle: profile.title,
      sampleQuestion: firstQuestion.question.slice(0, 90) + '...',
      durationMs
    });

    console.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + tc.name);
    console.log('  • Characters: ' + rawExtracted.length + ' | Quality: ' + Math.round(validation.qualityScore * 100) + '% | Time: ' + durationMs + 'ms');
    console.log('  • Candidate: ' + profile.name + ' (' + (profile.title || 'No Title') + ')');
    console.log('  • Claims Extracted (' + profile.claims.length + '): ' + (profile.claims[0]?.rawClaim || 'None'));
    console.log('  • Sample Interview Q: ' + firstQuestion.question.slice(0, 85) + '...');
    if (missingTerms.length > 0) {
      console.log('  • Missing Terms: ' + missingTerms.join(', '));
    }
    console.log('');
  }

  // 11. Test Corrupted Extraction Rejection Test
  console.log('--- Corrupted Data Rejection & OCR Fallback Trigger Test ---');
  const corruptedBinaryText = 'Random PostScript bytes \x00\x00\x00 (cid:10)(cid:11)(cid:12)(cid:13)(cid:14) /XYZ /Fit 34 0 R';
  const corruptedValidation = validateTextQuality(corruptedBinaryText);
  const rejectPassed = !corruptedValidation.isValid;
  console.log('[' + (rejectPassed ? 'PASS' : 'FAIL') + '] Corrupted Extraction Rejection (Null bytes & CID tags)');
  console.log('  • Rejection Reason: ' + corruptedValidation.reason);
  console.log('  • Valid: ' + corruptedValidation.isValid + ' (Expected: false)\n');

  console.log('================================================================');
  console.log('                       SUMMARY RESULTS                          ');
  console.log('================================================================');
  const totalPassed = results.filter(r => r.passed).length + (rejectPassed ? 1 : 0);
  const totalTests = results.length + 1;
  console.log('Total Tests: ' + totalTests + ' | Passed: ' + totalPassed + ' | Failed: ' + (totalTests - totalPassed));
  console.log('Success Rate: ' + Math.round((totalPassed / totalTests) * 100) + '%');
}

runStressTest().catch(console.error);
