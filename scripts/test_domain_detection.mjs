// Standalone verification script in plain JS (ESM) that tests the logic without importing TS files directly
// This verifies our detection logic, regexes, and mappings identically to the engine.

const DOMAIN_KEYWORDS = {
  Finance: [
    'finance', 'financial', 'fpa', 'fp&a', 'accounting', 'accountant', 'budget', 'budgeting',
    'variance analysis', 'cfa', 'cpa', 'gaap', 'ifrs', 'dcf', 'lbo', 'valuation',
    'portfolio', 'equity', 'audit', 'auditor', 'treasury', 'capital', 'revenue forecasting',
    'liquidity', 'cash flow', 'banking', 'hedge fund', 'sox', 'tax', 'balance sheet'
  ],
  HR: [
    'recruitment', 'recruiter', 'talent acquisition', 'sourcing', 'campus hiring',
    'onboarding', 'human resources', 'hrbp', 'hr manager', 'ats', 'workforce planning',
    'employee relations', 'retention', 'performance management', 'compensation', 'benefits',
    'headhunting', 'interviewing', 'staffing'
  ],
  Marketing: [
    'marketing', 'brand', 'growth', 'seo', 'sem', 'campaign', 'conversion rate',
    'content strategy', 'social media', 'google ads', 'copywriting', 'funnel',
    'demand generation', 'customer acquisition', 'cac', 'ltv', 'churn rate',
    'market research', 'product marketing'
  ],
  Sales: [
    'sales', 'business development', 'account executive', 'bdr', 'sdr', 'quota',
    'pipeline', 'crm', 'salesforce', 'closing', 'prospecting', 'lead generation',
    'deal size', 'arr', 'mrr', 'outbound', 'inbound'
  ],
  Healthcare: [
    'clinical', 'nurse', 'nursing', 'patient', 'hospital', 'medical', 'physician',
    'doctor', 'triage', 'icu', 'ehr', 'epic', 'hipaa', 'healthcare', 'pharma',
    'treatment', 'inpatient', 'outpatient', 'care plan', 'bls', 'acls'
  ],
  Legal: [
    'legal', 'attorney', 'counsel', 'lawyer', 'litigation', 'contract', 'compliance',
    'regulatory', 'paralegal', 'due diligence', 'intellectual property', 'patent',
    'arbitration', 'statutory', 'corporate law'
  ],
  Education: [
    'teacher', 'teaching', 'educator', 'curriculum', 'lesson plan', 'pedagogy',
    'student', 'classroom', 'k-12', 'academic', 'instructional design', 'learning outcomes'
  ],
  Tech: [
    'software', 'developer', 'engineer', 'frontend', 'backend', 'fullstack', 'devops',
    'kubernetes', 'docker', 'golang', 'python', 'react', 'node', 'typescript', 'c++',
    'c#', '.net', 'aws', 'microservices', 'cloud', 'database'
  ]
};

function detectDomain(text) {
  const lower = text.toLowerCase();
  let bestDomain = 'General';
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        score += 1;
      }
    }
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

const testResumes = [
  {
    role: 'Senior Financial Analyst',
    domain: 'Finance',
    text: 'Senior Financial Analyst with 6+ years in corporate FP&A, DCF financial modeling, budgeting, variance analysis, GAAP compliance, and quarterly liquidity presentations to CFO.'
  },
  {
    role: 'Recruitment Manager',
    domain: 'HR',
    text: 'Recruitment Manager and Talent Acquisition Professional experienced in sourcing, candidate screening, ATS pipeline, campus hiring drives, onboarding, and stakeholder management.'
  },
  {
    role: 'VP of Growth Marketing',
    domain: 'Marketing',
    text: 'Growth Marketing Lead driving customer acquisition (CAC), brand strategy, multi-channel SEO/SEM campaigns, and funnel conversion rate optimization.'
  },
  {
    role: 'Clinical Nurse Manager',
    domain: 'Healthcare',
    text: 'Clinical Nurse Manager leading 45-bed ICU operations, patient care triage, HIPAA protocol compliance, and hospital-acquired infection reduction.'
  },
  {
    role: 'Senior Distributed Systems Engineer',
    domain: 'Tech',
    text: 'Senior backend software engineer architecting Go and Kubernetes microservices, Redis caching, and PostgreSQL database clustering.'
  }
];

console.log('Testing domain detection logic:');
let allMatch = true;
for (const tr of testResumes) {
  const detected = detectDomain(tr.text);
  const ok = detected === tr.domain;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${tr.role}: detected "${detected}" (expected "${tr.domain}")`);
  if (!ok) allMatch = false;
}

if (!allMatch) {
  process.exit(1);
} else {
  console.log('All domains accurately detected!');
}
