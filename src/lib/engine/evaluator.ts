import { CandidateProfile, ConversationTurn, EvaluationReport, EvidenceItem, InterviewConfig } from '../types';
import { AdaptiveInterviewEngine } from './adaptiveEngine';

export class InterviewEvaluator {
  /**
   * Generates a comprehensive, evidence-based candidate evaluation report
   * based on the exact conversation transcript.
   */
  public static generateEvaluation(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string
  ): EvaluationReport {
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');
    const totalWords = candidateAnswers.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0);
    const avgWordsPerAnswer = candidateAnswers.length > 0 ? Math.round(totalWords / candidateAnswers.length) : 0;
    
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
          reasoning = 'Candidate indicated lack of direct ownership or uncertainty regarding this specific implementation detail.';
        } else if (analysis.intent === 'technical_deep' && analysis.entities.length >= 1) {
          verdict = 'Strong Validation';
          reasoning = `Demonstrated hands-on technical command, specifically detailing ${analysis.entities.join(', ')} with concrete engineering reasoning.`;
        } else if (analysis.intent === 'superficial') {
          verdict = 'Superficial / Vague';
          reasoning = 'Response was high-level and lacked concrete technical trade-off justification or architecture specifics.';
        } else {
          verdict = 'Moderate Evidence';
          reasoning = `Provided sensible operational context for ${claim.contextProject || 'the service'}, demonstrating practical working familiarity.`;
        }

        evidenceItems.push({
          id: `ev-${i + 1}`,
          claimId: claim.id,
          claimAssertion: claim.rawClaim,
          candidateQuote: `"${relevantTurn.text.trim()}"`,
          assessmentVerdict: verdict,
          reasoning
        });
      }
    }

    // Score calculations
    const strongValidations = evidenceItems.filter(e => e.assessmentVerdict === 'Strong Validation').length;
    const vagueCount = evidenceItems.filter(e => e.assessmentVerdict === 'Superficial / Vague').length;
    const totalResponses = candidateAnswers.length;

    // Technical Competency (50-98)
    const techScore = Math.min(98, Math.max(50, 70 + (strongValidations * 10) - (vagueCount * 8)));
    // Problem Solving (50-96)
    const problemSolvingScore = Math.min(96, Math.max(52, 72 + (avgWordsPerAnswer > 25 ? 8 : -4) + (strongValidations * 6)));
    // Communication (50-96)
    const communicationScore = Math.min(96, Math.max(55, avgWordsPerAnswer >= 15 && avgWordsPerAnswer <= 90 ? 88 : avgWordsPerAnswer < 10 ? 62 : 78));
    // Experience Depth (50-98)
    const depthScore = Math.min(98, Math.max(48, 68 + (strongValidations * 11) - (vagueCount * 10)));
    // Resume Credibility (50-98)
    const credibilityScore = Math.min(98, Math.max(45, 75 + (strongValidations * 10) - (vagueCount * 14)));

    const overallScore = Math.round(
      (techScore * 0.3) +
      (problemSolvingScore * 0.2) +
      (communicationScore * 0.15) +
      (depthScore * 0.2) +
      (credibilityScore * 0.15)
    );

    let recommendation: EvaluationReport['recommendation'] = 'Hire';
    if (overallScore >= 88) recommendation = 'Strong Hire';
    else if (overallScore >= 77) recommendation = 'Hire';
    else if (overallScore >= 68) recommendation = 'Leaning Hire';
    else if (overallScore >= 58) recommendation = 'Needs Follow-Up';
    else recommendation = 'Do Not Hire';

    // Find first strong and vague answers for authentic quotes
    const strongAnswer = evidenceItems.find(e => e.assessmentVerdict === 'Strong Validation');
    const vagueAnswer = evidenceItems.find(e => e.assessmentVerdict === 'Superficial / Vague');

    const primaryStrengthQuote = strongAnswer?.candidateQuote || candidateAnswers[0]?.text ? `"${candidateAnswers[0]?.text}"` : '"Demonstrated clear technical domain context."';
    const primaryWeaknessQuote = vagueAnswer?.candidateQuote || (candidateAnswers.length > 1 ? `"${candidateAnswers[candidateAnswers.length - 1]?.text}"` : 'N/A');

    return {
      id: `rep-${Date.now()}`,
      sessionId,
      candidateName: candidate.name,
      targetRole: config.roleTitle,
      seniority: config.seniority,
      completedAt: new Date().toISOString(),
      durationMinutesSpent: config.durationMinutes,
      totalTurns: history.length,
      overallScore,
      recommendation,
      executiveSummary: `${candidate.name} completed an adaptive technical probe for the ${config.seniority} ${config.roleTitle} profile across ${totalResponses} conversational turns. ${
        strongValidations >= 2
          ? 'The candidate exhibited authentic, hands-on architectural competence, articulating clear trade-offs and concrete tool selections.'
          : vagueCount >= 2
          ? 'While the candidate demonstrated foundational knowledge, several key claims lacked granular architectural evidence and failure mode trade-off depth.'
          : 'The candidate demonstrated solid baseline familiarity with core systems, providing reasonable context on their direct responsibilities.'
      }`,
      dimensions: {
        technicalCompetency: {
          score: techScore,
          label: 'Technical Competency',
          summary: `Evaluates domain proficiency across architecture, persistence, and service boundaries.`,
          evidenceQuotes: candidateAnswers.slice(0, 2).map(t => `"${t.text}"`)
        },
        problemSolving: {
          score: problemSolvingScore,
          label: 'Problem Solving & Trade-offs',
          summary: `Assessment of decision-making under scaling constraints and traffic bottlenecks.`,
          evidenceQuotes: candidateAnswers.slice(1, 2).map(t => `"${t.text}"`).filter(Boolean)
        },
        communication: {
          score: communicationScore,
          label: 'Communication & Conciseness',
          summary: `Clarity, brevity, and technical articulation during live probing.`,
          evidenceQuotes: candidateAnswers.slice(0, 1).map(t => `"${t.text}"`)
        },
        experienceDepth: {
          score: depthScore,
          label: 'Experience Depth',
          summary: `Verification of direct hands-on ownership versus high-level team participation.`,
          evidenceQuotes: evidenceItems.map(e => `${e.claimAssertion}: ${e.assessmentVerdict}`).slice(0, 2)
        },
        resumeCredibility: {
          score: credibilityScore,
          label: 'Resume Claim Credibility',
          summary: `Alignment between documented achievements and live technical verification.`,
          evidenceQuotes: evidenceItems.map(e => `${e.claimAssertion}: ${e.assessmentVerdict}`)
        }
      },
      strengths: [
        {
          title: strongValidations > 0 ? 'Verified Technical Ownership' : 'Articulate Domain Understanding',
          description: strongValidations > 0
            ? 'Demonstrated authentic hands-on grasp of implementation details, citing concrete technologies and design decisions.'
            : 'Communicated high-level system responsibilities clearly throughout the interview.',
          quote: primaryStrengthQuote
        }
      ],
      weaknesses: [
        {
          title: vagueCount > 0 ? 'Superficial Claim Verification' : 'Edge-Case Architecture Drill-down',
          description: vagueCount > 0
            ? 'Candidate gave high-level or hesitant responses when probed on granular failure modes and concurrency mechanics.'
            : 'Could provide deeper quantitative telemetry metrics regarding incident post-mortems.',
          quote: primaryWeaknessQuote
        }
      ],
      verificationAreas: [
        {
          area: 'Deep Concurrency & Isolation Levels',
          issueFound: 'Probe distributed locking and transactional isolation boundaries in follow-up whiteboard round.',
          suggestedOnsiteQuestion: 'How would you ensure idempotency and prevent race conditions across distributed microservices?'
        }
      ],
      evidenceItems
    };
  }
}
