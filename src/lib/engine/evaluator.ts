import type { CandidateProfile, ConversationTurn, EvaluationReport, EvidenceItem, InterviewConfig, SkillAssessment } from '../types';
import { AdaptiveInterviewEngine } from './adaptiveEngine';

export class InterviewEvaluator {
  /**
   * Generates a comprehensive, evidence-based candidate evaluation report
   * based on the exact conversation transcript, versioned rubrics (FR-011),
   * and candidate's specific field (FR-015).
   */
  public static generateEvaluation(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    reportVersion: number = 1
  ): EvaluationReport {
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');
    const totalWords = candidateAnswers.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0);
    const avgWordsPerAnswer = candidateAnswers.length > 0 ? Math.round(totalWords / candidateAnswers.length) : 0;
    const domain = AdaptiveInterviewEngine.detectDomain(candidate);
    
    // Analyze evidence per claim
    const evidenceItems: EvidenceItem[] = [];
    const claims = candidate.claims || [];

    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const turnsForClaim = history.filter(t => t.speaker === 'candidate' && (t.anchoredClaimId === claim.id || !t.anchoredClaimId));
      const relevantTurn = turnsForClaim[i] || candidateAnswers[i] || candidateAnswers[0];

      if (relevantTurn) {
        const analysis = AdaptiveInterviewEngine.analyzeCandidateResponse(relevantTurn.text, claim);

        let verdict: EvidenceItem['assessmentVerdict'] = 'Moderate Evidence';
        let reasoning = 'Candidate provided context with reasonable familiarity.';

        if (analysis.intent === 'unfamiliar_or_dodged') {
          verdict = 'Superficial / Vague';
          reasoning = 'Candidate indicated lack of direct ownership or uncertainty regarding this specific deliverable.';
        } else if ((analysis.intent === 'domain_deep' || analysis.intent === 'technical_deep') && analysis.entities.length >= 1) {
          verdict = 'Strong Validation';
          reasoning = `Demonstrated authoritative domain command, specifically detailing ${analysis.entities.join(', ')} with concrete professional reasoning.`;
        } else if (analysis.intent === 'superficial') {
          verdict = 'Superficial / Vague';
          reasoning = 'Response was high-level and lacked concrete operational specifics or decision rationale.';
        } else {
          verdict = 'Moderate Evidence';
          reasoning = `Provided sensible operational context for ${claim.contextProject || 'this initiative'}, demonstrating authentic working familiarity.`;
        }

        evidenceItems.push({
          id: `ev-${i + 1}`,
          claimId: claim.id,
          claimAssertion: claim.rawClaim,
          candidateQuote: `"${relevantTurn.text.trim()}"`,
          assessmentVerdict: verdict,
          reasoning,
          stage: relevantTurn.stage
        });
      }
    }

    // Score calculations
    const strongValidations = evidenceItems.filter(e => e.assessmentVerdict === 'Strong Validation').length;
    const vagueCount = evidenceItems.filter(e => e.assessmentVerdict === 'Superficial / Vague').length;
    const totalResponses = candidateAnswers.length;

    // Role Competency (50-98)
    const roleScore = Math.min(98, Math.max(50, 70 + (strongValidations * 10) - (vagueCount * 8)));
    // Problem Solving (50-96)
    const problemSolvingScore = Math.min(96, Math.max(52, 72 + (avgWordsPerAnswer > 25 ? 8 : -4) + (strongValidations * 6)));
    // Communication (50-96)
    const communicationScore = Math.min(96, Math.max(55, avgWordsPerAnswer >= 15 && avgWordsPerAnswer <= 90 ? 88 : avgWordsPerAnswer < 10 ? 62 : 78));
    // Experience Depth (50-98)
    const depthScore = Math.min(98, Math.max(48, 68 + (strongValidations * 11) - (vagueCount * 10)));
    // Resume Credibility (50-98)
    const credibilityScore = Math.min(98, Math.max(45, 75 + (strongValidations * 10) - (vagueCount * 14)));

    const overallScore = Math.round(
      (roleScore * 0.3) +
      (problemSolvingScore * 0.2) +
      (communicationScore * 0.15) +
      (depthScore * 0.2) +
      (credibilityScore * 0.15)
    );

    // Role Readiness (FR-015)
    let roleReadiness: EvaluationReport['roleReadiness'] = 'Ready with Minor Onboarding';
    let recommendation: EvaluationReport['recommendation'] = 'Hire';

    if (overallScore >= 88) {
      roleReadiness = 'Immediate Match';
      recommendation = 'Strong Hire';
    } else if (overallScore >= 77) {
      roleReadiness = 'Ready with Minor Onboarding';
      recommendation = 'Hire';
    } else if (overallScore >= 68) {
      roleReadiness = 'Needs Targeted Upskilling';
      recommendation = 'Leaning Hire';
    } else if (overallScore >= 58) {
      roleReadiness = 'Needs Targeted Upskilling';
      recommendation = 'Needs Follow-Up';
    } else {
      roleReadiness = 'Not Currently Ready';
      recommendation = 'Do Not Hire';
    }

    // Granular Skill Assessments (FR-011 / Database skill_assessments)
    const skillAssessments: SkillAssessment[] = [
      {
        skill: `${config.roleTitle} Domain Standards`,
        category: 'Core Competency',
        score: roleScore,
        confidence: 90,
        evidenceQuotes: candidateAnswers.slice(0, 2).map(a => `"${a.text.slice(0, 120)}..."`),
        gapIdentified: roleScore < 75 ? 'Requires deeper alignment on industry-standard tooling & SLAs' : undefined
      },
      {
        skill: 'Applied Problem Solving & Edge Cases',
        category: 'Methodology',
        score: problemSolvingScore,
        confidence: 85,
        evidenceQuotes: candidateAnswers.slice(1, 3).map(a => `"${a.text.slice(0, 120)}..."`),
        gapIdentified: problemSolvingScore < 75 ? 'Practice structured decision frameworks under ambiguity' : undefined
      },
      {
        skill: 'Professional Articulation & Conciseness',
        category: 'Communication',
        score: communicationScore,
        confidence: 92,
        evidenceQuotes: candidateAnswers.slice(0, 1).map(a => `"${a.text.slice(0, 120)}..."`),
        gapIdentified: communicationScore < 70 ? 'Include more quantifiable metrics when presenting results' : undefined
      },
      {
        skill: 'Documented Initiative Ownership',
        category: 'Authenticity',
        score: credibilityScore,
        confidence: 88,
        evidenceQuotes: evidenceItems.map(e => `${e.claimAssertion.slice(0, 50)}...: ${e.assessmentVerdict}`),
        gapIdentified: credibilityScore < 75 ? 'Be prepared to explain trade-offs and alternative solutions considered' : undefined
      }
    ];

    // Find first strong and vague answers for authentic quotes
    const strongAnswer = evidenceItems.find(e => e.assessmentVerdict === 'Strong Validation');
    const vagueAnswer = evidenceItems.find(e => e.assessmentVerdict === 'Superficial / Vague');

    const primaryStrengthQuote = strongAnswer?.candidateQuote || (candidateAnswers[0]?.text ? `"${candidateAnswers[0].text}"` : '"Demonstrated clear domain context and professional experience."');
    const primaryWeaknessQuote = vagueAnswer?.candidateQuote || (candidateAnswers.length > 1 ? `"${candidateAnswers[candidateAnswers.length - 1].text}"` : 'N/A');

    // Dynamic verification area based on domain
    let verificationTopic = 'Strategic Trade-offs & Execution Depth';
    let verificationIssue = 'Probe decision rationale and operational boundaries in follow-up interview.';
    let verificationQuestion = 'Walk me through a major decision you had to make with incomplete information and how you managed the trade-offs.';

    if (domain === 'finance') {
      verificationTopic = 'Financial Modeling & Variance Analysis';
      verificationIssue = 'Deepen inquiry into audit controls, assumptions testing, and capital allocation.';
      verificationQuestion = 'How do you stress-test financial projections against unforeseen macroeconomic or cash-flow shocks?';
    } else if (domain === 'hr') {
      verificationTopic = 'Recruitment Pipeline & Retention Strategy';
      verificationIssue = 'Verify candidate sourcing channels, employer branding impact, and stakeholder SLA management.';
      verificationQuestion = 'What structured methods do you use to diagnose and fix drop-offs in your hiring funnel?';
    } else if (domain === 'marketing') {
      verificationTopic = 'Campaign Attribution & CAC Efficiency';
      verificationIssue = 'Examine multi-touch attribution modeling and budget optimization across paid vs organic channels.';
      verificationQuestion = 'When customer acquisition cost increases unexpectedly, how do you diagnose channel saturation versus creative fatigue?';
    } else if (domain === 'sales') {
      verificationTopic = 'Enterprise Deal Velocity & Negotiation';
      verificationIssue = 'Probe sales cycle acceleration and handling competitive vendor displacement.';
      verificationQuestion = 'How do you navigate multi-stakeholder procurement objections when defending premium pricing?';
    } else if (domain === 'healthcare') {
      verificationTopic = 'Clinical Protocols & Quality Compliance';
      verificationIssue = 'Verify critical care escalation protocols and interdisciplinary handoff procedures.';
      verificationQuestion = 'How do you maintain strict patient care standards and HIPAA compliance during high-census crisis surges?';
    } else if (domain === 'legal') {
      verificationTopic = 'Regulatory Risk & Contractual Indemnity';
      verificationIssue = 'Probe statutory interpretation nuances and balancing risk avoidance against commercial timelines.';
      verificationQuestion = 'How do you structure indemnification and liability caps to balance business deal closure with enterprise protection?';
    } else if (domain === 'education') {
      verificationTopic = 'Differentiated Pedagogy & Student Outcomes';
      verificationIssue = 'Assess formative evaluation strategies and curriculum adaptation for diverse learning profiles.';
      verificationQuestion = 'How do you utilize ongoing assessment data to adapt curriculum pacing for struggling versus accelerated students?';
    } else if (domain === 'tech') {
      verificationTopic = 'System Architecture & Concurrency';
      verificationIssue = 'Probe failure mode handling, data consistency boundaries, and caching invalidation.';
      verificationQuestion = 'How would you ensure idempotency and prevent race conditions across high-throughput services?';
    }

    const reportDimensions = {
      technicalCompetency: {
        score: roleScore,
        label: 'Role & Domain Competency',
        summary: `Evaluates domain proficiency, methodologies, and execution standards required for the ${config.roleTitle} role.`,
        evidenceQuotes: candidateAnswers.slice(0, 2).map(t => `"${t.text}"`)
      },
      problemSolving: {
        score: problemSolvingScore,
        label: 'Problem Solving & Trade-offs',
        summary: `Assessment of decision-making under operational constraints, competing priorities, and edge cases.`,
        evidenceQuotes: candidateAnswers.slice(1, 2).map(t => `"${t.text}"`).filter(Boolean)
      },
      communication: {
        score: communicationScore,
        label: 'Communication & Conciseness',
        summary: `Clarity, structure, and professional articulation during live probing.`,
        evidenceQuotes: candidateAnswers.slice(0, 1).map(t => `"${t.text}"`)
      },
      experienceDepth: {
        score: depthScore,
        label: 'Experience Depth',
        summary: `Verification of direct hands-on initiative ownership versus passive participation.`,
        evidenceQuotes: evidenceItems.map(e => `${e.claimAssertion}: ${e.assessmentVerdict}`).slice(0, 2)
      },
      resumeCredibility: {
        score: credibilityScore,
        label: 'Resume Claim Credibility',
        summary: `Alignment between documented achievements and live professional verification.`,
        evidenceQuotes: evidenceItems.map(e => `${e.claimAssertion}: ${e.assessmentVerdict}`)
      }
    };

    // Market Valuation & Talent Band calculation
    let percentileTier = 'Core Operational Contributor (Tier 3)';
    let estimatedRampUp = 'Standard Onboarding (1-2 Weeks)';
    let leadershipAptitude = 'Independent Contributor';
    const keyHiringDrivers: string[] = [];

    if (overallScore >= 88) {
      percentileTier = 'Top 10% Senior Talent (Tier 1)';
      estimatedRampUp = 'Immediate Day 1 Impact';
      leadershipAptitude = communicationScore >= 85 ? 'High Executive Presence' : 'Strong Domain Leadership';
      keyHiringDrivers.push('Consistently validated documented achievements with concrete outcomes and operational metrics.');
      keyHiringDrivers.push('Demonstrated rigorous decision-making frameworks and clear trade-off analysis.');
      keyHiringDrivers.push('Exhibited deep domain ownership across all evaluated conversational turns.');
    } else if (overallScore >= 77) {
      percentileTier = 'Competitive High Performer (Tier 2)';
      estimatedRampUp = 'Rapid Ramp-Up (1-2 Weeks)';
      leadershipAptitude = communicationScore >= 80 ? 'Strong Team Leadership' : 'Self-Directed Contributor';
      keyHiringDrivers.push('Solid working familiarity across core domain responsibilities and workflows.');
      keyHiringDrivers.push('Demonstrated authentic individual ownership on primary resume claims.');
      keyHiringDrivers.push('Minor onboarding recommended to align on company-specific operating procedures.');
    } else if (overallScore >= 65) {
      percentileTier = 'Core Operational Contributor (Tier 3)';
      estimatedRampUp = 'Guided Onboarding (3-4 Weeks)';
      leadershipAptitude = 'Developing Leadership';
      keyHiringDrivers.push('Baseline domain knowledge established during live interactive probing.');
      keyHiringDrivers.push('Certain complex claims were high-level and benefit from structured team support.');
    } else {
      percentileTier = 'Developing Candidate (Tier 4)';
      estimatedRampUp = 'Structured Upskilling (2+ Months)';
      leadershipAptitude = 'Entry / Developing';
      keyHiringDrivers.push('Responses were predominantly high-level with gaps in operational drill-down.');
      keyHiringDrivers.push('Requires deeper alignment on industry-standard methodologies before independent execution.');
    }

    const marketValuation = {
      percentileTier,
      experienceBandMatch: `${config.seniority} Band (${candidate.experienceYears > 0 ? candidate.experienceYears + '+ Years Exp' : 'Targeted Role Fit'})`,
      estimatedRampUp,
      leadershipAptitude,
      keyHiringDrivers
    };

    return {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      version: reportVersion,
      candidateName: candidate.name,
      targetRole: config.roleTitle,
      seniority: config.seniority,
      completedAt: new Date().toISOString(),
      durationMinutesSpent: config.durationMinutes,
      totalTurns: history.length,
      overallScore,
      roleReadiness,
      recommendation,
      marketValuation,
      executiveSummary: `${candidate.name} completed an adaptive professional competency interview for the ${config.seniority} ${config.roleTitle} profile across ${totalResponses} conversational turns. ${
        strongValidations >= 2
          ? 'The candidate exhibited authentic, hands-on domain competence, articulating clear decision-making rationale, methodology choices, and measurable outcomes.'
          : vagueCount >= 2
          ? 'While the candidate demonstrated foundational knowledge, several key claims lacked granular evidence, operational specifics, and execution depth.'
          : 'The candidate demonstrated solid baseline familiarity with core domain practices, providing reasonable context on their direct responsibilities.'
      }`,
      dimensions: {
        ...reportDimensions,
        roleCompetency: reportDimensions.technicalCompetency
      },
      skillAssessments,
      strengths: [
        {
          title: strongValidations > 0 ? 'Verified Initiative Ownership' : 'Articulate Domain Understanding',
          description: strongValidations > 0
            ? 'Demonstrated authentic hands-on grasp of operational details, citing concrete methodologies and execution decisions.'
            : 'Communicated high-level professional responsibilities clearly throughout the interview.',
          quote: primaryStrengthQuote
        }
      ],
      weaknesses: [
        {
          title: vagueCount > 0 ? 'Superficial Claim Verification' : 'Operational Drill-down Depth',
          description: vagueCount > 0
            ? 'Candidate gave high-level or hesitant responses when probed on granular operational challenges and decision rationales.'
            : 'Could provide deeper quantitative evidence regarding long-term project outcomes.',
          quote: primaryWeaknessQuote
        }
      ],
      verificationAreas: [
        {
          area: verificationTopic,
          issueFound: verificationIssue,
          suggestedOnsiteQuestion: verificationQuestion
        }
      ],
      evidenceItems
    };
  }
}
