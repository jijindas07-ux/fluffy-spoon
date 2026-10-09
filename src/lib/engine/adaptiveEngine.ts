import type { CandidateProfile, ConversationTurn, InterviewConfig, InterviewPlan, InterviewStage, ResumeClaim } from '../types';
import { InterviewPlanner } from './interviewPlanner';
import { QuestionValidator } from './questionValidator';

export interface DynamicQuestionResult {
  question: string;
  stage: InterviewStage;
  anchoredClaimId: string;
  claimDepthLevel: number;
  investigationContext: string;
  detectedEntities: string[];
  isSessionComplete: boolean;
  qualityScore?: number;
  lowConfidenceTriggered?: boolean;
}

export interface CandidateResponseAnalysis {
  wordCount: number;
  entities: string[];
  intent: 'unfamiliar_or_dodged' | 'clarification_or_question' | 'superficial' | 'domain_deep' | 'technical_deep' | 'low_confidence_or_inaudible' | 'standard';
  keyPhrases: string[];
  referencedTech: string[];
  hasMetrics: boolean;
  sentiment: 'confident' | 'hesitant' | 'neutral';
}

export type CandidateDomain = 'finance' | 'hr' | 'marketing' | 'sales' | 'healthcare' | 'legal' | 'education' | 'tech' | 'operations' | 'general';

export class AdaptiveInterviewEngine {
  /**
   * Identifies candidate's primary domain dynamically from their profile
   */
  public static detectDomain(candidate: CandidateProfile): CandidateDomain {
    const text = `${candidate.title || ''} ${candidate.summary || ''} ${(candidate.skills?.languages || []).join(' ')} ${(candidate.skills?.frameworks || []).join(' ')} ${(candidate.skills?.databases || []).join(' ')} ${(candidate.skills?.toolsAndInfra || []).join(' ')}`.toLowerCase();
    
    if (/\b(?:financial|finance|accountant|accounting|audit|auditor|budget|tax|cpa|treasur|invest|portfolio|fp&a|banking)\b/i.test(text)) return 'finance';
    if (/\b(?:recruitment|recruiter|talent acquisition|talent partner|hr|human resources|onboarding|hiring|hrbp|hris|talent)\b/i.test(text)) return 'hr';
    if (/\b(?:marketing|brand|seo|sem|growth|content strategist|copywriter|social media|advertising|pr specialist)\b/i.test(text)) return 'marketing';
    if (/\b(?:sales|account executive|business development|client relations|revenue officer|sales director)\b/i.test(text)) return 'sales';
    if (/\b(?:nurse|registered nurse|patient|clinical|healthcare|doctor|physician|hospital|triage|medical|pharmac)\b/i.test(text)) return 'healthcare';
    if (/\b(?:legal|attorney|counsel|lawyer|compliance|litigation|paralegal|law)\b/i.test(text)) return 'legal';
    if (/\b(?:teacher|educat|school|curriculum|student|professor|instructor|pedagog|faculty)\b/i.test(text)) return 'education';
    if (/\b(?:operations|supply chain|logistics|procurement|inventory|warehouse|lean|six sigma)\b/i.test(text)) return 'operations';
    if (/\b(?:software|developer|engineer|devops|backend|frontend|full-stack|architect|programmer|data scientist|ai engineer|sre)\b/i.test(text)) return 'tech';
    return 'general';
  }

  /**
   * Generates the next adaptive question based on SRS 11-stage state machine,
   * candidate resume evidence, elapsed duration, and previous candidate answers.
   */
  public static generateNextQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    currentStage: InterviewStage = 'INTRO',
    plan?: InterviewPlan,
    elapsedSeconds: number = 0,
    sttConfidence?: number
  ): DynamicQuestionResult {
    const claims = candidate.claims || [];
    const domain = this.detectDomain(candidate);
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');
    const totalSeconds = (config.durationMinutes || 15) * 60;

    // Build or use interview plan (FR-006)
    const activePlan = plan || InterviewPlanner.createInterviewPlan(candidate, config, config.parsedJD);

    // Count turns in current stage
    const turnsInCurrentStage = history.filter(t => t.speaker === 'ai' && (t.stage === currentStage || !t.stage)).length;

    // Determine state transition (SRS State Machine + FR-014 Time Management)
    const stageTransition = InterviewPlanner.getNextStage(
      currentStage,
      activePlan,
      elapsedSeconds,
      totalSeconds,
      turnsInCurrentStage
    );

    const targetStage = stageTransition.nextStage;

    // Check if session completed
    if (targetStage === 'FINALIZING' && stageTransition.isFinalStage && turnsInCurrentStage >= 1) {
      return {
        question: `Thank you, ${candidate.name.split(' ')[0]}. That concludes our comprehensive interview. Your responses, domain evidence, and problem-solving rationale have been securely captured. I am now synthesizing your complete readiness evaluation report.`,
        stage: 'FINALIZING',
        anchoredClaimId: claims[0]?.id || 'claim-end',
        claimDepthLevel: currentClaimDepth,
        investigationContext: 'Interview Concluded • Compiling Evaluation Report',
        detectedEntities: [],
        isSessionComplete: true,
        qualityScore: 100
      };
    }

    const activeClaim = claims[currentClaimIndex % Math.max(1, claims.length)] || {
      id: 'claim-1',
      rawClaim: `${candidate.title} with experience in ${domain} operations`,
      category: 'Domain Expertise',
      contextProject: 'Professional Background',
      claimedMetrics: 'Documented Track Record',
      confidenceLevel: 'High' as const,
      verificationStatus: 'Pending' as const
    };

    const lastTurn = history.length > 0 ? history[history.length - 1] : null;
    const lastCandidateAnswer = lastTurn?.speaker === 'candidate' ? lastTurn.text : '';

    // Handle Low-Confidence STT / Audio Inaudibility (FR-012)
    if (sttConfidence !== undefined && sttConfidence < 0.60 && history.length > 0) {
      return {
        question: `I noticed a slight audio dip or background noise on your last point. Could you please clarify or repeat your key takeaway regarding that specific aspect?`,
        stage: targetStage,
        anchoredClaimId: activeClaim.id,
        claimDepthLevel: currentClaimDepth,
        investigationContext: 'Clarification Triggered • Audio / Speech Low Confidence (FR-012)',
        detectedEntities: [],
        isSessionComplete: false,
        qualityScore: 95,
        lowConfidenceTriggered: true
      };
    }

    // First Turn: INTRO Stage
    if (history.length === 0 || !lastCandidateAnswer) {
      const firstQ = this.generateStageQuestion('INTRO', activeClaim, candidate, config, domain, 1, '');
      const gate = QuestionValidator.validateQuestion(firstQ, history, candidate);

      return {
        question: gate.adjustedQuestion || firstQ,
        stage: 'INTRO',
        anchoredClaimId: activeClaim.id,
        claimDepthLevel: 1,
        investigationContext: `Stage: INTRO • Aligning on ${config.roleTitle} role context`,
        detectedEntities: this.extractEntities(activeClaim.rawClaim),
        isSessionComplete: false,
        qualityScore: gate.score
      };
    }

    // Semantic analysis of candidate's answer
    const analysis = this.analyzeCandidateResponse(lastCandidateAnswer, activeClaim);

    let nextClaimIdx = currentClaimIndex;
    let nextDepth = currentClaimDepth;

    if (targetStage === 'PROJECT_DEEP_DIVE' || targetStage === 'TECHNICAL') {
      if (analysis.intent === 'unfamiliar_or_dodged') {
        if (claims.length > 1 && currentClaimIndex < claims.length - 1) {
          nextClaimIdx = currentClaimIndex + 1;
          nextDepth = 1;
        }
      } else {
        nextDepth = currentClaimDepth + 1;
      }
    }

    const stageClaim = claims[nextClaimIdx % Math.max(1, claims.length)] || activeClaim;
    const rawGeneratedQ = this.generateStageQuestion(
      targetStage,
      stageClaim,
      candidate,
      config,
      domain,
      nextDepth,
      lastCandidateAnswer,
      analysis
    );

    // Apply Quality Gate & Anti-Repetition (FR-008, FR-013)
    const gateResult = QuestionValidator.validateQuestion(rawGeneratedQ, history, candidate);
    const finalQuestion = gateResult.adjustedQuestion || rawGeneratedQ;

    return {
      question: finalQuestion,
      stage: targetStage,
      anchoredClaimId: stageClaim.id,
      claimDepthLevel: nextDepth,
      investigationContext: `Stage: ${targetStage} • ${stageTransition.skipReason ? '[Time Management] ' : ''}Investigating ${stageClaim.rawClaim.slice(0, 45)}...`,
      detectedEntities: analysis.entities,
      isSessionComplete: false,
      qualityScore: gateResult.score
    };
  }

  /**
   * Generates question strictly anchored to the specific SRS Interview Stage & candidate domain.
   */
  private static generateStageQuestion(
    stage: InterviewStage,
    claim: ResumeClaim,
    candidate: CandidateProfile,
    config: InterviewConfig,
    domain: CandidateDomain,
    depth: number,
    lastAnswer: string,
    analysis?: CandidateResponseAnalysis
  ): string {
    const candidateFirstName = candidate.name.split(' ')[0];
    const claimClean = claim.rawClaim.replace(/\.$/, '');
    const keywords = candidate.extractedKeywords || [];
    const relevantTool = keywords.find(k => k.category === 'tool_or_technology')?.keyword;
    const relevantMethod = keywords.find(k => k.category === 'methodology_or_standard')?.keyword;
    const relevantMetric = keywords.find(k => k.category === 'measurable_result')?.keyword;
    const relevantResponsibility = keywords.find(k => k.category === 'job_responsibility')?.keyword;

    switch (stage) {
      case 'INTRO': {
        const effectiveRole = config.roleTitle.toLowerCase().startsWith(config.seniority.toLowerCase())
          ? config.roleTitle
          : `${config.seniority} ${config.roleTitle}`;
        const expertiseFocus = keywords.filter(k => k.category === 'core_skill' || k.category === 'domain_expertise').slice(0, 2).map(k => k.keyword).join(' and ');
        return `Hello ${candidateFirstName}, welcome to our interview for the ${effectiveRole} position. To start, could you give a high-level overview of your background${expertiseFocus ? `, particularly your experience in ${expertiseFocus}` : ''}, and how your core capabilities align with this role?`;
      }

      case 'RESUME_DISCUSSION': {
        if (relevantResponsibility && depth > 1) {
          return `Looking at your experience, you noted your role in ${relevantResponsibility}. Could you walk me through the strategic context, the key stakeholders involved, and your primary ownership in that initiative?`;
        }
        return `Looking at your professional trajectory, you've highlighted your work as a ${candidate.title}. On your resume, you specifically noted that you "${claimClean}". Could you walk me through the strategic context and your primary ownership in that role?`;
      }

      case 'TECHNICAL': {
        const methodOrTool = relevantMethod || relevantTool;
        if (domain === 'finance') {
          return `In terms of financial methodologies and reporting rigor: when building forecasting models or variance frameworks${methodOrTool ? ` utilizing ${methodOrTool}` : ''} for ${claim.contextProject || 'major initiatives'}, what key accounting principles and modeling safeguards do you establish?`;
        }
        if (domain === 'hr') {
          return `Regarding your talent acquisition and HR operational framework: what sourcing channels, interview evaluation rubrics, and ATS workflows${relevantTool ? ` (such as ${relevantTool})` : ''} have you found most effective when hiring for high-demand talent?`;
        }
        if (domain === 'marketing') {
          return `From a marketing and growth perspective: what attribution models, analytics tools${relevantTool ? ` like ${relevantTool}` : ''}, and conversion benchmarks did you rely upon when executing campaigns for ${claim.contextProject || 'your recent initiatives'}?`;
        }
        if (domain === 'sales') {
          return `Regarding sales execution and deal velocity: what structured qualification framework${relevantMethod ? ` such as ${relevantMethod}` : ' (such as MEDDIC or BANT)'} do you apply when managing enterprise sales cycles from discovery to contract execution?`;
        }
        if (domain === 'healthcare') {
          return `In terms of clinical protocol compliance and patient management: what standard assessment protocols${relevantMethod ? ` including ${relevantMethod}` : ''} and safety guidelines do you enforce during high-acuity patient handoffs?`;
        }
        if (domain === 'legal') {
          return `Regarding legal risk analysis and compliance: how do you structure statutory due diligence and contract negotiation to protect the organization while supporting commercial business objectives?`;
        }
        if (domain === 'education') {
          return `From an instructional and pedagogical standpoint: how do you design differentiated lesson structures and align formative assessments with institutional learning standards?`;
        }
        if (domain === 'tech') {
          return `From a technical architecture standpoint: how did you design the system boundaries, data contracts, and reliability guarantees${relevantTool ? ` with ${relevantTool}` : ''} for ${claim.contextProject || 'this architecture'}?`;
        }
        return `Regarding core operational competencies: what specific methodologies, standards, and management tools do you implement to ensure consistent execution quality?`;
      }

      case 'PROJECT_DEEP_DIVE': {
        if (depth <= 1) {
          return `Let's drill into the specific claim: "${claimClean}". What was the initial baseline problem, what was your direct individual contribution, and what quantifiable outcomes were delivered?`;
        } else if (depth === 2) {
          const topEntity = analysis?.entities[0] || relevantTool || relevantMethod || 'the core methodology';
          return `You mentioned applying ${topEntity} to solve this. What trade-offs or alternative approaches did you evaluate before settling on that approach, and how did you validate its success?`;
        } else {
          return `When unexpected constraints or performance anomalies occurred during the execution of ${claim.contextProject || 'this project'}, what was the most difficult roadblock you diagnosed, and how did you resolve it?`;
        }
      }

      case 'PROBLEM_SOLVING': {
        if (domain === 'finance') {
          return `Suppose an unforeseen macroeconomic shift or cash-flow shortfall forces an immediate 20% budget reallocation mid-quarter. Walk me through your prioritized methodology for stress-testing line items and communicating with department heads.`;
        }
        if (domain === 'hr') {
          return `Suppose critical hiring managers are experiencing an 80% candidate decline rate due to misaligned compensation expectations. How would you diagnose the root cause and align senior leadership on a revised strategy?`;
        }
        if (domain === 'marketing') {
          return `If your primary customer acquisition channel sees an unexpected 40% jump in CAC while conversion drops, what immediate diagnostic steps and budget reallocations would you execute within the first 48 hours?`;
        }
        if (domain === 'sales') {
          return `Imagine an enterprise prospect attempts to cancel a nearly-closed annual contract citing sudden CFO procurement freezes. Walk me through how you would re-frame the ROI and structure a salvage proposal.`;
        }
        if (domain === 'healthcare') {
          return `If your department suddenly experiences an unexpected surge in high-acuity admissions alongside critical staffing shortages, how do you prioritize patient safety protocols and escalate resource needs?`;
        }
        if (domain === 'tech') {
          return `If a critical production service begins throwing cascading 504 gateway timeouts under peak traffic, walk me through your systematic root-cause isolation and recovery procedure.`;
        }
        return `Suppose a major project you are leading faces an unexpected 30% reduction in timeline alongside conflicting stakeholder demands. How do you re-prioritize deliverables and manage risk?`;
      }

      case 'BEHAVIORAL_HR': {
        return `Tell me about a time when you had a fundamental disagreement with a senior stakeholder or peer regarding a major decision. How did you navigate the conversation, provide objective evidence, and achieve alignment?`;
      }

      case 'CANDIDATE_QUESTIONS': {
        return `We're approaching the final part of our interview. Do you have any questions for me regarding the team, operational expectations, or the scope of the ${config.roleTitle} role?`;
      }

      case 'FINALIZING': {
        return `Thank you for sharing your comprehensive experience today, ${candidateFirstName}. We have completed all required interview dimensions. Generating your detailed evaluation report now.`;
      }

      default: {
        return `Could you expand on how you applied your skills in ${domain} to achieve your stated project milestones?`;
      }
    }
  }

  /**
   * Multi-industry entity extractor covering all domain keywords
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
      'Greenhouse', 'Lever', 'Workable', 'ADP', 'HRIS', 'ATS', 'LinkedIn Recruiter',

      // Marketing & Sales
      'Digital Marketing', 'Brand Strategy', 'Content Strategy', 'SEO', 'SEM', 'Email Marketing', 'Market Research',
      'Copywriting', 'Social Media', 'Google Analytics', 'HubSpot', 'Salesforce', 'B2B Sales', 'Account Management',
      'Lead Generation', 'Pipeline Management', 'Contract Negotiation', 'CRM', 'MEDDIC', 'BANT',

      // Healthcare & Clinical
      'Patient Care', 'Clinical Assessment', 'Triage', 'Medication Administration', 'HIPAA', 'BLS', 'ACLS',
      'Infection Control', 'Epic', 'Cerner', 'EHR', 'EMR', 'Vital Signs', 'Acute Care',

      // Operations & Supply Chain
      'Supply Chain', 'Logistics', 'Procurement', 'Inventory Management', 'Lean Six Sigma', 'Kaizen', 'Vendor Management', 'SLA',

      // Legal & Compliance
      'Contract Drafting', 'Legal Research', 'Due Diligence', 'Regulatory Compliance', 'Corporate Governance', 'Litigation',

      // Education & Teaching
      'Curriculum Development', 'Lesson Planning', 'Classroom Management', 'Student Assessment', 'Differentiated Instruction', 'Pedagogy',

      // Information Technology
      'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang', 'Rust', 'Java', 'C++', 'C#', 'SQL',
      'PostgreSQL', 'Postgres', 'Redis', 'MongoDB', 'DynamoDB', 'MySQL', 'Kafka', 'RabbitMQ',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Next.js', 'React', 'Vue', 'FastAPI', 'CI/CD'
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
