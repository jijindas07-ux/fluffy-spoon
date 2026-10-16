import type { CandidateProfile, ResumeClaim } from '../types';
import { cleanPdfText, isReadableEnglishText, stripPdfSyntax } from './pdfParser';
import { ResumeKeywordExtractor } from './keywordExtractor';
import { ExperienceCalculator } from './experienceCalculator';

/**
 * Sanitize individual claim text to make sure it's presented in 100% clean, proper English.
 * Preserves legitimate technical terms (.NET, C++, C#), metrics (3.5x, +5), and abbreviations (B.Tech, U.S., Inc.).
 */
export function sanitizeClaimToEnglish(text: string): string {
  if (!text) return '';

  let cleaned = cleanPdfText(text)
    // Remove leading bullet marks (•, *, >, ~, etc.)
    .replace(/^[•\*\>~▪▸►\t]+\s*/, '')
    // Remove leading list numbering ONLY if followed by space (e.g. "1. ", "1) ", "(a) ", "A. ")
    .replace(/^(?:\(?\d{1,2}[.)]\s+|\(?[a-zA-Z][.)]\s+)/, '')
    // Replace multiple spaces
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Remove leading dash only if followed by space (preserve words like "-NET" or compound words)
  cleaned = cleaned.replace(/^[-–—]\s+/, '').trim();

  // Remove trailing orphan punctuation (preserve balanced closing parens)
  cleaned = cleaned.replace(/[:;,|#\\\/]+$/, '').trim();
  const openParens = (cleaned.match(/\(/g) || []).length;
  const closeParens = (cleaned.match(/\)/g) || []).length;
  if (closeParens > openParens && cleaned.endsWith(')')) {
    cleaned = cleaned.replace(/\)+$/, '').trim();
  }

  if (!cleaned || cleaned.length < 5) return '';

  // Capitalize first character if it's a letter (do not destroy tokens like .NET)
  if (/^[a-zA-Z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Ensure ending period if it's a complete sentence and doesn't already end in period/punctuation
  if (!/[.!?]$/.test(cleaned) && cleaned.length >= 20) {
    cleaned += '.';
  }

  return cleaned;
}

/**
 * Safely split a text block or line into individual sentences without breaking on
 * abbreviations (B.Tech, Ph.D., Inc., e.g., U.S.), decimals (3.5x), or initials (J. Smith).
 */
export function splitSentenceSafe(text: string): string[] {
  if (!text) return [];

  // Protect periods in acronyms, abbreviations, tech stacks, and decimals:
  // 1. Internal dots like B.Tech, M.Tech, Ph.D., U.S., U.S.A., Node.js
  // 2. Known abbreviations like Inc., Corp., Ltd., e.g., i.e., etc., vs., Dr., Mr., etc.
  // 3. Initials like "J. Smith"
  // 4. Decimals like 3.5x, 99.9%
  const protectedText = text
    .replace(/\b[A-Za-z]{1,4}\.[A-Za-z]{1,4}(?:\.[A-Za-z]{1,4})*\.?/g, m => m.replace(/\./g, '§DOT§'))
    .replace(/\b(?:Inc|Corp|Ltd|Co|e\.g|i\.e|etc|vs|Dr|Mr|Ms|Mrs|Prof|Sr|Jr|approx|dept|univ|assoc|est|al)\./gi, m => m.replace(/\./g, '§DOT§'))
    .replace(/\b([A-Z])\.\s+(?=[A-Za-z])/g, '$1§DOT§ ')
    .replace(/(\d+)\.(\d+)/g, '$1§DOT§$2');

  const parts = protectedText
    .split(/(?<=[.!?•])\s+(?=[A-Z0-9"']|$)|(?<=\n)\s*|\s*[•\t]+\s*/g)
    .map(s => s.replace(/§DOT§/g, '.').trim())
    .filter(s => s.length > 20);

  return parts;
}


/**
 * Intelligent Claim Extractor & Resume Structurer
 * Extracts ONLY realistic details directly present on the candidate's resume in clean English.
 */
export function extractClaimsFromText(rawText: string, candidateName: string = ''): CandidateProfile {
  const cleanedText = cleanPdfText(rawText || '');
  const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => isReadableEnglishText(l));

  // 1. Detect Real Candidate Name from Resume Text (Document content is source of truth)
  let detectedName = '';

  // Check top lines of extracted document text for candidate name
  for (const line of lines.slice(0, 6)) {
    const cleanLine = line.replace(/^[^\w\s]+/, '').replace(/[^\w\s'-]/g, '').trim();
    const words = cleanLine.split(/\s+/);
    if (
      words.length >= 2 && 
      words.length <= 4 && 
      cleanLine.length >= 4 &&
      cleanLine.length < 35 && 
      !/resume|curriculum|cv|email|phone|experience|summary|skills|education|profile|objective|contact|page\s*\d|portfolio|github|linkedin|developer|engineer|manager/i.test(cleanLine)
    ) {
      detectedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      break;
    }
  }

  // Check if there's an email like firstname.lastname@domain.com if name not found in header lines
  if (!detectedName) {
    const emailMatch = rawText.match(/([a-zA-Z0-9_.+-]+)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
    if (emailMatch) {
      const emailUser = emailMatch[1].replace(/[._-]/g, ' ');
      const nameParts = emailUser.split(' ').filter(p => p.length > 1 && isNaN(Number(p)));
      if (nameParts.length >= 2) {
        detectedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      }
    }
  }

  // If still not detected in document text, fallback to candidateName parameter from upload if valid
  if (!detectedName && candidateName && candidateName !== 'Candidate' && candidateName !== 'Custom_Resume') {
    detectedName = candidateName.replace(/\bresume\b/gi, '').trim();
  }

  if (!detectedName) {
    detectedName = 'Candidate';
  }

  // 2. Detect Real Job Title from Resume dynamically across all industries
  let detectedTitle = '';
  const titleKeywordsRegex = /\b(accountant|auditor|controller|treasurer|actuary|underwriter|banker|trader|bookkeeper|financial analyst|finance manager|finance director|recruiter|talent acquisition|sourcer|generalist|hrbp|hr manager|hr director|human resources|marketer|marketing specialist|marketing manager|marketing director|copywriter|content strategist|brand manager|seo specialist|account executive|sales representative|sales manager|sales director|business development|nurse|registered nurse|physician|doctor|therapist|pharmacist|clinician|dentist|paramedic|counsel|attorney|lawyer|paralegal|compliance officer|legal advisor|teacher|educator|professor|instructor|lecturer|tutor|principal|dean|operations manager|supply chain|logistics|buyer|procurement|project manager|program manager|product manager|scrum master|designer|art director|engineer|developer|architect|programmer|scientist|administrator|coordinator|specialist|consultant|officer|executive|lead|director|manager)\b/i;

  // Scan top lines for authentic role title
  for (const line of lines.slice(0, 15)) {
    if (
      titleKeywordsRegex.test(line) && 
      line.length < 75 &&
      !/experience|summary|skills|education|profile|curriculum|contact|email|phone|linkedin|github/i.test(line.replace(titleKeywordsRegex, ''))
    ) {
      const cleanTitle = line.split(/\s+[-–—]\s+|\s*[|•]\s*|\s*,\s*/)[0].trim();
      if (cleanTitle.length > 3) {
        detectedTitle = sanitizeClaimToEnglish(cleanTitle).replace(/\.$/, '');
        break;
      }
    }
  }

  // If still not detected, scan for the first role entry under employment history
  if (!detectedTitle) {
    for (const line of lines) {
      if (
        titleKeywordsRegex.test(line) &&
        /[-–—|•:]/.test(line) &&
        line.length < 80 &&
        !line.startsWith('•') &&
        !line.startsWith('-')
      ) {
        const parts = line.split(/\s+[-–—]\s+|\s*[|•:]\s*/).map(p => p.trim()).filter(Boolean);
        const candidatePart = parts.find(p => titleKeywordsRegex.test(p) && p.length < 50);
        if (candidatePart) {
          detectedTitle = sanitizeClaimToEnglish(candidatePart).replace(/\.$/, '');
          break;
        }
      }
    }
  }

  // Universal neutral fallback - NEVER hardcode to IT or Software Engineer
  if (!detectedTitle) {
    detectedTitle = 'Professional Candidate';
  }

  // 3. Extract Real Skills dynamically across industries (Finance, HR, Marketing, Sales, Healthcare, Legal, Education, IT, etc.)
  const languages: Set<string> = new Set(); // Core Competencies & Primary Disciplines
  const frameworks: Set<string> = new Set(); // Methodologies, Frameworks & Standards
  const databases: Set<string> = new Set(); // Systems of Record, ATS, CRM, ERP, Databases
  const toolsAndInfra: Set<string> = new Set(); // Tools, Platforms & Software

  const skillsMap: Record<string, { set: Set<string>; canonical: string }> = {
    // --- Finance, Accounting & Banking ---
    'financial modeling': { set: languages, canonical: 'Financial Modeling' },
    'financial analysis': { set: languages, canonical: 'Financial Analysis' },
    'budgeting': { set: languages, canonical: 'Budgeting & Forecasting' },
    'forecasting': { set: languages, canonical: 'Budgeting & Forecasting' },
    'variance analysis': { set: frameworks, canonical: 'Variance Analysis' },
    'gaap': { set: frameworks, canonical: 'GAAP' },
    'ifrs': { set: frameworks, canonical: 'IFRS' },
    'internal controls': { set: frameworks, canonical: 'Internal Controls' },
    'sox': { set: frameworks, canonical: 'SOX Compliance' },
    'risk management': { set: frameworks, canonical: 'Risk Management' },
    'tax accounting': { set: languages, canonical: 'Tax Accounting' },
    'auditing': { set: languages, canonical: 'Financial Auditing' },
    'cash flow': { set: frameworks, canonical: 'Cash Flow Management' },
    'p&l': { set: frameworks, canonical: 'P&L Management' },
    'sap': { set: databases, canonical: 'SAP ERP' },
    'oracle financials': { set: databases, canonical: 'Oracle Financials' },
    'netsuite': { set: databases, canonical: 'NetSuite' },
    'quickbooks': { set: databases, canonical: 'QuickBooks' },
    'xero': { set: databases, canonical: 'Xero' },
    'hyperion': { set: databases, canonical: 'Hyperion' },
    'excel': { set: toolsAndInfra, canonical: 'Microsoft Excel' },
    'power bi': { set: toolsAndInfra, canonical: 'Power BI' },
    'tableau': { set: toolsAndInfra, canonical: 'Tableau' },
    'bloomberg': { set: toolsAndInfra, canonical: 'Bloomberg Terminal' },

    // --- Human Resources, Recruiting & Talent Acquisition ---
    'talent acquisition': { set: languages, canonical: 'Talent Acquisition' },
    'recruitment': { set: languages, canonical: 'Full-Cycle Recruitment' },
    'sourcing': { set: frameworks, canonical: 'Candidate Sourcing' },
    'employee relations': { set: languages, canonical: 'Employee Relations' },
    'onboarding': { set: frameworks, canonical: 'Employee Onboarding' },
    'performance management': { set: frameworks, canonical: 'Performance Management' },
    'compensation': { set: languages, canonical: 'Compensation & Benefits' },
    'campus hiring': { set: frameworks, canonical: 'Campus Hiring' },
    'lateral hiring': { set: frameworks, canonical: 'Lateral Recruitment' },
    'boolean search': { set: frameworks, canonical: 'Boolean Search' },
    'hr policies': { set: frameworks, canonical: 'HR Policy Development' },
    'workday': { set: databases, canonical: 'Workday HRIS' },
    'bamboohr': { set: databases, canonical: 'BambooHR' },
    'greenhouse': { set: databases, canonical: 'Greenhouse ATS' },
    'lever': { set: databases, canonical: 'Lever ATS' },
    'workable': { set: databases, canonical: 'Workable ATS' },
    'adp': { set: databases, canonical: 'ADP' },
    'hris': { set: databases, canonical: 'HRIS Management' },
    'ats': { set: databases, canonical: 'ATS Management' },
    'linkedin recruiter': { set: toolsAndInfra, canonical: 'LinkedIn Recruiter' },
    'linkedin': { set: toolsAndInfra, canonical: 'LinkedIn Recruiter' },
    'naukri': { set: toolsAndInfra, canonical: 'Naukri' },
    'indeed': { set: toolsAndInfra, canonical: 'Indeed' },

    // --- Marketing, Branding & Growth ---
    'digital marketing': { set: languages, canonical: 'Digital Marketing' },
    'brand strategy': { set: languages, canonical: 'Brand Strategy' },
    'content strategy': { set: languages, canonical: 'Content Strategy' },
    'seo': { set: frameworks, canonical: 'Search Engine Optimization (SEO)' },
    'sem': { set: frameworks, canonical: 'Search Engine Marketing (SEM)' },
    'email marketing': { set: frameworks, canonical: 'Email Marketing' },
    'market research': { set: frameworks, canonical: 'Market Research' },
    'copywriting': { set: languages, canonical: 'Copywriting' },
    'social media': { set: frameworks, canonical: 'Social Media Strategy' },
    'google analytics': { set: toolsAndInfra, canonical: 'Google Analytics' },
    'hubspot': { set: databases, canonical: 'HubSpot' },
    'salesforce': { set: databases, canonical: 'Salesforce CRM' },
    'mailchimp': { set: toolsAndInfra, canonical: 'Mailchimp' },
    'semrush': { set: toolsAndInfra, canonical: 'SEMrush' },
    'meta ads': { set: toolsAndInfra, canonical: 'Meta Ads Manager' },
    'google ads': { set: toolsAndInfra, canonical: 'Google Ads' },

    // --- Sales & Business Development ---
    'b2b sales': { set: languages, canonical: 'B2B Sales' },
    'account management': { set: languages, canonical: 'Account Management' },
    'lead generation': { set: frameworks, canonical: 'Lead Generation' },
    'pipeline management': { set: frameworks, canonical: 'Pipeline Management' },
    'contract negotiation': { set: frameworks, canonical: 'Contract Negotiation' },
    'client relations': { set: languages, canonical: 'Client Relationship Management' },
    'crm': { set: databases, canonical: 'CRM Management' },

    // --- Healthcare, Nursing & Clinical ---
    'patient care': { set: languages, canonical: 'Patient Care' },
    'clinical assessment': { set: languages, canonical: 'Clinical Assessment' },
    'triage': { set: frameworks, canonical: 'Triage Procedures' },
    'medication administration': { set: frameworks, canonical: 'Medication Administration' },
    'hipaa': { set: frameworks, canonical: 'HIPAA Compliance' },
    'bls': { set: frameworks, canonical: 'BLS Certification' },
    'acls': { set: frameworks, canonical: 'ACLS Certification' },
    'infection control': { set: frameworks, canonical: 'Infection Control' },
    'epic': { set: databases, canonical: 'Epic EHR' },
    'cerner': { set: databases, canonical: 'Cerner EMR' },
    'ehr': { set: databases, canonical: 'EHR Documentation' },
    'emr': { set: databases, canonical: 'EMR Systems' },

    // --- Legal & Compliance ---
    'contract drafting': { set: languages, canonical: 'Contract Drafting' },
    'legal research': { set: languages, canonical: 'Legal Research' },
    'due diligence': { set: frameworks, canonical: 'Due Diligence' },
    'regulatory compliance': { set: frameworks, canonical: 'Regulatory Compliance' },
    'corporate governance': { set: frameworks, canonical: 'Corporate Governance' },
    'litigation': { set: languages, canonical: 'Litigation Support' },
    'westlaw': { set: toolsAndInfra, canonical: 'Westlaw' },
    'lexisnexis': { set: toolsAndInfra, canonical: 'LexisNexis' },

    // --- Education & Academia ---
    'curriculum development': { set: languages, canonical: 'Curriculum Development' },
    'lesson planning': { set: frameworks, canonical: 'Lesson Planning' },
    'classroom management': { set: frameworks, canonical: 'Classroom Management' },
    'student assessment': { set: frameworks, canonical: 'Student Assessment' },
    'differentiated instruction': { set: frameworks, canonical: 'Differentiated Instruction' },
    'pedagogy': { set: languages, canonical: 'Pedagogical Methodology' },
    'canvas': { set: databases, canonical: 'Canvas LMS' },
    'blackboard': { set: databases, canonical: 'Blackboard LMS' },

    // --- Information Technology & Software (Equal Citizen) ---
    'typescript': { set: languages, canonical: 'TypeScript' },
    'javascript': { set: languages, canonical: 'JavaScript' },
    'python': { set: languages, canonical: 'Python' },
    'java': { set: languages, canonical: 'Java' },
    'c++': { set: languages, canonical: 'C++' },
    'c#': { set: languages, canonical: 'C#' },
    'golang': { set: languages, canonical: 'Go' },
    'go': { set: languages, canonical: 'Go' },
    'rust': { set: languages, canonical: 'Rust' },
    'php': { set: languages, canonical: 'PHP' },
    'ruby': { set: languages, canonical: 'Ruby' },
    'sql': { set: languages, canonical: 'SQL' },
    'react': { set: frameworks, canonical: 'React' },
    'node.js': { set: frameworks, canonical: 'Node.js' },
    'nodejs': { set: frameworks, canonical: 'Node.js' },
    'next.js': { set: frameworks, canonical: 'Next.js' },
    'nextjs': { set: frameworks, canonical: 'Next.js' },
    'angular': { set: frameworks, canonical: 'Angular' },
    'vue': { set: frameworks, canonical: 'Vue.js' },
    'fastapi': { set: frameworks, canonical: 'FastAPI' },
    'spring boot': { set: frameworks, canonical: 'Spring Boot' },
    '.net': { set: frameworks, canonical: '.NET' },
    'dotnet': { set: frameworks, canonical: '.NET' },
    'asp.net': { set: frameworks, canonical: 'ASP.NET' },
    'rest api': { set: frameworks, canonical: 'REST APIs' },
    'rest apis': { set: frameworks, canonical: 'REST APIs' },
    'graphql': { set: frameworks, canonical: 'GraphQL' },
    'ci/cd': { set: toolsAndInfra, canonical: 'CI/CD' },
    'cicd': { set: toolsAndInfra, canonical: 'CI/CD' },
    'linux': { set: toolsAndInfra, canonical: 'Linux' },
    'postgres': { set: databases, canonical: 'PostgreSQL' },
    'postgresql': { set: databases, canonical: 'PostgreSQL' },
    'redis': { set: databases, canonical: 'Redis' },
    'mongodb': { set: databases, canonical: 'MongoDB' },
    'mysql': { set: databases, canonical: 'MySQL' },
    'docker': { set: toolsAndInfra, canonical: 'Docker' },
    'kubernetes': { set: toolsAndInfra, canonical: 'Kubernetes' },
    'aws': { set: toolsAndInfra, canonical: 'AWS' },
    'gcp': { set: toolsAndInfra, canonical: 'GCP' },
    'azure': { set: toolsAndInfra, canonical: 'Azure' },
    'git': { set: toolsAndInfra, canonical: 'Git' }
  };

  // Match keyword dictionary
  for (const line of lines) {
    const l = line.toLowerCase();
    for (const [key, meta] of Object.entries(skillsMap)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[^a-zA-Z0-9_])${escapedKey}(?:$|[^a-zA-Z0-9_])`, 'i').test(l)) {
        meta.set.add(meta.canonical);
      }
    }
  }

  // Dynamic Skill Extraction from Skills / Competencies / Expertise Sections
  const skillSectionIndex = lines.findIndex(l => 
    /^(?:skills|key skills|core competencies|competencies|areas of expertise|technical skills|tools & technologies|tools & platforms)\b/i.test(l.trim())
  );
  if (skillSectionIndex !== -1 && lines.length > skillSectionIndex + 1) {
    for (let sIdx = skillSectionIndex + 1; sIdx < Math.min(lines.length, skillSectionIndex + 6); sIdx++) {
      const sLine = lines[sIdx].trim();
      if (/^(?:experience|work|employment|education|certifications|projects|summary)\b/i.test(sLine)) break;
      // Extract comma, bullet, or pipe delimited skills
      const parsedItems = sLine
        .replace(/^[•\-\*\+:]\s*/, '')
        .split(/[,|•;]|\s{3,}/)
        .map(item => item.trim())
        .filter(item => item.length >= 2 && item.length <= 40 && !item.includes('@') && !item.includes('http'));
      
      for (const item of parsedItems) {
        if (languages.size < 12) {
          languages.add(item);
        } else if (frameworks.size < 12) {
          frameworks.add(item);
        }
      }
    }
  }

  // 4. (Experience calculation is performed deterministically via ExperienceCalculator using work history)

  // 5. Extract Real Claims: Split by safe sentence boundaries (. , \n, •) so claims are short and concise
  const extractedClaims: ResumeClaim[] = [];
  const metricsRegex = /(\d[\d,.]*\s*[%kKmMbB\+]|\d[\d,.]*\s*(?:users|rps|tps|ms|requests|concurrent|million|billion|queries|events|tb|gb|sec|min|hrs|percent|reduction|increase|downloads|clients|interviews|profiles|applications|drives|roles|projects|candidates|positions|requisitions|loops|\$))/i;

  // Split raw text into individual distinct sentences, avoiding education/skills lists from turning into claims
  const rawSentences: string[] = [];
  let inEduSection = false;
  let inSkillsSec = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track sections to avoid converting degree or skills lines into claim sentences
    if (/^(?:education|academic|academics|academic background|qualifications)\b/i.test(trimmed)) {
      inEduSection = true;
      inSkillsSec = false;
      continue;
    } else if (/^(?:skills|technical skills|core competencies|areas of expertise|tools & technologies)\b/i.test(trimmed)) {
      inSkillsSec = true;
      inEduSection = false;
      continue;
    } else if (/^(?:experience|work experience|employment history|projects|summary|profile|about me)\b/i.test(trimmed)) {
      inEduSection = false;
      inSkillsSec = false;
    }

    if (inEduSection || inSkillsSec) continue;

    const sentences = splitSentenceSafe(line);
    rawSentences.push(...sentences);
  }

  let claimIdx = 1;
  const seenClaims = new Set<string>();

  for (const sentence of rawSentences) {
    let sanitized = sanitizeClaimToEnglish(sentence);
    if (!sanitized || sanitized.length < 25) continue;

    // Filter out standalone headers, titles, or section labels
    if (/^(?:professional summary|summary|about me|work experience|employment history|education|skills|certifications|key skills|contact|projects|internships|project works|personal details|declaration|academic profile|strengths|hobbies)$/i.test(sanitized.replace(/[.:;]$/, ''))) {
      continue;
    }

    // Filter out academic degrees and education lines
    if (/\b(?:bachelor|master|phd|b\.s|m\.s|b\.e|b\.tech|m\.tech|mba|bba|bca|mca|b\.com|m\.com|b\.sc|m\.sc|diploma|degree|university|institute|college|graduated)\b/i.test(sanitized)) {
      continue;
    }

    // Filter out comma-delimited skill lists (e.g. "React, Node.js, .NET, C++, Python")
    if (/^[a-zA-Z0-9#+.\s\/-]+(?:,\s*[a-zA-Z0-9#+.\s\/-]+){3,}\.?$/.test(sanitized)) {
      continue;
    }

    // Filter out job header lines with separators (e.g. "Senior Full-Stack Developer - TechCorp Inc.")
    if (titleKeywordsRegex.test(sanitized) && /\s+[-–—|•:]\s+/.test(sanitized) && sanitized.length < 90) {
      continue;
    }

    // Strip leading header keywords only if separated by colon/dash (do not strip words like 'Experienced')
    sanitized = sanitized.replace(/^(?:professional summary|summary|overview|profile|work experience|career objective|objective)\s*[:\-–]\s*/i, '').trim();
    sanitized = sanitizeClaimToEnglish(sanitized);
    if (!sanitized || sanitized.length < 25) continue;

    // Strip leading role title prefixes (e.g., "RECRUITMENT MANAGER: ")
    sanitized = sanitized.replace(/^[A-Z\s]{4,}\s*:\s*/, '').trim();
    sanitized = sanitizeClaimToEnglish(sanitized);
    if (!sanitized || sanitized.length < 25) continue;

    // Filter out pure job header lines with dates like "Aventurine Homes - Bengaluru [May 2026 - Present]"
    if (/[-–—].*\[.*\d{4}/i.test(sanitized) || /\[\w+\s+\d{4}\s*[-–—]/i.test(sanitized) || /\|\s*talent acquisition/i.test(sanitized)) continue;

    // Reject if sentence contains excessive non-alphabet tokens or leftover PDF syntax
    if (/\/(?:Parent|Dest|XYZ|Title|Prev|Next|Font|stream|endobj|endstream)\b/i.test(sanitized)) continue;
    if (/\b\d+\s+\d+\s+R\b/.test(sanitized)) continue;

    // Ensure at least 4 valid English words
    const words = sanitized.split(/\s+/).filter(w => /^[a-zA-Z]{3,}/.test(w.replace(/[^a-zA-Z]/g, '')));
    if (words.length < 4) continue;

    // Keep claim concise (under 140 characters max) so it can be quickly probed in an interview
    if (sanitized.length > 140) {
      const parts = sanitized.split(/[,;]\s+/);
      sanitized = parts[0];
      if (parts[1] && sanitized.length < 60) {
        sanitized += ', ' + parts[1];
      }
      if (!/[.!?]$/.test(sanitized)) sanitized += '.';
    }

    const isClaimCandidate = 
      metricsRegex.test(sanitized) || 
      /^(?:built|architected|designed|developed|implemented|optimized|scaled|reduced|created|managed|directed|spearheaded|engineered|led|delivered|handled|improved|analyzed|coordinated|maintained|authored|resolved|established|automated|launched|sourced|screened|conducted|reviewed|partnered|recruited|initiated|tracked|deployed|migrated|configured|facilitated)\b/i.test(sanitized) ||
      (sanitized.length >= 35 && sanitized.length <= 140 && !sanitized.includes('@') && !sanitized.includes('http'));

    if (isClaimCandidate) {
      const match = sanitized.match(metricsRegex);
      const metrics = match ? match[0] : 'Documented Highlight';

      let category: ResumeClaim['category'] = 'Operational Execution & Quality';
      if (/lead|managed|team|mentored|spearheaded|directed|coordinated|hired|partnered|stakeholder|supervised|headed|negotiated/i.test(sanitized)) {
        category = 'Leadership & Team Direction';
      } else if (/\$|revenue|budget|margin|roi|sales|growth|profit|saving|cost reduction|decreased|increased|boosted|generated|closed|conversion|p&l/i.test(sanitized)) {
        category = 'Key Achievement & Outcomes';
      } else if (/process|workflow|compliance|audit|policy|onboarding|sla|turnaround|standardized|quality|operations|retention|clinical|triage|curriculum/i.test(sanitized)) {
        category = 'Operational Execution & Quality';
      } else if (/strategy|roadmap|market|expansion|initiative|forecast|planned|vision|research|branding/i.test(sanitized)) {
        category = 'Strategic Initiatives & Planning';
      } else if (/scale|traffic|concurrent|million|billion|database|system|infrastructure|platform|pipeline|architecture|load|throughput|erp|crm|software|tool/i.test(sanitized)) {
        category = 'Tools, Platforms & Methodologies';
      } else {
        category = 'Key Achievement & Outcomes';
      }

      const lowerKey = sanitized.toLowerCase().slice(0, 40);
      if (!seenClaims.has(lowerKey)) {
        seenClaims.add(lowerKey);
        extractedClaims.push({
          id: `claim-${claimIdx++}`,
          rawClaim: sanitized,
          category,
          contextProject: 'Documented Experience',
          claimedMetrics: metrics,
          confidenceLevel: sanitized.length > 40 ? 'High' : 'Needs Deep-Dive',
          verificationStatus: 'Pending'
        });
      }

      if (extractedClaims.length >= 8) break;
    }
  }

  // If fewer than 2 claims extracted from bullet points, extract clean grounded claims from resume lines
  if (extractedClaims.length < 2) {
    for (const line of lines) {
      if (extractedClaims.length >= 4) break;
      const cleanLine = sanitizeClaimToEnglish(line);
      if (
        cleanLine.length >= 25 && 
        cleanLine.length <= 140 && 
        !cleanLine.includes('@') && 
        !cleanLine.includes('http') &&
        !seenClaims.has(cleanLine.toLowerCase().slice(0, 40))
      ) {
        seenClaims.add(cleanLine.toLowerCase().slice(0, 40));
        extractedClaims.push({
          id: `claim-${claimIdx++}`,
          rawClaim: cleanLine,
          category: 'Key Achievement & Outcomes',
          contextProject: 'Documented Experience',
          claimedMetrics: 'Documented Highlight',
          confidenceLevel: 'Medium',
          verificationStatus: 'Pending'
        });
      }
    }
  }

  // 6. Extract Real Summary from resume if present
  let realSummary = '';
  const summaryIndex = lines.findIndex(l => /^(professional summary|summary|about me|profile|overview|objective)/i.test(l));
  if (summaryIndex !== -1 && lines.length > summaryIndex + 1) {
    const summaryLines = lines.slice(summaryIndex + 1, summaryIndex + 4).filter(l => !/^(experience|education|skills|projects|work)/i.test(l));
    if (summaryLines.length > 0) {
      realSummary = summaryLines.map(l => sanitizeClaimToEnglish(l)).filter(Boolean).join(' ');
    }
  }

  if (!realSummary) {
    const skillsList = [...Array.from(languages), ...Array.from(frameworks)].slice(0, 4).join(', ');
    realSummary = skillsList
      ? `${detectedTitle} with documented expertise in ${skillsList}.`
      : `Documented resume for ${detectedName} (${detectedTitle}).`;
  }

  // 7. Extract Real Education & Institutions from resume lines
  const educationList: CandidateProfile['education'] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[•\*\>~▪▸►\t]+\s*|^(?:\(?\d{1,2}[.)]\s+)/, '').trim();
    if (/^(?:provided|managed|taught|mentored|guided|conducted|coached|trained|supported|scheduled|facilitated|coordinated|partnered|sourced|screened|evaluated|reviewed|prepared|initiated|tracked|built|ensured)\b/i.test(cleanLine)) {
      continue;
    }
    if (
      /\b(?:bachelor|master|phd|b\.s|m\.s|b\.e|b\.tech|m\.tech|mba|bba|bca|mca|b\.com|m\.com|b\.sc|m\.sc|bsn|msn|rn|jd|llb|llm|diploma)\b/i.test(cleanLine) ||
      /\b(?:degree|university|institute|college|graduated)\b/i.test(cleanLine)
    ) {
      const sanitized = sanitizeClaimToEnglish(cleanLine).replace(/\.$/, '');
      if (sanitized.length > 6 && sanitized.length < 120) {
        // Extract graduation year (prioritize end year in date range)
        const allYears = Array.from(sanitized.matchAll(/\b(19\d\d|20\d\d)\b/g)).map(m => m[1]);
        const year = allYears.length > 0 ? allYears[allYears.length - 1] : '';

        // Strip date range cleanly from degree/institution line to avoid breaking hyphens in dates
        const degreeWithoutDates = sanitized
          .replace(/\s*\((?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current)\)/gi, '')
          .replace(/\s*\((?:19|20)\d{2}\)/g, '')
          .replace(/\s+[-–—]\s*(?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current)/gi, '')
          .replace(/\s+[-–—]\s*(?:19|20)\d{2}\b/g, '')
          .trim();

        const parts = degreeWithoutDates.split(/\s+[-–—|•]\s+|\s+from\s+|\s+at\s+|\s*,\s*/).map(p => p.trim()).filter(Boolean);
        const degree = parts[0] || degreeWithoutDates;
        const institution = (parts[1] || 'Educational Institution').replace(/[()]/g, '').trim();

        educationList.push({
          degree,
          institution,
          year
        });
        if (educationList.length >= 3) break;
      }
    }
  }

  // 8. Extract Real Work Experience Roles across all industries
  const projectsList: CandidateProfile['projects'] = [];
  let projIdx = 1;
  let currentSection = 'none';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanHeader = line.replace(/^[#*•\-_:\s]+/, '').replace(/[:\s]+$/, '');

    // Section header tracking
    if (cleanHeader.length <= 40) {
      if (/^(?:work\s+experience|professional\s+experience|employment\s+history|work\s+history|career\s+history|experience|employment)\b/i.test(cleanHeader)) {
        currentSection = 'experience';
        continue;
      } else if (/^(?:education|academic\s+background|academic\s+qualifications|academics|academic\s+profile|degrees|university|college|schooling)\b/i.test(cleanHeader)) {
        currentSection = 'education';
        continue;
      } else if (/^(?:projects|academic\s+projects|personal\s+projects|certifications|certificates|licenses|skills|technical\s+skills|core\s+competencies|summary|about\s+me)\b/i.test(cleanHeader)) {
        currentSection = 'other';
        continue;
      }
    }

    if (currentSection === 'education' || currentSection === 'other') {
      continue;
    }

    const isEducationLine = /\b(?:bachelor|master|phd|b\.s|m\.s|b\.e|b\.tech|m\.tech|mba|bba|bca|mca|b\.com|m\.com|b\.sc|m\.sc|bsn|msn|rn|jd|llb|llm|diploma|degree|university|institute|college|graduated|graduation|school|secondary|cgpa|gpa|sslc|hsc|cbse|icse)\b/i.test(line);

    const hasRoleKeyword = titleKeywordsRegex.test(line);
    const hasSeparator = /[-–—|•:]/.test(line);
    const hasDate = /\b(19\d\d|20\d\d|present)\b/i.test(line);

    // Detect company or role line across any profession (strictly exclude education/degrees)
    if (
      !isEducationLine &&
      (hasRoleKeyword || hasDate || currentSection === 'experience') &&
      hasSeparator &&
      line.length < 130 &&
      !line.startsWith('•') &&
      !line.startsWith('-') &&
      !/^(?:professional summary|summary|education|skills|certifications|key skills)\b/i.test(line)
    ) {
      // First extract date range safely so splitting by hyphen does not break date ranges like (2021 - 2024)
      const dateMatch = line.match(/\(([^)]+)\)|\b((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*(?:–|—|-|\bto\b|\btill\b)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|present|current|now|ongoing|\d{4}))\b/i);
      const duration = dateMatch ? (dateMatch[1] || dateMatch[2]) : '';
      const lineWithoutDates = dateMatch ? line.replace(dateMatch[0], '').trim() : line;

      const parts = lineWithoutDates.split(/\s+[-–—]\s+|\s*[|•:]\s*/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 || (parts.length === 1 && duration)) {
        const role = sanitizeClaimToEnglish(parts[0]).replace(/\.$/, '');
        const title = parts[1] ? sanitizeClaimToEnglish(parts[1]).replace(/\.$/, '') : role;

        // Collect following bullet points for this role
        const highlights: string[] = [];
        for (let j = i + 1; j < Math.min(lines.length, i + 7); j++) {
          if (lines[j].startsWith('•') || lines[j].startsWith('-') || lines[j].startsWith('*')) {
            const h = sanitizeClaimToEnglish(lines[j]);
            if (h) highlights.push(h);
          } else if (lines[j].length > 0 && titleKeywordsRegex.test(lines[j]) && /[-–—|•:]/.test(lines[j])) {
            break;
          }
        }

        projectsList.push({
          id: `proj-${projIdx++}`,
          title: title || role,
          role,
          duration,
          technologies: Array.from(languages).concat(Array.from(frameworks)).slice(0, 5),
          description: highlights[0] || `${role} role documented on resume.`,
          highlights
        });

        if (projectsList.length >= 5) break;
      }
    }
  }

  // Calculate authoritative experience strictly from employment history and job dates (ignoring education)
  const calculatedYears = ExperienceCalculator.calculate({
    workHistory: projectsList,
    rawText
  });

  const uniqueCandId = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const extractedKeywords = ResumeKeywordExtractor.extract(rawText, detectedName);

  return {
    id: uniqueCandId,
    name: detectedName,
    title: detectedTitle,
    experienceYears: calculatedYears,
    summary: realSummary,
    skills: {
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      databases: Array.from(databases),
      toolsAndInfra: Array.from(toolsAndInfra)
    },
    extractedKeywords,
    projects: projectsList,
    education: educationList,
    claims: extractedClaims
  };
}
