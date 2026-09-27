import { extractClaimsFromText } from '../src/lib/engine/claimExtractor.ts';
import { AdaptiveInterviewEngine } from '../src/lib/engine/adaptiveEngine.ts';
import { InterviewEvaluator } from '../src/lib/engine/evaluator.ts';

console.log('================================================================');
console.log('       UNIVERSAL & INDUSTRY-NEUTRAL PIPELINE VERIFICATION       ');
console.log('================================================================\n');

const testCases = [
  {
    name: 'FINANCE RESUME',
    expectedDomain: 'Finance',
    text: `SARAH JENKINS, CFA
Senior Financial Analyst | FP&A Specialist
sarah.jenkins@finance.com | New York, NY

PROFESSIONAL SUMMARY
Results-driven Senior Financial Analyst with 6+ years of corporate FP&A experience. Expert in financial modeling, variance analysis, annual budgeting, and executive reporting.

EXPERIENCE
SENIOR FINANCIAL ANALYST: Apex Capital Holdings [2022 - Present]
• Led annual corporate budgeting process across 5 business units managing $120M operational expenditure.
• Built automated DCF and LBO financial models in Excel and Power BI, cutting forecasting variance by 35%.
• Identified $4.2M in OPEX cost optimizations through rigorous monthly variance analysis.
• Prepared board meeting financial packs and presented liquidity analysis to Chief Financial Officer quarterly.

FINANCIAL ANALYST: Horizon Global [2019 - 2022]
• Conducted revenue forecasting and cash flow analysis for North American business division.
• Automated weekly revenue tracking dashboard using Power BI and SQL, saving 15 hours per week.
• Monitored working capital metrics and days sales outstanding (DSO), improving cash conversion by 12 days.

SKILLS & CERTIFICATIONS
Financial Modeling, DCF, LBO, Budgeting, Variance Analysis, GAAP, IFRS, Power BI, Excel, SAP, Bloomberg Terminal
Chartered Financial Analyst (CFA) Charterholder`
  },
  {
    name: 'HR & TALENT ACQUISITION RESUME',
    expectedDomain: 'HR',
    text: `ATHUL A
Recruitment Manager | Talent Acquisition Professional
Bengaluru | athul.ajob@gmail.com | +91 8497885369

PROFESSIONAL SUMMARY
Recruitment and Talent Acquisition professional with 5+ years of experience across end-to-end recruitment, corporate relations, campus hiring, stakeholder management, and HR operations.

RECRUITMENT MANAGER: Aventurine Homes [May 2024 – Present]
• Manage end-to-end recruitment and talent acquisition activities across multiple business functions.
• Built a database of 800+ candidate profiles through LinkedIn sourcing and improved time-to-hire by 25%.
• Successfully lined up 40+ lateral-hiring interviews within the last 90 days.
• Conducted 2 campus recruitment drives to support organizational hiring requirements.

TALENT ACQUISITION SPECIALIST: Exxevo India [2022 - 2024]
• Managed global recruitment across multiple roles, reviewing 120+ applications in ATS.
• Coordinated 20+ interview loops and completed employee onboarding with zero compliance delay.

SKILLS
Recruiting, Sourcing, Talent Acquisition, ATS, Onboarding, Campus Hiring, Stakeholder Management, HR Analytics`
  },
  {
    name: 'HEALTHCARE RESUME',
    expectedDomain: 'Healthcare',
    text: `DR. CLARA OSEI, RN, MSN
Clinical Nurse Manager | Healthcare Operations
clara.osei@hospital.org | Chicago, IL

PROFESSIONAL SUMMARY
Dedicated Clinical Nurse Manager with 8+ years of inpatient critical care and nursing leadership experience. Proven record in patient safety, clinical triage, protocol compliance, and nursing staff development.

CLINICAL NURSE MANAGER: St. Jude Medical Center [2021 - Present]
• Directed 45-bed intensive care unit operations and supervised 38 registered nurses and clinical staff.
• Reduced hospital-acquired infection (HAI) rate by 42% by instituting evidence-based sanitization protocols.
• Maintained 98% patient satisfaction score across 3,000+ patient admissions annually.
• Ensured 100% compliance with HIPAA, OSHA, and Joint Commission clinical accreditation standards.

STAFF NURSE: City General Hospital [2017 - 2021]
• Provided acute critical care to patients in ICU and trauma emergency room.
• Administered medication and coordinated patient care plans with attending physicians.

CORE COMPETENCIES & CERTIFICATIONS
Patient Care, Clinical Triage, ICU Operations, HIPAA, Joint Commission, EHR, Epic, BLS, ACLS`
  },
  {
    name: 'SOFTWARE ENGINEERING RESUME',
    expectedDomain: 'Software',
    text: `ALEX CHEN
Senior Distributed Systems Engineer
alex.chen@cloudtech.dev | Seattle, WA

PROFESSIONAL SUMMARY
Backend systems engineer with 7+ years designing high-throughput microservices, distributed caching, and cloud infrastructure.

STAFF ENGINEER: Nexus Cloud Infrastructure [2021 - Present]
• Architected event-driven microservices platform in Go and Kubernetes processing 50,000 requests per second.
• Reduced p99 API latency from 450ms to 65ms by implementing Redis cluster caching and connection pooling.
• Decreased cloud infrastructure costs by $18,000 per month through automated AWS auto-scaling and spot instances.

SOFTWARE ENGINEER: ScaleCraft Systems [2018 - 2021]
• Designed REST and gRPC microservices in TypeScript and Node.js serving 2M daily active users.
• Migrated monolithic PostgreSQL database to sharded CockroachDB cluster with zero downtime.

TECHNICAL SKILLS
Go, TypeScript, Kubernetes, Docker, Redis, PostgreSQL, AWS, Kafka, Microservices, CI/CD`
  }
];

let allPassed = true;

for (const tc of testCases) {
  console.log(`\n================== TESTING: ${tc.name} ==================`);
  
  // 1. Profile Extraction
  const profile = extractClaimsFromText(tc.text);
  console.log(`Detected Title: "${profile.title}"`);
  console.log(`Candidate Name: "${profile.name}"`);
  console.log(`Claims Extracted (${profile.claims.length}):`);
  profile.claims.slice(0, 3).forEach((c, idx) => {
    console.log(`  [Claim ${idx + 1}] (${c.category}): "${c.claimText.slice(0, 70)}..."`);
  });
  console.log(`Skills Extracted (${profile.skills.length}):`, profile.skills.slice(0, 8));

  // Check 1: Title must NOT be 'Software Engineer' for non-software resumes
  if (tc.expectedDomain !== 'Software') {
    if (profile.title.toLowerCase().includes('software') || profile.title.toLowerCase().includes('developer')) {
      console.error(`❌ FAIL: Non-tech resume misclassified as software role: "${profile.title}"`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: Correctly identified non-technical title: "${profile.title}"`);
    }
  } else {
    if (profile.title.toLowerCase().includes('engineer') || profile.title.toLowerCase().includes('systems')) {
      console.log(`✅ PASS: Correctly identified technical title: "${profile.title}"`);
    }
  }

  // Check 2: Claims categories must not default to 'Architecture' for non-software
  if (tc.expectedDomain !== 'Software') {
    const archClaims = profile.claims.filter(c => c.category === 'Architecture');
    if (archClaims.length > 0) {
      console.error(`❌ FAIL: Found 'Architecture' category in ${tc.name} claims`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: No software-only 'Architecture' claims in ${tc.name}`);
    }
  }

  // 2. Interview Engine Adaptive Question Generation
  const config = {
    roleTitle: profile.title,
    seniority: 'Senior',
    durationMinutes: 15,
    focusArea: 'Core Competencies & Claim Verification',
    rigorLevel: 'Rigorous & Challenging'
  };

  const q1 = AdaptiveInterviewEngine.generateNextQuestion(profile, config, [], 0, 1);
  console.log(`\nAI Question Turn 1 (Inception):`);
  console.log(`"${q1.question}"`);

  // Verify domain tone in question
  if (tc.expectedDomain === 'Finance') {
    if (q1.question.toLowerCase().includes('code') || q1.question.toLowerCase().includes('tech stack')) {
      console.error(`❌ FAIL: Tech wording in Finance question`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: Domain-appropriate financial questioning`);
    }
  } else if (tc.expectedDomain === 'HR') {
    if (q1.question.toLowerCase().includes('code') || q1.question.toLowerCase().includes('tech stack')) {
      console.error(`❌ FAIL: Tech wording in HR question`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: Domain-appropriate HR questioning`);
    }
  } else if (tc.expectedDomain === 'Healthcare') {
    if (q1.question.toLowerCase().includes('code') || q1.question.toLowerCase().includes('tech stack')) {
      console.error(`❌ FAIL: Tech wording in Healthcare question`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: Domain-appropriate Healthcare questioning`);
    }
  }

  // Simulate a turn
  const history = [
    { id: '1', speaker: 'interviewer', text: q1.question, timestamp: new Date().toISOString() },
    { id: '2', speaker: 'candidate', text: 'I conducted a comprehensive assessment of the core requirements, aligned with senior management and team members, and executed the strategy with tight milestone tracking.', timestamp: new Date().toISOString() }
  ];

  const q2 = AdaptiveInterviewEngine.generateNextQuestion(profile, config, history, 0, 2);
  console.log(`\nAI Question Turn 2 (Level 2 Probe):`);
  console.log(`"${q2.question}"`);

  // 3. Evaluation Check
  const report = InterviewEvaluator.generateReport(profile, config, history, 1);
  console.log(`\nEvaluation Generated:`);
  console.log(`Overall Score: ${report.overallScore}/100 | Recommendation: ${report.recommendation}`);
  console.log(`Dimension Label: "${report.dimensions.technicalCompetency.label}"`);
  console.log(`Executive Summary: "${report.executiveSummary.slice(0, 120)}..."`);

  if (report.dimensions.technicalCompetency.label !== 'Role & Domain Competency') {
    console.error(`❌ FAIL: Expected dimension label 'Role & Domain Competency' but got '${report.dimensions.technicalCompetency.label}'`);
    allPassed = false;
  } else {
    console.log(`✅ PASS: Dimension label is universally neutral: 'Role & Domain Competency'`);
  }
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 ALL UNIVERSAL PIPELINE TESTS PASSED WITH 100% SUCCESS!');
} else {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
}
console.log('================================================================');
