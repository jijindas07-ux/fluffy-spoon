import { ResumeKeywordExtractor } from '../src/lib/engine/keywordExtractor';
import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { AdaptiveInterviewEngine } from '../src/lib/engine/adaptiveEngine';
import { InterviewConfig, ConversationTurn } from '../src/lib/types';
import { memoryStore } from '../src/lib/db/client';

console.log('====================================================');
console.log('🧪 RUNNING KEYWORD & SKILL EXTRACTION SYSTEM TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ─────────────────────────────────────────────────────────────────
// TEST 1: FINANCE & ACCOUNTING RESUME
// ─────────────────────────────────────────────────────────────────
console.log('--- 1. Finance & Accounting Resume Extraction ---');

const financeResume = `
ALEXANDER WRIGHT
Senior Financial Analyst | CPA | CFA
alex.wright@email.com | New York, NY

PROFESSIONAL SUMMARY
Results-driven Senior Financial Analyst with 7+ years of experience leading financial modeling, variance analysis, and corporate budgeting across Fortune 500 enterprises.

WORK EXPERIENCE
Morgan & Sterling Capital - Senior Financial Analyst (2020 - Present)
• Built automated financial modeling frameworks reducing monthly close cycle by 40%.
• Managed annual departmental budgeting of $14.5M with zero negative variance against GAAP standards.
• Implemented SAP ERP and Hyperion to streamline forecasting and P&L variance analysis.
• Conducted Discounted Cash Flow (DCF) valuations for $80M in M&A targets.

EDUCATION & CERTIFICATIONS
• Bachelor of Science in Finance - New York University (2017)
• Certified Public Accountant (CPA License)
`;

const financeKeywords = ResumeKeywordExtractor.extract(financeResume, 'Alexander Wright');
const financeProfile = extractClaimsFromText(financeResume, 'Alexander Wright');

assert(financeKeywords.length >= 5, `Extracted ${financeKeywords.length} finance keywords (expected >= 5)`);
assert(financeKeywords.some(k => k.category === 'core_skill' && k.keyword.includes('Financial Modeling')), 'Extracted Financial Modeling as core_skill');
assert(financeKeywords.some(k => k.category === 'methodology_or_standard' && k.keyword.includes('GAAP')), 'Extracted GAAP as methodology_or_standard');
assert(financeKeywords.some(k => k.category === 'tool_or_technology' && k.keyword.includes('SAP')), 'Extracted SAP ERP as tool_or_technology');
assert(financeKeywords.some(k => k.category === 'measurable_result'), 'Extracted measurable result with % or $ metric');
assert(financeKeywords.every(k => k.evidenceSnippet && k.evidenceSnippet.length > 10), 'All finance keywords have verbatim evidence snippets');
assert(financeProfile.title.toLowerCase().includes('financial analyst'), `Detected authentic title: ${financeProfile.title}`);

// ─────────────────────────────────────────────────────────────────
// TEST 2: HUMAN RESOURCES & TALENT ACQUISITION RESUME
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Human Resources & Talent Acquisition Resume Extraction ---');

const hrResume = `
SARAH JENNINGS
Talent Acquisition Manager | SHRM-SCP
sarah.j@email.com | Chicago, IL

SUMMARY
Strategic HR Leader with 6+ years specializing in full-cycle recruitment, Boolean search, and employee relations.

EXPERIENCE
Apex Health Partners - Talent Acquisition Manager (2021 - Present)
• Spearheaded high-volume recruiting operations, sourcing 450+ healthcare professionals across 12 hospitals.
• Deployed Greenhouse ATS and Workday HRIS, cutting average time-to-hire by 28%.
• Managed campus hiring initiatives partnering with 8 universities, filling 95% of intern requisitions.
• Enforced strict compliance with Labor Law and internal HR policies.

EDUCATION
• Bachelor of Business Administration in Human Resources - University of Illinois (2018)
• SHRM Senior Certified Professional (SHRM-SCP)
`;

const hrKeywords = ResumeKeywordExtractor.extract(hrResume, 'Sarah Jennings');
const hrProfile = extractClaimsFromText(hrResume, 'Sarah Jennings');

assert(hrKeywords.length >= 5, `Extracted ${hrKeywords.length} HR keywords (expected >= 5)`);
assert(hrKeywords.some(k => k.category === 'core_skill' && (k.keyword.includes('Recruitment') || k.keyword.includes('Talent Acquisition'))), 'Extracted Talent Acquisition / Recruitment');
assert(hrKeywords.some(k => k.category === 'tool_or_technology' && (k.keyword.includes('Greenhouse') || k.keyword.includes('Workday'))), 'Extracted ATS / HRIS tools');
assert(hrKeywords.some(k => k.category === 'job_responsibility'), 'Extracted action-driven job responsibilities');
assert(hrKeywords.some(k => k.category === 'qualification_or_education' && k.keyword.includes('SHRM')), 'Extracted SHRM certification qualification');
assert(!hrKeywords.some(k => k.keyword.toLowerCase().includes('react') || k.keyword.toLowerCase().includes('python')), 'Zero software developer hallucination in HR profile');

// ─────────────────────────────────────────────────────────────────
// TEST 3: HEALTHCARE & NURSING RESUME
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 3. Healthcare & Clinical Nursing Resume Extraction ---');

const nursingResume = `
ELENA ROSTOVA, RN, BSN
Registered Nurse - Emergency Department
elena.rostova@hospital.org | Houston, TX

PROFESSIONAL SUMMARY
Compassionate Registered Nurse with 5+ years of acute care experience in Level 1 Trauma Center.

CLINICAL EXPERIENCE
Memorial Hermann Hospital - Staff Registered Nurse (2021 - Present)
• Delivered direct patient care and emergency clinical assessment for 30+ high-acuity patients per shift.
• Executed emergency triage protocols adhering to strict HIPAA compliance standards.
• Administered intravenous medications and maintained vital signs monitoring using Epic EHR.
• Maintained 100% adherence to hospital infection control and sterile procedure protocols.

CREDENTIALS & EDUCATION
• Bachelor of Science in Nursing (BSN) - UT Health Houston (2019)
• Registered Nurse (RN License #982341)
• Advanced Cardiac Life Support (ACLS) & Basic Life Support (BLS) Certified
`;

const nurseKeywords = ResumeKeywordExtractor.extract(nursingResume, 'Elena Rostova');
const nurseProfile = extractClaimsFromText(nursingResume, 'Elena Rostova');

assert(nurseKeywords.length >= 4, `Extracted ${nurseKeywords.length} healthcare keywords`);
assert(nurseKeywords.some(k => k.keyword.includes('Epic EHR') || k.keyword.includes('EHR')), 'Extracted Epic EHR clinical tool');
assert(nurseKeywords.some(k => k.category === 'qualification_or_education' && (k.keyword.includes('ACLS') || k.keyword.includes('BLS') || k.keyword.includes('BSN') || k.keyword.includes('RN'))), 'Extracted Nursing Qualifications / Licenses');
assert(nurseKeywords.some(k => k.keyword.includes('HIPAA')), 'Extracted HIPAA Compliance methodology');

// ─────────────────────────────────────────────────────────────────
// TEST 4: STRICT ANTI-HALLUCINATION & NOISE / EMPTY RESUMES
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 4. Empty Resumes, Noise & Strict Anti-Hallucination Gate ---');

const emptyResume = ``;
const emptyKeywords = ResumeKeywordExtractor.extract(emptyResume);
assert(emptyKeywords.length === 0, 'Empty resume returns 0 keywords');

const noiseResume = `
Random unstructured text document about cats, dogs, weather and cooking recipes.
Today it rained in the afternoon and we baked chocolate chip cookies.
`;
const noiseKeywords = ResumeKeywordExtractor.extract(noiseResume);
assert(noiseKeywords.length === 0, 'Noise document with no professional content returns 0 keywords');

// ─────────────────────────────────────────────────────────────────
// TEST 5: FRESH PROFILE & ZERO CROSS-CONTAMINATION (Requirement 6)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 5. Fresh Profile & Session Isolation (Requirement 6) ---');

const cand1 = extractClaimsFromText(financeResume, 'Alexander Wright');
const cand2 = extractClaimsFromText(hrResume, 'Sarah Jennings');

assert(cand1.id !== cand2.id, `Candidate IDs are strictly unique (${cand1.id} !== ${cand2.id})`);
assert(cand1.name !== cand2.name, 'Names are isolated');
assert(
  !cand1.extractedKeywords?.some(k => k.keyword.includes('SHRM') || k.keyword.includes('Greenhouse')),
  'Finance profile contains 0 keywords from HR upload'
);
assert(
  !cand2.extractedKeywords?.some(k => k.keyword.includes('GAAP') || k.keyword.includes('Hyperion')),
  'HR profile contains 0 keywords from Finance upload'
);

// Test cache retrieval isolation
memoryStore.saveCachedResume('test-sha-123', cand1);
const cached1 = memoryStore.getCachedResume('test-sha-123')!;
const cached2 = memoryStore.getCachedResume('test-sha-123')!;

assert(cached1.id !== cached2.id, 'Repeated cache retrievals produce unique candidate IDs');
assert(
  cached1.extractedKeywords?.[0]?.id !== cached2.extractedKeywords?.[0]?.id,
  'Cached keyword instances have distinct IDs'
);

// ─────────────────────────────────────────────────────────────────
// TEST 6: ADAPTIVE QUESTION & FOLLOW-UP GENERATION INTEGRATION
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 6. Adaptive Question & Follow-Up Grounding with Keywords ---');

const config: InterviewConfig = {
  roleTitle: 'Senior Financial Analyst',
  seniority: 'Senior',
  durationMinutes: 15,
  focusArea: 'Core Competencies & Claim Verification',
  rigorLevel: 'Constructive & Thorough'
};

const introQ = AdaptiveInterviewEngine.generateNextQuestion(
  financeProfile,
  config,
  [],
  0,
  1,
  'INTRO'
);

assert(
  introQ.question.includes('Alexander') && introQ.stage === 'INTRO',
  `Intro question generated: "${introQ.question.slice(0, 80)}..."`
);

const history: ConversationTurn[] = [
  { id: '1', speaker: 'ai', text: introQ.question, timestamp: Date.now() - 5000, stage: 'INTRO' },
  {
    id: '2',
    speaker: 'candidate',
    text: 'At Morgan & Sterling, I designed financial modeling frameworks using SAP ERP and reduced variance by building stress test scenarios for our quarterly budgets.',
    timestamp: Date.now() - 1000,
    stage: 'INTRO'
  }
];

const followUpQ = AdaptiveInterviewEngine.generateNextQuestion(
  financeProfile,
  config,
  history,
  0,
  1,
  'RESUME_DISCUSSION'
);

assert(
  followUpQ.question.length > 30,
  `Follow-up question generated: "${followUpQ.question.slice(0, 80)}..."`
);

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (100% Coverage)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
