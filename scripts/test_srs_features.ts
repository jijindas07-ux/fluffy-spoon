import { AdaptiveInterviewEngine } from '../src/lib/engine/adaptiveEngine';
import { InterviewPlanner } from '../src/lib/engine/interviewPlanner';
import { QuestionValidator } from '../src/lib/engine/questionValidator';
import { JDParser } from '../src/lib/engine/jdParser';
import { InterviewEvaluator } from '../src/lib/engine/evaluator';
import { TelemetryService } from '../src/lib/engine/telemetry';
import { memoryStore } from '../src/lib/db/client';
import { CandidateProfile, InterviewConfig, ConversationTurn } from '../src/lib/types';

async function runSRSSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING ALPHAGREW SRS TEST & VALIDATION SUITE');
  console.log('====================================================\n');

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

  // 1. Test Universal Domain Detection (No IT-only bias)
  console.log('--- 1. Universal Domain Detection (SRS Non-Bias) ---');
  const financeCandidate: CandidateProfile = {
    id: 'c-fin',
    name: 'Sarah Jenkins',
    title: 'Senior Financial Analyst',
    experienceYears: 6,
    summary: 'Expert in financial modeling, FP&A variance analysis, and corporate budget forecasting.',
    skills: { languages: ['Financial Modeling', 'GAAP'], frameworks: ['IFRS'], databases: ['Oracle Financials', 'SAP'], toolsAndInfra: ['Excel', 'Power BI'] },
    projects: [],
    education: [],
    claims: [
      { id: 'clm-1', rawClaim: 'Managed a $12M operating budget with 0.8% variance.', category: 'Impact & Results', contextProject: 'FY25 Budgeting', claimedMetrics: '$12M, 0.8% variance', confidenceLevel: 'High', verificationStatus: 'Pending' }
    ]
  };
  const hrCandidate: CandidateProfile = {
    id: 'c-hr',
    name: 'David Miller',
    title: 'Head of Talent Acquisition',
    experienceYears: 8,
    summary: 'Led full-cycle campus hiring and recruitment pipeline for 450+ hires.',
    skills: { languages: ['Talent Sourcing', 'Boolean Search'], frameworks: ['STAR Methodology'], databases: ['Workday', 'Greenhouse'], toolsAndInfra: ['LinkedIn Recruiter'] },
    projects: [],
    education: [],
    claims: [
      { id: 'clm-hr-1', rawClaim: 'Reduced average time-to-fill from 42 days to 24 days across 180 technical requisitions.', category: 'Process & Operations', contextProject: 'Hiring Overhaul', claimedMetrics: '42 to 24 days', confidenceLevel: 'High', verificationStatus: 'Pending' }
    ]
  };

  const domainFin = AdaptiveInterviewEngine.detectDomain(financeCandidate);
  const domainHr = AdaptiveInterviewEngine.detectDomain(hrCandidate);
  assert(domainFin === 'finance', 'Detected Finance domain correctly');
  assert(domainHr === 'hr', 'Detected HR domain correctly');

  // 2. Test Bounded Interview Plan Creation (FR-006)
  console.log('\n--- 2. Interview Planning & Stage Budgeting (FR-006) ---');
  const config15Min: InterviewConfig = {
    roleTitle: 'Senior Financial Analyst',
    seniority: 'Senior',
    durationMinutes: 15,
    focusArea: 'Core Competencies & Claim Verification',
    rigorLevel: 'Rigorous & Challenging'
  };
  const plan = InterviewPlanner.createInterviewPlan(financeCandidate, config15Min);
  assert(plan.stages.length >= 5, `Plan generated ${plan.stages.length} stages for 15-min interview`);
  assert(plan.totalDurationMinutes === 15, 'Total planned duration is 15 minutes');
  assert(plan.stages[0].stage === 'INTRO', 'Plan starts with INTRO stage');

  // 3. Test SRS 11-Stage State Machine Transitions
  console.log('\n--- 3. SRS 11-Stage State Machine & Time Management (FR-014) ---');
  const stageTransition = InterviewPlanner.getNextStage('INTRO', plan, 60, 900, 1);
  assert(stageTransition.nextStage === 'RESUME_DISCUSSION', `Transitions INTRO -> RESUME_DISCUSSION (Got: ${stageTransition.nextStage})`);

  // Time management: When time is < 90s left, optional stages are skipped
  const timeConstrainedTransition = InterviewPlanner.getNextStage('PROJECT_DEEP_DIVE', plan, 840, 900, 2);
  assert(timeConstrainedTransition.nextStage === 'FINALIZING', `Time management skipped optional PROBLEM_SOLVING stage when 60s remaining`);

  // 4. Test Question Quality Gate & Anti-Repetition (FR-008, FR-013)
  console.log('\n--- 4. Question Quality Gate & Anti-Repetition (FR-008, FR-013) ---');
  const history: ConversationTurn[] = [
    { id: 't1', speaker: 'ai', text: 'Could you explain your financial modeling methodology for the $12M budget?', timestamp: Date.now(), stage: 'TECHNICAL' }
  ];
  const duplicateQ = 'Could you explain your financial modeling methodology for the $12M budget?';
  const gateDuplicate = QuestionValidator.validateQuestion(duplicateQ, history, financeCandidate);
  assert(gateDuplicate.isDuplicate === true, 'Quality gate caught exact duplicate question');
  assert(gateDuplicate.adjustedQuestion !== duplicateQ, 'Quality gate automatically repaired duplicate question');

  const novelQ = 'When macroeconomic variables shifted, what variance stress tests did you run?';
  const gateNovel = QuestionValidator.validateQuestion(novelQ, history, financeCandidate);
  assert(gateNovel.approved === true, 'Quality gate approved novel, relevant domain question');

  // 5. Test Low-Confidence STT Handling (FR-012)
  console.log('\n--- 5. Low-Confidence STT Clarification Trigger (FR-012) ---');
  const lowConfTurn = AdaptiveInterviewEngine.generateNextQuestion(
    financeCandidate,
    config15Min,
    history,
    0,
    1,
    'TECHNICAL',
    plan,
    120,
    0.45 // low confidence audio
  );
  assert(lowConfTurn.lowConfidenceTriggered === true, 'Low audio confidence triggered repetition/clarification request');

  // 6. Test Job Description Parsing (FR-005)
  console.log('\n--- 6. Job Description Parser (FR-005) ---');
  const sampleJD = `Senior Financial Analyst
Requirements:
- 5+ years of financial modeling and FP&A
- Advanced proficiency in SAP and Excel
Preferred:
- CPA certification
- Experience in SaaS revenue forecasting
Responsibilities:
- Lead annual budgeting and quarterly variance reporting
- Partner with executive leadership on capital allocation`;
  const parsedJD = JDParser.parseJobDescription(sampleJD, 'Senior Financial Analyst');
  assert(parsedJD.requiredSkills.length >= 2, `Extracted ${parsedJD.requiredSkills.length} required skills`);
  assert(parsedJD.preferredSkills.length >= 1, `Extracted ${parsedJD.preferredSkills.length} preferred skills`);

  // 7. Test Evidence-Based Evaluator & Versioned Rubrics (FR-011, FR-015)
  console.log('\n--- 7. Evidence-Based Evaluator (FR-011, FR-015) ---');
  const completeHistory: ConversationTurn[] = [
    { id: 't1', speaker: 'ai', text: 'Welcome Sarah, walk me through your $12M budget ownership.', timestamp: Date.now(), stage: 'INTRO' },
    { id: 't2', speaker: 'candidate', text: 'I served as the lead FP&A analyst building dynamic financial models in SAP with automated variance analysis.', timestamp: Date.now(), stage: 'INTRO' },
    { id: 't3', speaker: 'ai', text: 'How did you handle cash-flow anomalies?', timestamp: Date.now(), stage: 'PROBLEM_SOLVING' },
    { id: 't4', speaker: 'candidate', text: 'We ran sensitivity analysis modeling 15% revenue contraction scenarios to preserve cash flow.', timestamp: Date.now(), stage: 'PROBLEM_SOLVING' }
  ];
  const report = InterviewEvaluator.generateEvaluation(financeCandidate, config15Min, completeHistory, 'sess-test', 1);
  assert(report.overallScore > 0 && report.overallScore <= 100, `Generated valid overall score (${report.overallScore}/100)`);
  assert(Boolean(report.roleReadiness), `Assigned role readiness level: "${report.roleReadiness}"`);
  assert(Boolean(report.skillAssessments && report.skillAssessments.length >= 3), `Generated ${report.skillAssessments?.length} granular skill assessments`);

  // 8. Test AI Telemetry Ledger (FR-019, NFR-011)
  console.log('\n--- 8. AI Telemetry & Cost Metering (FR-019) ---');
  const usage = TelemetryService.createUsageRecord('question_gen', 'gemini', 'gemini-3.6-flash', 1200, 150, 420, 'sess-test', 'tenant-test');
  assert(usage.estimatedCostUsd >= 0, `Calculated USD cost: $${usage.estimatedCostUsd}`);
  await memoryStore.recordAIUsage(usage);
  const recorded = await memoryStore.getAIUsage('sess-test');
  assert(recorded.length === 1, 'Recorded telemetry event successfully');

  // 9. Test Multi-Tenant Scoping & Audit Logging (NFR-004, NFR-009)
  console.log('\n--- 9. Tenant Isolation & Audit Logs (NFR-004, NFR-009) ---');
  await memoryStore.logAuditEvent({
    tenantId: 'tenant-campus-a',
    action: 'interview_complete',
    entityType: 'report',
    entityId: 'rep-test',
    metadataJson: { score: 92 }
  });
  const logs = await memoryStore.getAuditLogs('tenant-campus-a');
  assert(logs.length >= 1, `Logged and scoped audit log entry successfully for tenant`);

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runSRSSuite();
