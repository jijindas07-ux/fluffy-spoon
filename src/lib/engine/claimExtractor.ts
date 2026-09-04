import { CandidateProfile, ResumeClaim } from '../types';
import { cleanPdfText, isReadableEnglishText, stripPdfSyntax } from './pdfParser';

/**
 * Sanitize individual claim text to make sure it's presented in 100% clean, proper English.
 * Strips all PDF object operators, font bytecode, trailing braces, and formatting debris.
 */
export function sanitizeClaimToEnglish(text: string): string {
  if (!text) return '';

  let cleaned = cleanPdfText(text)
    // Remove leading bullet marks, numbers, or dashes
    .replace(/^[•\-\*\+\d\.\)\:\>\s|#]+/, '')
    // Remove trailing orphan punctuation
    .replace(/[)\]}>/\\;,|#]+$/, '')
    // Replace multiple spaces
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 10) return '';

  // Capitalize first character
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Ensure ending period if it's a complete sentence
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
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
      detectedName = cleanLine;
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

  // 2. Detect Real Job Title from Resume
  let detectedTitle = '';
  for (const line of lines.slice(0, 10)) {
    if (
      /engineer|developer|architect|lead|manager|consultant|programmer|analyst|designer|specialist|officer|scientist|administrator|coordinator/i.test(line) && 
      line.length < 60 &&
      !/experience|summary|skills|education|profile/i.test(line.replace(/engineer|developer/i, ''))
    ) {
      const cleanTitle = line.split(/[-–|•,]/)[0].trim();
      if (cleanTitle.length > 3) {
        detectedTitle = sanitizeClaimToEnglish(cleanTitle).replace(/\.$/, '');
        break;
      }
    }
  }
  if (!detectedTitle) {
    detectedTitle = 'Software Engineer';
  }

  // 3. Extract Real Skills dynamically present in resume text
  const languages: Set<string> = new Set();
  const frameworks: Set<string> = new Set();
  const databases: Set<string> = new Set();
  const toolsAndInfra: Set<string> = new Set();

  const techMap: Record<string, { set: Set<string>; canonical: string }> = {
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
    'swift': { set: languages, canonical: 'Swift' },
    'kotlin': { set: languages, canonical: 'Kotlin' },
    'sql': { set: languages, canonical: 'SQL' },
    'html': { set: languages, canonical: 'HTML5' },
    'css': { set: languages, canonical: 'CSS3' },
    
    'react': { set: frameworks, canonical: 'React' },
    'react native': { set: frameworks, canonical: 'React Native' },
    'next.js': { set: frameworks, canonical: 'Next.js' },
    'nextjs': { set: frameworks, canonical: 'Next.js' },
    'vue': { set: frameworks, canonical: 'Vue.js' },
    'angular': { set: frameworks, canonical: 'Angular' },
    'node.js': { set: frameworks, canonical: 'Node.js' },
    'nodejs': { set: frameworks, canonical: 'Node.js' },
    'express': { set: frameworks, canonical: 'Express' },
    'fastapi': { set: frameworks, canonical: 'FastAPI' },
    'spring': { set: frameworks, canonical: 'Spring Boot' },
    'spring boot': { set: frameworks, canonical: 'Spring Boot' },
    'django': { set: frameworks, canonical: 'Django' },
    'flask': { set: frameworks, canonical: 'Flask' },
    'tailwind': { set: frameworks, canonical: 'TailwindCSS' },

    'postgres': { set: databases, canonical: 'PostgreSQL' },
    'postgresql': { set: databases, canonical: 'PostgreSQL' },
    'redis': { set: databases, canonical: 'Redis' },
    'mongodb': { set: databases, canonical: 'MongoDB' },
    'mysql': { set: databases, canonical: 'MySQL' },
    'dynamodb': { set: databases, canonical: 'DynamoDB' },
    'cassandra': { set: databases, canonical: 'Cassandra' },
    'elasticsearch': { set: databases, canonical: 'Elasticsearch' },
    'sqlite': { set: databases, canonical: 'SQLite' },
    'oracle': { set: databases, canonical: 'Oracle' },
    'kafka': { set: databases, canonical: 'Kafka' },
    'rabbitmq': { set: databases, canonical: 'RabbitMQ' },

    'docker': { set: toolsAndInfra, canonical: 'Docker' },
    'kubernetes': { set: toolsAndInfra, canonical: 'Kubernetes' },
    'k8s': { set: toolsAndInfra, canonical: 'Kubernetes' },
    'aws': { set: toolsAndInfra, canonical: 'AWS' },
    'gcp': { set: toolsAndInfra, canonical: 'GCP' },
    'azure': { set: toolsAndInfra, canonical: 'Azure' },
    'ci/cd': { set: toolsAndInfra, canonical: 'CI/CD' },
    'git': { set: toolsAndInfra, canonical: 'Git' },
    'github': { set: toolsAndInfra, canonical: 'GitHub' },
    'terraform': { set: toolsAndInfra, canonical: 'Terraform' },
    'linux': { set: toolsAndInfra, canonical: 'Linux' },
    'graphql': { set: toolsAndInfra, canonical: 'GraphQL' },

    // Recruiting, HR, ATS & Operations Tools
    'workable': { set: toolsAndInfra, canonical: 'Workable ATS' },
    'bamboohr': { set: toolsAndInfra, canonical: 'BambooHR' },
    'ibridge': { set: toolsAndInfra, canonical: 'iBridge' },
    'linkedin': { set: toolsAndInfra, canonical: 'LinkedIn Recruiter' },
    'naukri': { set: toolsAndInfra, canonical: 'Naukri' },
    'indeed': { set: toolsAndInfra, canonical: 'Indeed' },
    'greenhouse': { set: toolsAndInfra, canonical: 'Greenhouse' },
    'lever': { set: toolsAndInfra, canonical: 'Lever' },
    'workday': { set: toolsAndInfra, canonical: 'Workday' },
    'outlook': { set: toolsAndInfra, canonical: 'Microsoft Outlook' },
    'jira': { set: toolsAndInfra, canonical: 'Jira' },
    'ats': { set: frameworks, canonical: 'ATS Management' },
    'hris': { set: frameworks, canonical: 'HRIS' },
    'talent acquisition': { set: frameworks, canonical: 'Talent Acquisition' },
    'campus hiring': { set: frameworks, canonical: 'Campus Hiring' },
    'lateral hiring': { set: frameworks, canonical: 'Lateral Recruitment' },
    'boolean search': { set: frameworks, canonical: 'Boolean Search' }
  };

  for (const line of lines) {
    const l = line.toLowerCase();
    for (const [key, meta] of Object.entries(techMap)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[^a-zA-Z0-9_])${escapedKey}(?:$|[^a-zA-Z0-9_])`, 'i').test(l)) {
        meta.set.add(meta.canonical);
      }
    }
  }

  // 4. Calculate Experience Years from real dates found in resume
  let calculatedYears = 0;
  const yearMatches = Array.from(rawText.matchAll(/\b(19\d\d|20\d\d)\b/g)).map(m => parseInt(m[1], 10));
  const validYears = yearMatches.filter(y => y >= 1990 && y <= new Date().getFullYear());
  if (validYears.length >= 2) {
    const minYear = Math.min(...validYears);
    const maxYear = Math.max(...validYears);
    calculatedYears = Math.min(30, Math.max(1, maxYear - minYear));
  } else if (validYears.length === 1) {
    calculatedYears = Math.max(1, new Date().getFullYear() - validYears[0]);
  }

  // 5. Extract Real Claims: Split by sentence boundaries (. , \n, •) so claims are short and concise
  const extractedClaims: ResumeClaim[] = [];
  const metricsRegex = /(\d[\d,.]*\s*[%kKmMbB\+]|\d[\d,.]*\s*(?:users|rps|tps|ms|requests|concurrent|million|billion|queries|events|tb|gb|sec|min|hrs|percent|reduction|increase|downloads|clients|interviews|profiles|applications|drives|roles|projects|candidates|positions|requisitions|loops|\$))/i;

  // Split raw text into individual distinct sentences
  const rawSentences: string[] = [];
  for (const line of lines) {
    const sentences = line
      .split(/(?<=[.!?•])\s+|\s*[•\n\r\t]+\s*/g)
      .map(s => s.trim())
      .filter(s => s.length > 20);
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

      let category: ResumeClaim['category'] = 'Architecture';
      if (/user|traffic|scale|load|million|billion|concurrent|throughput|volume|campus|lateral|hiring|interviews|applications|candidates|requisitions/i.test(sanitized)) {
        category = 'Scale & Traffic';
      } else if (/database|sql|postgres|redis|mongo|storage|cache|kafka|query|data|ats|profiles|pipeline|crm|hris/i.test(sanitized)) {
        category = 'Database & Storage';
      } else if (/latency|p95|p99|speed|ms|fast|throughput|optimized|performance|response time|cost|reduction|turnaround|sla/i.test(sanitized)) {
        category = 'Performance & Latency';
      } else if (/uptime|resilient|ci\/cd|kubernetes|docker|deploy|aws|cloud|monitoring|security|onboarding|operations|verification/i.test(sanitized)) {
        category = 'Reliability & CI/CD';
      } else if (/lead|managed|team|mentored|spearheaded|directed|coordinated|hired|partner|stakeholder/i.test(sanitized)) {
        category = 'Leadership';
      } else {
        category = 'Architecture';
      }

      const lowerKey = sanitized.toLowerCase().slice(0, 40);
      if (!seenClaims.has(lowerKey)) {
        seenClaims.add(lowerKey);
        extractedClaims.push({
          id: `claim-${claimIdx++}`,
          rawClaim: sanitized,
          category,
          contextProject: 'Resume Experience',
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
          category: 'Architecture',
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
    const cleanLine = line.replace(/^[•\-\*\+\d\.\)\:\>\s|#]+/, '').trim();
    if (/^(?:provided|managed|taught|mentored|guided|conducted|coached|trained|supported|scheduled|facilitated|coordinated|partnered|sourced|screened|evaluated|reviewed|prepared|initiated|tracked|built|ensured)\b/i.test(cleanLine)) {
      continue;
    }
    if (
      /\b(?:bachelor|master|phd|b\.s|m\.s|b\.e|b\.tech|m\.tech|mba|bba|bca|mca|b\.com|m\.com|b\.sc|m\.sc|diploma)\b/i.test(cleanLine) ||
      /\b(?:degree|university|institute|college|graduated)\b/i.test(cleanLine)
    ) {
      const sanitized = sanitizeClaimToEnglish(cleanLine).replace(/\.$/, '');
      if (sanitized.length > 6 && sanitized.length < 120) {
        // Try parsing institution if format is "Degree - University (Year)" or "Degree, University"
        const parts = sanitized.split(/[-–|•,]/).map(p => p.trim()).filter(Boolean);
        const degree = parts[0] || sanitized;
        const institution = parts[1] || 'Educational Institution';
        const yearMatch = sanitized.match(/\b(19\d\d|20\d\d)\b/);
        educationList.push({
          degree,
          institution,
          year: yearMatch ? yearMatch[1] : ''
        });
        if (educationList.length >= 3) break;
      }
    }
  }

  // 8. Extract Real Projects & Work Experience Roles
  const projectsList: CandidateProfile['projects'] = [];
  let projIdx = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect company or role line e.g. "Senior Software Engineer — Nexus Systems (2021 - Present)"
    if (
      /(?:engineer|architect|developer|lead|director|manager|specialist|scientist|analyst|intern)\b/i.test(line) &&
      /[-–—|•,]/.test(line) &&
      line.length < 120 &&
      !line.startsWith('•')
    ) {
      const parts = line.split(/[-–—|•]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const role = sanitizeClaimToEnglish(parts[0]).replace(/\.$/, '');
        const titleWithDates = parts.slice(1).join(' ');
        const dateMatch = titleWithDates.match(/\(([^)]+)\)|\b(19\d\d|20\d\d(?:\s*-\s*(?:Present|19\d\d|20\d\d))?)\b/i);
        const duration = dateMatch ? (dateMatch[1] || dateMatch[0]) : '';
        const title = titleWithDates.replace(/\([^)]+\)/g, '').trim();

        // Collect following bullet points for this role
        const highlights: string[] = [];
        for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          if (lines[j].startsWith('•') || lines[j].startsWith('-')) {
            const h = sanitizeClaimToEnglish(lines[j]);
            if (h) highlights.push(h);
          } else if (lines[j].length > 0 && /(?:engineer|architect|developer|lead|director|manager)\b/i.test(lines[j]) && /[-–—|•]/.test(lines[j])) {
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

  const uniqueCandId = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: uniqueCandId,
    name: detectedName,
    title: detectedTitle,
    experienceYears: calculatedYears || 0,
    summary: realSummary,
    skills: {
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      databases: Array.from(databases),
      toolsAndInfra: Array.from(toolsAndInfra)
    },
    projects: projectsList,
    education: educationList,
    claims: extractedClaims
  };
}
