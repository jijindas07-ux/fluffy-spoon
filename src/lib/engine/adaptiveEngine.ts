import type { CandidateProfile, ConversationTurn, InterviewConfig, ResumeClaim } from '../types';

export interface DynamicQuestionResult {
  question: string;
  anchoredClaimId: string;
  claimDepthLevel: number;
  investigationContext: string;
  detectedEntities: string[];
  isSessionComplete: boolean;
}

export interface CandidateResponseAnalysis {
  wordCount: number;
  entities: string[];
  intent: 'unfamiliar_or_dodged' | 'clarification_or_question' | 'superficial' | 'domain_deep' | 'technical_deep' | 'standard';
  keyPhrases: string[];
  referencedTech: string[];
  hasMetrics: boolean;
  sentiment: 'confident' | 'hesitant' | 'neutral';
}

export type CandidateDomain = 'finance' | 'hr' | 'marketing' | 'sales' | 'healthcare' | 'legal' | 'education' | 'tech' | 'general';

export class AdaptiveInterviewEngine {
  /**
   * Identifies candidate's primary domain dynamically from their profile
   */
  public static detectDomain(candidate: CandidateProfile): CandidateDomain {
    const text = `${candidate.title} ${candidate.summary} ${(candidate.skills?.languages || []).join(' ')} ${(candidate.skills?.frameworks || []).join(' ')} ${(candidate.skills?.databases || []).join(' ')} ${(candidate.skills?.toolsAndInfra || []).join(' ')}`.toLowerCase();
    
    if (/\b(?:financial|finance|accountant|accounting|audit|auditor|budget|tax|cpa|treasur|invest|portfolio|fp&a|banking)\b/i.test(text)) return 'finance';
    if (/\b(?:recruitment|recruiter|talent acquisition|talent partner|hr|human resources|onboarding|hiring|hrbp|hris|talent)\b/i.test(text)) return 'hr';
    if (/\b(?:marketing|brand|seo|sem|growth|content strategist|copywriter|social media|advertising|pr specialist)\b/i.test(text)) return 'marketing';
    if (/\b(?:sales|account executive|business development|client relations|revenue officer|sales director)\b/i.test(text)) return 'sales';
    if (/\b(?:nurse|registered nurse|patient|clinical|healthcare|doctor|physician|hospital|triage|medical|pharmac)\b/i.test(text)) return 'healthcare';
    if (/\b(?:legal|attorney|counsel|lawyer|compliance|litigation|paralegal|law)\b/i.test(text)) return 'legal';
    if (/\b(?:teacher|educat|school|curriculum|student|professor|instructor|pedagog|faculty)\b/i.test(text)) return 'education';
    if (/\b(?:software|developer|engineer|devops|backend|frontend|full-stack|architect|programmer|data scientist|ai engineer|sre)\b/i.test(text)) return 'tech';
    return 'general';
  }

  /**
   * Generates the next adaptive question based on resume claims, candidate profession, and conversation history.
   * Truly assesses and adapts to the candidate's exact verbal responses and field of expertise.
   */
  public static generateNextQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number
  ): DynamicQuestionResult {
    const claims = candidate.claims || [];
    const maxTurns = config.durationMinutes <= 5 ? 4 : config.durationMinutes <= 15 ? 7 : 10;
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');
    const domain = this.detectDomain(candidate);

    // Check if session completed
    if (candidateAnswers.length >= maxTurns || claims.length === 0) {
      return {
        question: `Thank you, ${candidate.name.split(' ')[0]}. That completes our in-depth interview across your key career achievements. I've recorded and cross-referenced your answers against our professional competency rubric. Generating your evaluation report now.`,
        anchoredClaimId: claims[0]?.id || 'claim-end',
        claimDepthLevel: currentClaimDepth,
        investigationContext: 'Professional Assessment Concluded',
        detectedEntities: [],
        isSessionComplete: true
      };
    }

    const activeClaim = claims[currentClaimIndex % claims.length] || claims[0];
    const lastTurn = history.length > 0 ? history[history.length - 1] : null;
    const lastCandidateAnswer = lastTurn?.speaker === 'candidate' ? lastTurn.text : '';

    // If it's the very first question of the interview
    if (history.length === 0 || !lastCandidateAnswer) {
      const firstQ = this.generateInceptionQuestion(activeClaim, candidate, config, domain);
      return {
        question: firstQ,
        anchoredClaimId: activeClaim.id,
        claimDepthLevel: 1,
        investigationContext: `Investigating Claim: "${activeClaim.rawClaim}"`,
        detectedEntities: this.extractEntities(activeClaim.rawClaim),
        isSessionComplete: false
      };
    }

    // Perform deep semantic analysis on candidate's actual answer
    const analysis = this.analyzeCandidateResponse(lastCandidateAnswer, activeClaim);

    let nextQuestion = '';
    let nextDepth = currentClaimDepth + 1;
    let nextClaimIdx = currentClaimIndex;
    let investigationNote = '';

    // Branch 1: Candidate indicated they don't know, wasn't their responsibility, or dodged
    if (analysis.intent === 'unfamiliar_or_dodged') {
      investigationNote = `Assessed: Candidate noted lack of direct ownership on previous probe. Pivoting to alternate initiative.`;
      if (claims.length > 1 && currentClaimIndex < claims.length - 1) {
        nextClaimIdx = currentClaimIndex + 1;
        const nextClaim = claims[nextClaimIdx];
        nextDepth = 1;
        nextQuestion = `Understood, thanks for clarifying that this wasn't within your primary scope. Let's redirect our focus to another significant achievement from your background: "${nextClaim.rawClaim}". What was your direct ownership and contribution on that initiative?`;
      } else {
        nextQuestion = `Fair enough. In that case, for the parts of ${activeClaim.contextProject || 'this initiative'} that you did directly lead, what was the most significant professional challenge or decision you personally navigated?`;
      }
    }
    // Branch 2: Candidate asked a clarification question or asked for direction
    else if (analysis.intent === 'clarification_or_question') {
      investigationNote = `Assessed: Candidate asked for clarification. Guiding with concrete scope.`;
      nextQuestion = `Good question. Specifically, I'm exploring your decision-making and operational methodology regarding "${activeClaim.rawClaim}". Walk me through the core framework you adopted and how you managed key stakeholder requirements.`;
      nextDepth = currentClaimDepth;
    }
    // Branch 3: Candidate gave a superficial or very short answer (<12 words, zero specifics)
    else if (analysis.intent === 'superficial') {
      investigationNote = `Assessed: Response was high-level. Probing for concrete operational specifics.`;
      const quotedSnippet = lastCandidateAnswer.length > 40 ? `"${lastCandidateAnswer.slice(0, 38)}..."` : `"${lastCandidateAnswer}"`;
      nextQuestion = `You mentioned ${quotedSnippet}, but that's still quite high-level. As a ${config.seniority} ${config.roleTitle}, could you dive into the concrete implementation? Specifically, what processes, tools, or quantifiable parameters guided your execution?`;
      nextDepth = Math.max(1, currentClaimDepth);
    }
    // Branch 4: Deep or Standard Answer with specific domain terms & choices
    else {
      const topEntities = analysis.entities;
      const firstEntity = topEntities[0];
      const secondEntity = topEntities[1];

      if (currentClaimDepth === 1) {
        // Drilled from Level 1 (Role/Ownership) -> Level 2 (Decision Rationale & Methodology)
        if (firstEntity && secondEntity) {
          nextQuestion = `You highlighted utilizing ${firstEntity} alongside ${secondEntity}. What strategic considerations led you to adopt ${firstEntity} for this specific initiative, and how did they complement each other in practice?`;
          investigationNote = `Assessed: Candidate identified ${firstEntity} & ${secondEntity}. Probing methodology rationale.`;
        } else if (firstEntity) {
          nextQuestion = `You mentioned incorporating ${firstEntity} into this work. What specific constraints or project requirements drove that choice, and how did you measure its effectiveness?`;
          investigationNote = `Assessed: Candidate cited ${firstEntity}. Probing implementation approach.`;
        } else if (analysis.keyPhrases.length > 0) {
          const phrase = analysis.keyPhrases[0];
          nextQuestion = `You noted that you handled ${phrase}. How did you approach quality assurance, risk management, and team alignment during that phase?`;
          investigationNote = `Assessed: Probing execution rigor for ${phrase}.`;
        } else {
          nextQuestion = `Based on your stated ownership, what were the primary principles, workflow structures, and standards you established for this deliverable?`;
          investigationNote = `Assessed: Probing operational standards and structure.`;
        }
      } else if (currentClaimDepth === 2) {
        // Drilled from Level 2 (Methodology) -> Level 3 (Real-World Stress Testing, Edge Cases & Measurable Outcomes)
        if (domain === 'finance') {
          nextQuestion = `When financial assumptions or market variables shifted unexpectedly, how did you perform variance analysis and stress-test the model to maintain budget integrity?`;
          investigationNote = `Assessed: Probing financial model resilience and variance handling.`;
        } else if (domain === 'hr') {
          nextQuestion = `When faced with aggressive hiring deadlines or candidate drop-offs, what adjustments did you make to your sourcing pipeline and stakeholder communication to protect time-to-fill metrics?`;
          investigationNote = `Assessed: Probing recruitment pipeline resilience and stakeholder management.`;
        } else if (domain === 'marketing') {
          nextQuestion = `If an ad campaign or channel underperformed against projected CAC or conversion targets, what attribution analysis did you run and how quickly did you reallocate spend?`;
          investigationNote = `Assessed: Probing marketing attribution, CAC efficiency, and agile optimization.`;
        } else if (domain === 'sales') {
          nextQuestion = `When a high-value enterprise deal encountered late-stage procurement friction or budget freezes, what negotiation strategy did you employ to salvage conversion?`;
          investigationNote = `Assessed: Probing sales negotiation, objection handling, and pipeline close.`;
        } else if (domain === 'healthcare') {
          nextQuestion = `During high patient census or unexpected critical changes, how did you prioritize triage protocols while maintaining strict clinical compliance and patient safety standards?`;
          investigationNote = `Assessed: Probing clinical triage, protocol compliance, and patient safety.`;
        } else if (domain === 'legal') {
          nextQuestion = `When conflicting regulatory interpretations or tight deadlines arose, how did you balance legal risk mitigation against commercial business priorities?`;
          investigationNote = `Assessed: Probing statutory interpretation, regulatory compliance, and risk appetite.`;
        } else if (domain === 'education') {
          nextQuestion = `When student assessment data revealed diverse learning gaps, how did you differentiate your lesson plans and measure individualized academic progress?`;
          investigationNote = `Assessed: Probing differentiated instruction, formative assessment, and student growth.`;
        } else if (domain === 'tech') {
          if (topEntities.some(e => ['Redis', 'Memcached', 'caching', 'cache'].includes(e))) {
            nextQuestion = `With caching in place, how did you handle cache invalidation, cache stampedes, and TTL synchronization when data mutated rapidly?`;
            investigationNote = `Assessed: Probing cache invalidation & concurrency edge cases.`;
          } else if (topEntities.some(e => ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'SQL', 'database', 'db'].includes(e))) {
            const dbName = topEntities.find(e => ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB'].includes(e)) || 'the database';
            nextQuestion = `When workload scaled toward ${activeClaim.claimedMetrics || 'peak limits'}, what indexing strategies or partitioning did you implement on ${dbName} to prevent performance bottlenecks?`;
            investigationNote = `Assessed: Probing ${dbName} indexing & query performance.`;
          } else {
            nextQuestion = `When concurrent load reached peak capacity, what was the first unexpected bottleneck or degradation you observed, and what was your remediation strategy?`;
            investigationNote = `Assessed: Probing system performance under load.`;
          }
        } else {
          nextQuestion = `When operational conditions or resource constraints became challenging, what was the first unexpected obstacle you encountered, and what was your mitigation plan?`;
          investigationNote = `Assessed: Probing problem solving under real-world constraints.`;
        }
      } else {
        // Transition to next resume claim or Final Retrospective
        if (claims.length > 1 && currentClaimIndex < claims.length - 1) {
          nextClaimIdx = currentClaimIndex + 1;
          const nextClaim = claims[nextClaimIdx];
          nextDepth = 1;
          nextQuestion = `That gives great clarity into your operational execution. Let's move to another key accomplishment on your profile: "${nextClaim.rawClaim}". Could you walk me through the background and your direct leadership responsibilities here?`;
          investigationNote = `Advancing to Claim ${nextClaimIdx + 1}: "${nextClaim.rawClaim.slice(0, 40)}..."`;
        } else {
          nextQuestion = `Looking back at the end-to-end delivery of ${activeClaim.contextProject || 'this initiative'}, knowing what you know now, what is one key strategic decision or methodology you would approach differently today?`;
          investigationNote = `Assessed: Probing career retrospective and self-critique.`;
        }
      }
    }

    return {
      question: nextQuestion,
      anchoredClaimId: claims[nextClaimIdx]?.id || activeClaim.id,
      claimDepthLevel: nextDepth,
      investigationContext: investigationNote || `Investigating: "${claims[nextClaimIdx]?.rawClaim || activeClaim.rawClaim}" (Depth ${nextDepth})`,
      detectedEntities: analysis.entities,
      isSessionComplete: false
    };
  }

  /**
   * Generates Level 1: Inception question directly referencing the resume claim, tailored to domain.
   */
  private static generateInceptionQuestion(
    claim: ResumeClaim,
    candidate: CandidateProfile,
    config: InterviewConfig,
    domain: CandidateDomain
  ): string {
    const candidateName = candidate.name.split(' ')[0];
    const claimText = claim.rawClaim.replace(/\.$/, '');

    if (domain === 'finance') {
      return `Welcome, ${candidateName}. To begin our discussion for the ${config.seniority} ${config.roleTitle} position: on your resume, you noted that you "${claimText}". Could you describe your direct ownership, the financial methodology applied, and the resulting business impact?`;
    }

    if (domain === 'hr') {
      return `Welcome, ${candidateName}. To start exploring your background for the ${config.seniority} ${config.roleTitle} position: you highlighted on your profile that you "${claimText}". Could you walk me through your strategic approach, candidate sourcing channels, and stakeholder coordination?`;
    }

    if (domain === 'marketing') {
      return `Welcome, ${candidateName}. Let's begin our discussion for the ${config.seniority} ${config.roleTitle} role: one standout accomplishment noted is that you "${claimText}". Could you describe your campaign strategy, target audience, and how you tracked measurable outcomes?`;
    }

    if (domain === 'sales') {
      return `Welcome, ${candidateName}. To start our discussion for the ${config.seniority} ${config.roleTitle} role: on your resume, you stated that you "${claimText}". Could you walk me through your sales methodology, pipeline strategy, and how you delivered this outcome?`;
    }

    if (domain === 'healthcare') {
      return `Welcome, ${candidateName}. To start our discussion for the ${config.seniority} ${config.roleTitle} role: on your resume, you noted that you "${claimText}". Could you describe the clinical context, patient care protocols, and interdisciplinary collaboration involved?`;
    }

    if (domain === 'legal') {
      return `Welcome, ${candidateName}. To begin our discussion for the ${config.seniority} ${config.roleTitle} role: you noted on your profile that you "${claimText}". Could you describe your direct role, the regulatory or statutory framework evaluated, and the risk mitigation strategy applied?`;
    }

    if (domain === 'education') {
      return `Welcome, ${candidateName}. To begin our conversation for the ${config.seniority} ${config.roleTitle} role: one key highlight on your profile is that you "${claimText}". Could you walk me through your pedagogical approach, student assessment criteria, and how you measured learning outcomes?`;
    }

    if (domain === 'tech') {
      return `Welcome, ${candidateName}. To start our discussion for the ${config.seniority} ${config.roleTitle} role: on your resume, you noted that you "${claimText}". Could you describe your exact personal ownership in building this, and how you structured the solution boundaries?`;
    }

    return `Hello ${candidateName}, let's begin by discussing one of the key highlights from your professional experience: "${claimText}". What was your specific role, strategic approach, and ownership in delivering this outcome?`;
  }

  /**
   * Multi-industry entity extractor covering Finance, HR, Marketing, Sales, Healthcare, Legal, Education, and Tech
   */
  public static extractEntities(text: string): string[] {
    const detected: string[] = [];
    const domainKeywords = [
      // Finance & Accounting
      'Financial Modeling', 'Financial Analysis', 'Budgeting', 'Forecasting', 'Variance Analysis', 'GAAP', 'IFRS',
      'Internal Controls', 'SOX Compliance', 'Risk Management', 'Tax Accounting', 'Auditing', 'Cash Flow', 'P&L',
      'SAP', 'Oracle Financials', 'NetSuite', 'QuickBooks', 'Xero', 'Hyperion', 'Excel', 'Power BI', 'Tableau', 'Bloomberg',

      // HR & Recruitment
      'Talent Acquisition', 'Full-Cycle Recruitment', 'Sourcing', 'Employee Relations', 'Onboarding', 'Performance Management',
      'Compensation', 'Campus Hiring', 'Lateral Hiring', 'Boolean Search', 'HR Policies', 'Workday', 'BambooHR',
      'Greenhouse', 'Lever', 'Workable', 'ADP', 'HRIS', 'ATS', 'LinkedIn Recruiter', 'Naukri', 'Indeed',

      // Marketing & Sales
      'Digital Marketing', 'Brand Strategy', 'Content Strategy', 'SEO', 'SEM', 'Email Marketing', 'Market Research',
      'Copywriting', 'Social Media', 'Google Analytics', 'HubSpot', 'Salesforce', 'B2B Sales', 'Account Management',
      'Lead Generation', 'Pipeline Management', 'Contract Negotiation', 'CRM',

      // Healthcare & Clinical
      'Patient Care', 'Clinical Assessment', 'Triage', 'Medication Administration', 'HIPAA', 'BLS', 'ACLS',
      'Infection Control', 'Epic', 'Cerner', 'EHR', 'EMR', 'Vital Signs', 'Acute Care',

      // Legal & Compliance
      'Contract Drafting', 'Legal Research', 'Due Diligence', 'Regulatory Compliance', 'Corporate Governance',
      'Litigation', 'Westlaw', 'LexisNexis',

      // Education & Teaching
      'Curriculum Development', 'Lesson Planning', 'Classroom Management', 'Student Assessment',
      'Differentiated Instruction', 'Pedagogy', 'Canvas', 'Blackboard',

      // Information Technology
      'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang', 'Rust', 'Java', 'C++', 'C#', 'SQL',
      'PostgreSQL', 'Postgres', 'Redis', 'MongoDB', 'DynamoDB', 'MySQL', 'Kafka', 'RabbitMQ',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
      'Next.js', 'React', 'Vue', 'Angular', 'FastAPI', 'Express', 'Spring Boot', 'GraphQL', 'REST',
      'CI/CD', 'Git', 'Linux'
    ];

    for (const kw of domainKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text)) {
        detected.push(kw);
      }
    }

    return Array.from(new Set(detected));
  }

  /**
   * Analyzes candidate's response for depth, intent, tone, and professional substance across all fields.
   */
  public static analyzeCandidateResponse(answer: string, claim: ResumeClaim): CandidateResponseAnalysis {
    const cleanAnswer = answer.trim();
    const words = cleanAnswer.split(/\s+/);
    const wordCount = words.length;
    const lower = cleanAnswer.toLowerCase();
    const entities = this.extractEntities(cleanAnswer);

    // Intent detection
    let intent: CandidateResponseAnalysis['intent'] = 'standard';

    const dodgedPhrases = [
      "i don't know", "i dont know", "not sure", "wasn't my responsibility", "wasnt my role",
      "didn't do that", "didnt do that", "someone else", "another team", "no experience with that",
      "i can't remember", "not involved", "was not involved"
    ];
    const isDodged = dodgedPhrases.some(phrase => lower.includes(phrase));

    const isClarification = (lower.endsWith('?') || lower.includes('do you mean') || lower.includes('are you asking')) && wordCount < 20;

    if (isDodged) {
      intent = 'unfamiliar_or_dodged';
    } else if (isClarification) {
      intent = 'clarification_or_question';
    } else if (wordCount < 10 && entities.length === 0) {
      intent = 'superficial';
    } else if (wordCount >= 25 || entities.length >= 2 || /\b(trade-off|variance|retention|conversion|compliance|audit|protocol|curriculum|budget|sla|kpi|latency|throughput)\b/i.test(cleanAnswer)) {
      intent = 'domain_deep';
    }

    // Extract key action phrases
    const keyPhrases: string[] = [];
    const phraseMatches = cleanAnswer.match(/(?:responsible for|designed|built|implemented|handled|focused on|used|selected|migrated|managed|audited|recruited|conducted|negotiated)\s+([a-zA-Z0-9\s,\-_]{3,40})/gi);
    if (phraseMatches) {
      for (const m of phraseMatches.slice(0, 2)) {
        keyPhrases.push(m.trim().replace(/^,\s*/, ''));
      }
    }

    const hasMetrics = /\d+[\s]*(?:ms|users|req|rps|%|gb|tb|k|m|million|thousand|dollars|\$|hires|leads|cases|patients|students)/i.test(cleanAnswer);

    return {
      wordCount,
      entities,
      intent,
      keyPhrases,
      referencedTech: entities,
      hasMetrics,
      sentiment: isDodged ? 'hesitant' : intent === 'domain_deep' ? 'confident' : 'neutral'
    };
  }
}
