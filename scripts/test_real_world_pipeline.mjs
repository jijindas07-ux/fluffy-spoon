import fs from 'fs';
import path from 'path';

async function runRealWorldPipelineTests() {
  const { extractTextFromPdfBuffer, validateTextQuality } = await import('../src/lib/engine/pdfParser.ts');
  const { extractClaimsFromText } = await import('../src/lib/engine/claimExtractor.ts');
  const { AdaptiveInterviewEngine } = await import('../src/lib/engine/adaptiveEngine.ts');
  const { InterviewEvaluator } = await import('../src/lib/engine/evaluator.ts');

  console.log('================================================================');
  console.log('       REAL-WORLD END-TO-END PIPELINE & INTERVIEW PROBE TEST    ');
  console.log('================================================================\n');

  // --- PART 1: Multi-Turn Socratic Interview Flow on Real Resume ---
  console.log('>>> PART 1: Testing Full Resume -> Profile -> Multi-Turn Adaptive Probe');
  const resumePath = 'C:/Users/Jijin/Desktop/interview-ai/scratch/test_pdfs/2_canva_two_column_resume.pdf';
  const buffer = fs.readFileSync(resumePath);
  const rawText = await extractTextFromPdfBuffer(buffer);
  const profile = extractClaimsFromText(rawText, 'Marcus Vance');

  console.log('Candidate Name:', profile.name);
  console.log('Job Title:', profile.title);
  console.log('Years of Exp:', profile.experienceYears);
  console.log('Projects Extracted:', profile.projects.length);
  console.log('Claims Extracted:', profile.claims.length);
  console.log('Skills Extracted:', profile.skills);

  const interviewConfig = {
    roleTitle: profile.title,
    seniority: 'Senior',
    durationMinutes: 15,
    focusArea: 'System Architecture & Scale',
    rigorLevel: 'Rigorous & Challenging'
  };

  const history = [];

  // Turn 1: AI Asks Inception Question on Claim 1
  const turn1 = AdaptiveInterviewEngine.generateNextQuestion(profile, interviewConfig, history, 0, 1);
  console.log('\n[AI Turn 1]:', turn1.question);
  console.log('  • Anchored Claim:', turn1.anchoredClaimId);
  console.log('  • Context:', turn1.investigationContext);

  history.push({
    id: 'turn-1',
    speaker: 'interviewer',
    text: turn1.question,
    timestamp: new Date().toISOString()
  });

  // Candidate Answers Turn 1 with specifics (Next.js, SSR, caching, Redis)
  const candidateAnswer1 = 'When migrating our frontend to Next.js, we faced significant initial SSR latency on our dynamic dashboard. I implemented incremental static regeneration (ISR) combined with edge caching in Cloudflare and a Redis multi-tier cache layer for frequently accessed user session data. This eliminated redundant database hits and reduced page load times by 45%.';
  console.log('\n[Candidate Turn 1 Answer]:', candidateAnswer1);

  history.push({
    id: 'turn-2',
    speaker: 'candidate',
    text: candidateAnswer1,
    timestamp: new Date().toISOString()
  });

  // Turn 2: AI Analyzes Candidate Answer and Asks Follow-up (Level 2 depth)
  const turn2 = AdaptiveInterviewEngine.generateNextQuestion(profile, interviewConfig, history, 0, 2);
  console.log('\n[AI Turn 2 (Adaptive Follow-up)]:', turn2.question);
  console.log('  • Investigation Note:', turn2.investigationContext);

  history.push({
    id: 'turn-3',
    speaker: 'interviewer',
    text: turn2.question,
    timestamp: new Date().toISOString()
  });

  // Candidate Answers Turn 2 with trade-off specifics
  const candidateAnswer2 = 'We chose Redis with cluster sharding and read-replicas over Memcached because we needed data persistence and native support for Pub/Sub messaging for live presence notifications. The trade-off was handling cache invalidation on stale writes, which we solved using distributed cache tags with TTLs.';
  console.log('\n[Candidate Turn 2 Answer]:', candidateAnswer2);

  history.push({
    id: 'turn-4',
    speaker: 'candidate',
    text: candidateAnswer2,
    timestamp: new Date().toISOString()
  });

  // Turn 3: AI Evaluates and pivots to edge cases or next claim
  const turn3 = AdaptiveInterviewEngine.generateNextQuestion(profile, interviewConfig, history, 0, 3);
  console.log('\n[AI Turn 3 (Trade-off & Resiliency)]:', turn3.question);

  // Generate Final Evaluation Report
  const evalReport = InterviewEvaluator.generateEvaluation(profile, interviewConfig, history, 'test-sess-1');
  console.log('\n>>> EVALUATION REPORT GENERATED:');
  console.log('  • Overall Score:', evalReport.overallScore, '/ 100');
  console.log('  • Recommendation:', evalReport.recommendation);
  console.log('  • Evidence Items Recorded:', evalReport.evidenceItems.length);
  console.log('  • Strengths Count:', evalReport.strengths.length);
  console.log('  • Technical Competency Score:', evalReport.dimensions.technicalCompetency.score, '/ 100');

  // --- PART 2: Comprehensive Failure Case Testing ---
  console.log('\n================================================================');
  console.log('>>> PART 2: Testing Edge Cases and Failure Modes');
  console.log('================================================================\n');

  const failureCases = [
    {
      name: 'Empty / Zero-Byte Buffer',
      buffer: Buffer.alloc(0),
      expectedValid: false
    },
    {
      name: 'Unreadable / Corrupted Garbage Binary',
      buffer: Buffer.from('PDF-1.4 %\x00\x00\x00\xff\xfe CORRUPTED STREAM DATA'),
      expectedValid: false
    },
    {
      name: 'Very Short Text Resume (< 25 characters)',
      buffer: Buffer.from('Alex Software'),
      expectedValid: false
    },
    {
      name: 'Fresh Graduate / No Prior Experience',
      rawText: 'Sarah Jenkins\nEmail: s.jenkins@college.edu\nEducation: B.S. Computer Science, University of Illinois (2024)\nSkills: Python, Java, C++, Git\nCoursework: Data Structures, Operating Systems, Database Management Systems',
      expectedValid: true
    },
    {
      name: 'Resume with Skills & Summary but No Formal Projects Section',
      rawText: 'Robert Taylor\nStaff Database Administrator\nSummary: Experienced DBA with 12 years managing enterprise Oracle and PostgreSQL databases.\nSkills: PostgreSQL, Oracle, MySQL, Linux, Performance Tuning',
      expectedValid: true
    }
  ];

  for (const fc of failureCases) {
    if (fc.buffer !== undefined) {
      const text = await extractTextFromPdfBuffer(fc.buffer);
      const validation = validateTextQuality(text);
      const passed = validation.isValid === fc.expectedValid;
      console.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + fc.name);
      console.log('  • Extracted Text Length: ' + text.length + ' | Valid: ' + validation.isValid + (validation.reason ? ' (' + validation.reason + ')' : ''));
    } else if (fc.rawText !== undefined) {
      const prof = extractClaimsFromText(fc.rawText, 'Candidate');
      const passed = Boolean(prof.name && prof.skills && prof.claims.length >= 1 && prof.claims.every(c => !c.rawClaim.includes('undefined')));
      console.log('[' + (passed ? 'PASS' : 'FAIL') + '] ' + fc.name);
      console.log('  • Name: ' + prof.name + ' | Claims Extracted: ' + prof.claims.length);
      console.log('  • Sample Grounded Claim: "' + (prof.claims[0]?.rawClaim || 'None') + '"');
    }
  }

  console.log('\n================================================================');
  console.log('           ALL END-TO-END PIPELINE TESTS COMPLETED              ');
  console.log('================================================================');
}

runRealWorldPipelineTests().catch(console.error);
