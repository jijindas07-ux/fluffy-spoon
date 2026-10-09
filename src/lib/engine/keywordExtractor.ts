import { ExtractedKeyword, KeywordCategory } from '../types';
import { cleanPdfText, isReadableEnglishText } from './pdfParser';
import { sanitizeClaimToEnglish } from './claimExtractor';

/**
 * Domain-Independent Keyword & Skill Ontology
 * Covers all major professions: Finance, HR, Marketing, Sales, Healthcare, Legal, Education, Operations, Management, IT
 */
interface DomainRule {
  term: string;
  category: KeywordCategory;
  aliases?: string[];
  canonical: string;
}

const DOMAIN_ONTOLOGY: DomainRule[] = [
  // ─── FINANCE, ACCOUNTING & BANKING ────────────────────────────
  { term: 'financial modeling', category: 'core_skill', canonical: 'Financial Modeling' },
  { term: 'financial analysis', category: 'core_skill', canonical: 'Financial Analysis' },
  { term: 'budgeting', category: 'core_skill', canonical: 'Budgeting & Forecasting' },
  { term: 'forecasting', category: 'core_skill', canonical: 'Budgeting & Forecasting' },
  { term: 'variance analysis', category: 'methodology_or_standard', canonical: 'Variance Analysis' },
  { term: 'gaap', category: 'methodology_or_standard', canonical: 'GAAP Compliance' },
  { term: 'ifrs', category: 'methodology_or_standard', canonical: 'IFRS Standards' },
  { term: 'sox', category: 'methodology_or_standard', canonical: 'SOX Compliance' },
  { term: 'internal controls', category: 'methodology_or_standard', canonical: 'Internal Controls & Audit' },
  { term: 'risk management', category: 'domain_expertise', canonical: 'Risk Management' },
  { term: 'tax accounting', category: 'core_skill', canonical: 'Tax Accounting & Filing' },
  { term: 'auditing', category: 'core_skill', canonical: 'Financial Auditing' },
  { term: 'cash flow', category: 'core_skill', canonical: 'Cash Flow Management' },
  { term: 'p&l', category: 'core_skill', canonical: 'P&L Management' },
  { term: 'cost accounting', category: 'core_skill', canonical: 'Cost Accounting' },
  { term: 'dcf', category: 'methodology_or_standard', canonical: 'Discounted Cash Flow (DCF)' },
  { term: 'fp&a', category: 'domain_expertise', canonical: 'FP&A' },
  { term: 'portfolio management', category: 'domain_expertise', canonical: 'Portfolio Management' },
  { term: 'sap', category: 'tool_or_technology', canonical: 'SAP ERP' },
  { term: 'oracle financials', category: 'tool_or_technology', canonical: 'Oracle Financials' },
  { term: 'netsuite', category: 'tool_or_technology', canonical: 'NetSuite' },
  { term: 'quickbooks', category: 'tool_or_technology', canonical: 'QuickBooks' },
  { term: 'xero', category: 'tool_or_technology', canonical: 'Xero' },
  { term: 'hyperion', category: 'tool_or_technology', canonical: 'Hyperion' },
  { term: 'bloomberg', category: 'tool_or_technology', canonical: 'Bloomberg Terminal' },
  { term: 'cpa', category: 'qualification_or_education', canonical: 'CPA License' },
  { term: 'cfa', category: 'qualification_or_education', canonical: 'CFA Charter' },

  // ─── HUMAN RESOURCES & TALENT ACQUISITION ───────────────────────
  { term: 'talent acquisition', category: 'core_skill', canonical: 'Talent Acquisition' },
  { term: 'recruitment', category: 'core_skill', canonical: 'Full-Cycle Recruitment' },
  { term: 'sourcing', category: 'core_skill', canonical: 'Candidate Sourcing & Headhunting' },
  { term: 'employee relations', category: 'core_skill', canonical: 'Employee Relations' },
  { term: 'onboarding', category: 'job_responsibility', canonical: 'Employee Onboarding & Retention' },
  { term: 'performance management', category: 'methodology_or_standard', canonical: 'Performance Management' },
  { term: 'compensation', category: 'domain_expertise', canonical: 'Compensation & Benefits' },
  { term: 'campus hiring', category: 'job_responsibility', canonical: 'Campus & University Relations' },
  { term: 'lateral hiring', category: 'job_responsibility', canonical: 'Lateral Talent Acquisition' },
  { term: 'boolean search', category: 'core_skill', canonical: 'Boolean Search & Sourcing' },
  { term: 'hr policies', category: 'methodology_or_standard', canonical: 'HR Policy & Compliance' },
  { term: 'labor law', category: 'methodology_or_standard', canonical: 'Labor Law & Employment Standards' },
  { term: 'workday', category: 'tool_or_technology', canonical: 'Workday HRIS' },
  { term: 'bamboohr', category: 'tool_or_technology', canonical: 'BambooHR' },
  { term: 'greenhouse', category: 'tool_or_technology', canonical: 'Greenhouse ATS' },
  { term: 'lever', category: 'tool_or_technology', canonical: 'Lever ATS' },
  { term: 'workable', category: 'tool_or_technology', canonical: 'Workable ATS' },
  { term: 'adp', category: 'tool_or_technology', canonical: 'ADP' },
  { term: 'hris', category: 'tool_or_technology', canonical: 'HRIS Systems' },
  { term: 'ats', category: 'tool_or_technology', canonical: 'Applicant Tracking Systems (ATS)' },
  { term: 'linkedin recruiter', category: 'tool_or_technology', canonical: 'LinkedIn Recruiter' },
  { term: 'shrm', category: 'qualification_or_education', canonical: 'SHRM Certification' },
  { term: 'phr', category: 'qualification_or_education', canonical: 'PHR / SPHR Certification' },

  // ─── MARKETING, BRAND & GROWTH ─────────────────────────────────
  { term: 'digital marketing', category: 'domain_expertise', canonical: 'Digital Marketing' },
  { term: 'brand strategy', category: 'domain_expertise', canonical: 'Brand Strategy' },
  { term: 'content strategy', category: 'core_skill', canonical: 'Content Strategy & Copywriting' },
  { term: 'seo', category: 'core_skill', canonical: 'Search Engine Optimization (SEO)' },
  { term: 'sem', category: 'core_skill', canonical: 'Search Engine Marketing (SEM)' },
  { term: 'email marketing', category: 'job_responsibility', canonical: 'Email Marketing & Lifecycle' },
  { term: 'market research', category: 'core_skill', canonical: 'Market Research & Competitive Analysis' },
  { term: 'social media', category: 'core_skill', canonical: 'Social Media Management' },
  { term: 'conversion rate optimization', category: 'methodology_or_standard', canonical: 'CRO' },
  { term: 'cro', category: 'methodology_or_standard', canonical: 'Conversion Rate Optimization' },
  { term: 'cac', category: 'measurable_result', canonical: 'Customer Acquisition Cost (CAC)' },
  { term: 'ltv', category: 'measurable_result', canonical: 'Customer Lifetime Value (LTV)' },
  { term: 'google analytics', category: 'tool_or_technology', canonical: 'Google Analytics' },
  { term: 'hubspot', category: 'tool_or_technology', canonical: 'HubSpot Marketing Automation' },
  { term: 'mailchimp', category: 'tool_or_technology', canonical: 'Mailchimp' },
  { term: 'semrush', category: 'tool_or_technology', canonical: 'SEMrush' },
  { term: 'ahrefs', category: 'tool_or_technology', canonical: 'Ahrefs' },
  { term: 'meta ads', category: 'tool_or_technology', canonical: 'Meta Ads Manager' },
  { term: 'google ads', category: 'tool_or_technology', canonical: 'Google Ads' },

  // ─── SALES, BUSINESS DEVELOPMENT & ACCOUNT MANAGEMENT ──────────
  { term: 'b2b sales', category: 'domain_expertise', canonical: 'B2B Enterprise Sales' },
  { term: 'account management', category: 'job_responsibility', canonical: 'Key Account Management' },
  { term: 'lead generation', category: 'job_responsibility', canonical: 'Lead Generation & Prospecting' },
  { term: 'pipeline management', category: 'core_skill', canonical: 'Sales Pipeline Management' },
  { term: 'contract negotiation', category: 'core_skill', canonical: 'Contract & Deal Negotiation' },
  { term: 'client relations', category: 'core_skill', canonical: 'Client Relationship Management' },
  { term: 'salesforce', category: 'tool_or_technology', canonical: 'Salesforce CRM' },
  { term: 'crm', category: 'tool_or_technology', canonical: 'CRM Management' },
  { term: 'meddic', category: 'methodology_or_standard', canonical: 'MEDDIC Qualification' },
  { term: 'bant', category: 'methodology_or_standard', canonical: 'BANT Sales Qualification' },

  // ─── HEALTHCARE, NURSING & CLINICAL ────────────────────────────
  { term: 'patient care', category: 'job_responsibility', canonical: 'Patient Care & Assessment' },
  { term: 'clinical assessment', category: 'core_skill', canonical: 'Clinical Assessment & Triage' },
  { term: 'triage', category: 'core_skill', canonical: 'Emergency Triage Protocols' },
  { term: 'medication administration', category: 'job_responsibility', canonical: 'Medication Administration' },
  { term: 'hipaa', category: 'methodology_or_standard', canonical: 'HIPAA Compliance' },
  { term: 'bls', category: 'qualification_or_education', canonical: 'Basic Life Support (BLS)' },
  { term: 'acls', category: 'qualification_or_education', canonical: 'Advanced Cardiac Life Support (ACLS)' },
  { term: 'infection control', category: 'methodology_or_standard', canonical: 'Infection Control & Prevention' },
  { term: 'epic', category: 'tool_or_technology', canonical: 'Epic EHR' },
  { term: 'cerner', category: 'tool_or_technology', canonical: 'Cerner EMR' },
  { term: 'ehr', category: 'tool_or_technology', canonical: 'Electronic Health Records (EHR)' },
  { term: 'emr', category: 'tool_or_technology', canonical: 'Electronic Medical Records (EMR)' },
  { term: 'vital signs', category: 'core_skill', canonical: 'Vital Signs Monitoring' },
  { term: 'acute care', category: 'domain_expertise', canonical: 'Acute Care Management' },
  { term: 'rn', category: 'qualification_or_education', canonical: 'Registered Nurse (RN) License' },
  { term: 'bsn', category: 'qualification_or_education', canonical: 'Bachelor of Science in Nursing (BSN)' },

  // ─── OPERATIONS, SUPPLY CHAIN & PROCUREMENT ────────────────────
  { term: 'supply chain', category: 'domain_expertise', canonical: 'Supply Chain Management' },
  { term: 'logistics', category: 'domain_expertise', canonical: 'Logistics & Distribution' },
  { term: 'procurement', category: 'core_skill', canonical: 'Procurement & Vendor Sourcing' },
  { term: 'vendor management', category: 'job_responsibility', canonical: 'Vendor & Supplier Management' },
  { term: 'inventory management', category: 'job_responsibility', canonical: 'Inventory Control & Optimization' },
  { term: 'lean six sigma', category: 'methodology_or_standard', canonical: 'Lean Six Sigma' },
  { term: 'six sigma', category: 'methodology_or_standard', canonical: 'Six Sigma' },
  { term: 'kaizen', category: 'methodology_or_standard', canonical: 'Kaizen Process Optimization' },
  { term: 'sla', category: 'methodology_or_standard', canonical: 'SLA Performance Management' },
  { term: 'erp', category: 'tool_or_technology', canonical: 'Enterprise Resource Planning (ERP)' },

  // ─── LEGAL & COMPLIANCE ────────────────────────────────────────
  { term: 'contract drafting', category: 'core_skill', canonical: 'Contract Drafting & Review' },
  { term: 'legal research', category: 'core_skill', canonical: 'Legal Research & Statutory Analysis' },
  { term: 'due diligence', category: 'methodology_or_standard', canonical: 'Corporate Due Diligence' },
  { term: 'regulatory compliance', category: 'domain_expertise', canonical: 'Regulatory Compliance' },
  { term: 'corporate governance', category: 'domain_expertise', canonical: 'Corporate Governance' },
  { term: 'litigation', category: 'domain_expertise', canonical: 'Litigation & Dispute Resolution' },
  { term: 'westlaw', category: 'tool_or_technology', canonical: 'Westlaw' },
  { term: 'lexisnexis', category: 'tool_or_technology', canonical: 'LexisNexis' },
  { term: 'juris doctor', category: 'qualification_or_education', canonical: 'Juris Doctor (JD)' },
  { term: 'bar admission', category: 'qualification_or_education', canonical: 'State Bar Admission' },

  // ─── EDUCATION & TEACHING ───────────────────────────────────────
  { term: 'curriculum development', category: 'core_skill', canonical: 'Curriculum Development' },
  { term: 'lesson planning', category: 'job_responsibility', canonical: 'Lesson Planning & Delivery' },
  { term: 'classroom management', category: 'job_responsibility', canonical: 'Classroom Management' },
  { term: 'student assessment', category: 'methodology_or_standard', canonical: 'Student Assessment & Grading' },
  { term: 'differentiated instruction', category: 'methodology_or_standard', canonical: 'Differentiated Instruction' },
  { term: 'pedagogy', category: 'domain_expertise', canonical: 'Pedagogical Frameworks' },
  { term: 'canvas', category: 'tool_or_technology', canonical: 'Canvas LMS' },
  { term: 'blackboard', category: 'tool_or_technology', canonical: 'Blackboard LMS' },

  // ─── MANAGEMENT, STRATEGY & GENERAL LEADERSHIP ──────────────────
  { term: 'strategic planning', category: 'core_skill', canonical: 'Strategic Planning' },
  { term: 'cross-functional leadership', category: 'job_responsibility', canonical: 'Cross-Functional Leadership' },
  { term: 'stakeholder management', category: 'job_responsibility', canonical: 'Stakeholder Management' },
  { term: 'change management', category: 'methodology_or_standard', canonical: 'Change Management' },
  { term: 'agile', category: 'methodology_or_standard', canonical: 'Agile Methodology' },
  { term: 'scrum', category: 'methodology_or_standard', canonical: 'Scrum Framework' },
  { term: 'pmp', category: 'qualification_or_education', canonical: 'PMP Certification' },
  { term: 'prince2', category: 'qualification_or_education', canonical: 'PRINCE2 Certification' },
  { term: 'jira', category: 'tool_or_technology', canonical: 'Jira Project Tracking' },
  { term: 'confluence', category: 'tool_or_technology', canonical: 'Confluence' },
  { term: 'excel', category: 'tool_or_technology', canonical: 'Microsoft Excel (Advanced)' },
  { term: 'power bi', category: 'tool_or_technology', canonical: 'Power BI' },
  { term: 'tableau', category: 'tool_or_technology', canonical: 'Tableau' },

  // ─── IT & SOFTWARE ENGINEERING (EQUAL CITIZEN) ──────────────────
  { term: 'typescript', category: 'tool_or_technology', canonical: 'TypeScript' },
  { term: 'javascript', category: 'tool_or_technology', canonical: 'JavaScript' },
  { term: 'python', category: 'tool_or_technology', canonical: 'Python' },
  { term: 'java', category: 'tool_or_technology', canonical: 'Java' },
  { term: 'c++', category: 'tool_or_technology', canonical: 'C++' },
  { term: 'c#', category: 'tool_or_technology', canonical: 'C#' },
  { term: 'golang', category: 'tool_or_technology', canonical: 'Go' },
  { term: 'go', category: 'tool_or_technology', canonical: 'Go' },
  { term: 'rust', category: 'tool_or_technology', canonical: 'Rust' },
  { term: 'php', category: 'tool_or_technology', canonical: 'PHP' },
  { term: 'ruby', category: 'tool_or_technology', canonical: 'Ruby' },
  { term: 'sql', category: 'tool_or_technology', canonical: 'SQL' },
  { term: 'react', category: 'tool_or_technology', canonical: 'React' },
  { term: 'node.js', category: 'tool_or_technology', canonical: 'Node.js' },
  { term: 'nodejs', category: 'tool_or_technology', canonical: 'Node.js' },
  { term: 'next.js', category: 'tool_or_technology', canonical: 'Next.js' },
  { term: 'nextjs', category: 'tool_or_technology', canonical: 'Next.js' },
  { term: 'angular', category: 'tool_or_technology', canonical: 'Angular' },
  { term: 'vue', category: 'tool_or_technology', canonical: 'Vue.js' },
  { term: 'fastapi', category: 'tool_or_technology', canonical: 'FastAPI' },
  { term: 'spring boot', category: 'tool_or_technology', canonical: 'Spring Boot' },
  { term: 'postgres', category: 'tool_or_technology', canonical: 'PostgreSQL' },
  { term: 'postgresql', category: 'tool_or_technology', canonical: 'PostgreSQL' },
  { term: 'redis', category: 'tool_or_technology', canonical: 'Redis' },
  { term: 'mongodb', category: 'tool_or_technology', canonical: 'MongoDB' },
  { term: 'mysql', category: 'tool_or_technology', canonical: 'MySQL' },
  { term: 'docker', category: 'tool_or_technology', canonical: 'Docker' },
  { term: 'kubernetes', category: 'tool_or_technology', canonical: 'Kubernetes' },
  { term: 'aws', category: 'tool_or_technology', canonical: 'AWS Cloud' },
  { term: 'gcp', category: 'tool_or_technology', canonical: 'Google Cloud Platform (GCP)' },
  { term: 'azure', category: 'tool_or_technology', canonical: 'Microsoft Azure' },
  { term: 'git', category: 'tool_or_technology', canonical: 'Git Version Control' },
  { term: 'ci/cd', category: 'methodology_or_standard', canonical: 'CI/CD Pipelines' },
  { term: 'microservices', category: 'methodology_or_standard', canonical: 'Microservices Architecture' },
  { term: 'system architecture', category: 'core_skill', canonical: 'System Architecture' }
];

export class ResumeKeywordExtractor {
  /**
   * Main entry point: Extracts categorized keywords, skills, job responsibilities,
   * qualifications, achievements, and measurable results with verifiable evidence snippets.
   */
  public static extract(rawText: string, candidateName: string = ''): ExtractedKeyword[] {
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    const cleaned = cleanPdfText(rawText);
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => isReadableEnglishText(l));
    const extractedMap = new Map<string, ExtractedKeyword>();
    let kwIdCounter = 1;

    // Helper: Identify section headers
    let currentSection = 'General Profile';
    const sectionLines: { section: string; line: string }[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase().replace(/[:\-_]/g, '').trim();
      if (/^(?:experience|work experience|employment history|professional experience|career history)$/i.test(lower)) {
        currentSection = 'Work Experience';
        continue;
      } else if (/^(?:education|academic background|qualifications|academic history)$/i.test(lower)) {
        currentSection = 'Education';
        continue;
      } else if (/^(?:skills|core competencies|key skills|technical skills|areas of expertise|competencies)$/i.test(lower)) {
        currentSection = 'Core Skills';
        continue;
      } else if (/^(?:certifications|licenses|credentials|accreditations)$/i.test(lower)) {
        currentSection = 'Certifications';
        continue;
      } else if (/^(?:projects|key initiatives|major engagements)$/i.test(lower)) {
        currentSection = 'Projects';
        continue;
      } else if (/^(?:summary|executive summary|profile|about me|professional summary)$/i.test(lower)) {
        currentSection = 'Summary';
        continue;
      }

      sectionLines.push({ section: currentSection, line });
    }

    // 1. EXTRACT FROM DOMAIN ONTOLOGY WITH VERBATIM EVIDENCE GROUNDING
    for (const { section, line } of sectionLines) {
      const lLower = line.toLowerCase();
      for (const rule of DOMAIN_ONTOLOGY) {
        const escaped = rule.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, 'i');

        if (regex.test(lLower)) {
          const mapKey = `${rule.category}:${rule.canonical.toLowerCase()}`;
          if (!extractedMap.has(mapKey)) {
            const cleanSnippet = sanitizeClaimToEnglish(line);
            if (cleanSnippet && cleanSnippet.length >= 15) {
              extractedMap.set(mapKey, {
                id: `kw-${kwIdCounter++}`,
                keyword: rule.canonical,
                category: rule.category,
                evidenceSnippet: cleanSnippet,
                confidence: 0.95,
                sourceSection: section
              });
            }
          }
        }
      }
    }

    // 2. EXTRACT DYNAMIC SKILLS FROM SKILL SECTIONS (Comma, bullet, pipe delimited)
    for (const { section, line } of sectionLines) {
      if (section === 'Core Skills') {
        const items = line
          .replace(/^[•\-\*\+:\d\.]+\s*/, '')
          .split(/[,|•;]|\s{3,}/)
          .map(item => item.trim())
          .filter(item => item.length >= 3 && item.length <= 40 && !item.includes('@') && !item.includes('http') && !/^(?:skills|experience|education)$/i.test(item));

        for (const item of items) {
          const canonical = sanitizeClaimToEnglish(item).replace(/\.$/, '');
          if (canonical.length >= 3 && canonical.length <= 40) {
            const mapKey = `core_skill:${canonical.toLowerCase()}`;
            if (!extractedMap.has(mapKey)) {
              extractedMap.set(mapKey, {
                id: `kw-${kwIdCounter++}`,
                keyword: canonical,
                category: 'core_skill',
                evidenceSnippet: sanitizeClaimToEnglish(line) || `Documented skill: ${canonical}`,
                confidence: 0.90,
                sourceSection: section
              });
            }
          }
        }
      }
    }

    // 3. EXTRACT MEASURABLE RESULTS (Percentages, Revenue, Counts, Scale)
    const metricsPattern = /(\b\d[\d,.]*\s*(?:%|percent|reduction|increase|growth|k|m|million|billion|users|clients|candidates|positions|requisitions|loops|dollars|\$|revenue|cost reduction|turnaround|sla)\b)/i;
    for (const { section, line } of sectionLines) {
      if (metricsPattern.test(line)) {
        const cleanSnippet = sanitizeClaimToEnglish(line);
        if (cleanSnippet && cleanSnippet.length >= 25 && cleanSnippet.length <= 150) {
          const match = cleanSnippet.match(metricsPattern);
          const metricSnippet = match ? match[0] : 'Quantified Outcome';
          const mapKey = `measurable_result:${cleanSnippet.slice(0, 40).toLowerCase()}`;
          if (!extractedMap.has(mapKey)) {
            extractedMap.set(mapKey, {
              id: `kw-${kwIdCounter++}`,
              keyword: `Metric (${metricSnippet}): ${cleanSnippet.split(/[,;]/)[0]}`,
              category: 'measurable_result',
              evidenceSnippet: cleanSnippet,
              confidence: 0.92,
              sourceSection: section
            });
          }
        }
      }
    }

    // 4. EXTRACT JOB RESPONSIBILITIES (Action verbs in Work Experience)
    const actionVerbRegex = /^(?:built|managed|directed|spearheaded|led|delivered|handled|improved|analyzed|coordinated|maintained|authored|resolved|established|automated|launched|sourced|screened|conducted|reviewed|partnered|recruited|initiated|tracked|deployed|migrated|configured|facilitated|designed|implemented|optimized|supervised|administered|negotiated|audited|monitored)\b/i;

    for (const { section, line } of sectionLines) {
      const cleanLine = sanitizeClaimToEnglish(line);
      if (
        cleanLine.length >= 25 &&
        cleanLine.length <= 140 &&
        actionVerbRegex.test(cleanLine)
      ) {
        const actionVerb = cleanLine.split(/\s+/)[0];
        const mapKey = `job_responsibility:${cleanLine.slice(0, 35).toLowerCase()}`;
        if (!extractedMap.has(mapKey)) {
          extractedMap.set(mapKey, {
            id: `kw-${kwIdCounter++}`,
            keyword: `${actionVerb} Initiative: ${cleanLine.split(/[,;]/)[0]}`,
            category: 'job_responsibility',
            evidenceSnippet: cleanLine,
            confidence: 0.88,
            sourceSection: section
          });
        }
      }
    }

    // 5. EXTRACT QUALIFICATIONS & EDUCATION
    const eduDegreeRegex = /\b(?:bachelor|master|phd|b\.s|m\.s|b\.e|b\.tech|m\.tech|mba|bba|bca|mca|b\.com|m\.com|b\.sc|m\.sc|bsn|msn|rn|jd|llb|llm|diploma|certified|certification|licensed|chartered)\b/i;
    for (const { section, line } of sectionLines) {
      if (eduDegreeRegex.test(line)) {
        const cleanSnippet = sanitizeClaimToEnglish(line).replace(/\.$/, '');
        if (cleanSnippet.length >= 8 && cleanSnippet.length <= 100) {
          const mapKey = `qualification_or_education:${cleanSnippet.slice(0, 35).toLowerCase()}`;
          if (!extractedMap.has(mapKey)) {
            extractedMap.set(mapKey, {
              id: `kw-${kwIdCounter++}`,
              keyword: cleanSnippet.split(/[-–|,]/)[0].trim(),
              category: 'qualification_or_education',
              evidenceSnippet: cleanSnippet,
              confidence: 0.94,
              sourceSection: section
            });
          }
        }
      }
    }

    // 6. EXTRACT KEY ACHIEVEMENTS (Awards, Recognition, High-Impact Deliverables)
    const achievementRegex = /\b(?:awarded|promoted|recognized|top performer|president's club|exceeded|outperformed|best|first place|honored|published|patented)\b/i;
    for (const { section, line } of sectionLines) {
      if (achievementRegex.test(line)) {
        const cleanSnippet = sanitizeClaimToEnglish(line);
        if (cleanSnippet && cleanSnippet.length >= 20 && cleanSnippet.length <= 140) {
          const mapKey = `key_achievement:${cleanSnippet.slice(0, 35).toLowerCase()}`;
          if (!extractedMap.has(mapKey)) {
            extractedMap.set(mapKey, {
              id: `kw-${kwIdCounter++}`,
              keyword: cleanSnippet.split(/[,;]/)[0].trim(),
              category: 'key_achievement',
              evidenceSnippet: cleanSnippet,
              confidence: 0.90,
              sourceSection: section
            });
          }
        }
      }
    }

    // Convert map to array and strictly verify grounding
    const allExtracted = Array.from(extractedMap.values());

    // Strict Grounding & Anti-Hallucination Gate: Verify that evidenceSnippet or keyword actually exists in rawText
    const verifiedExtracted = allExtracted.filter(item => {
      const lowerRaw = cleaned.toLowerCase();
      const snippetKeyWords = item.evidenceSnippet.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (snippetKeyWords.length === 0) return true;
      // At least 2 key words of the evidence snippet must be in the document
      const matchCount = snippetKeyWords.filter(w => lowerRaw.includes(w)).length;
      return matchCount >= Math.min(2, snippetKeyWords.length);
    });

    return verifiedExtracted;
  }
}
