import { CandidateProfile, InterviewConfig, InterviewPlan, InterviewStage, JobDescription, StagePlan } from '../types';

export const SRS_STAGE_SEQUENCE: InterviewStage[] = [
  'INTRO',
  'RESUME_DISCUSSION',
  'TECHNICAL',
  'PROJECT_DEEP_DIVE',
  'PROBLEM_SOLVING',
  'BEHAVIORAL_HR',
  'CANDIDATE_QUESTIONS',
  'FINALIZING'
];

export class InterviewPlanner {
  /**
   * Generates a bounded, timed interview plan according to SRS FR-006 & FR-014.
   */
  public static createInterviewPlan(
    candidate: CandidateProfile,
    config: InterviewConfig,
    parsedJD?: JobDescription
  ): InterviewPlan {
    const totalMinutes = config.durationMinutes || 15;
    const isRetake = Boolean(config.retakeOfSessionId);
    const targetedTopics = config.targetedTopics || [];

    // Allocate minute budgets and turn budgets per stage
    let stages: StagePlan[] = [];

    if (isRetake && targetedTopics.length > 0) {
      // Targeted retake mode (FR-016)
      stages = [
        {
          stage: 'INTRO',
          targetDurationMinutes: Math.max(1, Math.round(totalMinutes * 0.1)),
          targetQuestionCount: 1,
          objective: 'Brief introduction and recap of targeted practice areas',
          isOptional: false
        },
        {
          stage: 'TECHNICAL',
          targetDurationMinutes: Math.round(totalMinutes * 0.45),
          targetQuestionCount: totalMinutes <= 10 ? 2 : 4,
          objective: `Targeted deep dive into: ${targetedTopics.join(', ')}`,
          isOptional: false
        },
        {
          stage: 'PROBLEM_SOLVING',
          targetDurationMinutes: Math.round(totalMinutes * 0.35),
          targetQuestionCount: totalMinutes <= 10 ? 1 : 3,
          objective: 'Scenario-based evaluation of corrected techniques and trade-offs',
          isOptional: false
        },
        {
          stage: 'FINALIZING',
          targetDurationMinutes: Math.max(1, Math.round(totalMinutes * 0.1)),
          targetQuestionCount: 1,
          objective: 'Wrap up targeted retake session and review improvements',
          isOptional: false
        }
      ];
    } else if (totalMinutes <= 5) {
      // 5-min drill: Compact 4 turns
      stages = [
        { stage: 'INTRO', targetDurationMinutes: 1, targetQuestionCount: 1, objective: 'Opening role alignment and candidate context', isOptional: false },
        { stage: 'RESUME_DISCUSSION', targetDurationMinutes: 1, targetQuestionCount: 1, objective: 'Key achievement overview', isOptional: false },
        { stage: 'PROJECT_DEEP_DIVE', targetDurationMinutes: 2, targetQuestionCount: 1, objective: 'Core claim & deliverable verification', isOptional: false },
        { stage: 'FINALIZING', targetDurationMinutes: 1, targetQuestionCount: 1, objective: 'Closing and evaluation kickoff', isOptional: false }
      ];
    } else if (totalMinutes <= 15) {
      // 15-min standard: 7-8 turns
      stages = [
        { stage: 'INTRO', targetDurationMinutes: 2, targetQuestionCount: 1, objective: 'Candidate welcome, role briefing, and baseline verification', isOptional: false },
        { stage: 'RESUME_DISCUSSION', targetDurationMinutes: 2.5, targetQuestionCount: 1, objective: 'Career trajectory & primary domain expertise', isOptional: false },
        { stage: 'TECHNICAL', targetDurationMinutes: 3.5, targetQuestionCount: 2, objective: 'Domain mastery, tooling, and industry standard practices', isOptional: false },
        { stage: 'PROJECT_DEEP_DIVE', targetDurationMinutes: 3.5, targetQuestionCount: 2, objective: 'Granular investigation of claims and measurable outcomes', isOptional: false },
        { stage: 'PROBLEM_SOLVING', targetDurationMinutes: 2.5, targetQuestionCount: 1, objective: 'Applied problem solving and operational trade-offs', isOptional: true },
        { stage: 'FINALIZING', targetDurationMinutes: 1, targetQuestionCount: 1, objective: 'Wrap-up and evaluation dispatch', isOptional: false }
      ];
    } else {
      // 30+ min comprehensive: 10-12 turns across all stages
      stages = [
        { stage: 'INTRO', targetDurationMinutes: 3, targetQuestionCount: 1, objective: 'Role alignment and candidate background summary', isOptional: false },
        { stage: 'RESUME_DISCUSSION', targetDurationMinutes: 4, targetQuestionCount: 1, objective: 'Comprehensive career narrative and domain highlights', isOptional: false },
        { stage: 'TECHNICAL', targetDurationMinutes: 6, targetQuestionCount: 2, objective: 'Advanced domain mechanics, methodologies, and framework depth', isOptional: false },
        { stage: 'PROJECT_DEEP_DIVE', targetDurationMinutes: 7, targetQuestionCount: 3, objective: 'Quantifiable claim verification, metrics, and architecture/process ownership', isOptional: false },
        { stage: 'PROBLEM_SOLVING', targetDurationMinutes: 5, targetQuestionCount: 2, objective: 'Real-world scenario response, crisis management, and decision boundaries', isOptional: false },
        { stage: 'BEHAVIORAL_HR', targetDurationMinutes: 3, targetQuestionCount: 1, objective: 'Cross-functional communication, leadership, and stakeholder management', isOptional: true },
        { stage: 'CANDIDATE_QUESTIONS', targetDurationMinutes: 2, targetQuestionCount: 1, objective: 'Answering candidate queries regarding the team/role context', isOptional: true },
        { stage: 'FINALIZING', targetDurationMinutes: 1, targetQuestionCount: 1, objective: 'Final wrap-up and synthesis', isOptional: false }
      ];
    }

    // Planned questions with target topics
    const claims = candidate.claims || [];
    const plannedQuestions = stages.map((s, idx) => ({
      stage: s.stage,
      topic: s.objective,
      targetClaimId: claims[idx % Math.max(1, claims.length)]?.id,
      difficulty: idx <= 1 ? 1 : idx <= 3 ? 2 : idx <= 5 ? 3 : 2
    }));

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      totalDurationMinutes: totalMinutes,
      stages,
      plannedQuestions,
      createdAt: Date.now()
    };
  }

  /**
   * Determine the next stage in the interview state machine.
   * Handles time management (FR-014): skips optional stages if time is low.
   */
  public static getNextStage(
    currentStage: InterviewStage,
    plan: InterviewPlan,
    elapsedSeconds: number,
    totalSeconds: number,
    turnsInCurrentStage: number
  ): { nextStage: InterviewStage; isFinalStage: boolean; skipReason?: string } {
    const stagePlans = plan.stages;
    const currentIndex = stagePlans.findIndex(s => s.stage === currentStage);
    const currentPlan = stagePlans[currentIndex];

    // Check if stage is complete by turn count
    const stageComplete = currentPlan ? turnsInCurrentStage >= currentPlan.targetQuestionCount : true;

    if (!stageComplete) {
      // Stay in current stage
      return { nextStage: currentStage, isFinalStage: false };
    }

    // Move to next stage in plan
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    const isRunningOutOfTime = remainingSeconds < 90 && totalSeconds >= 300; // < 1.5 mins left

    let nextIndex = currentIndex + 1;
    let skipReason: string | undefined;

    while (nextIndex < stagePlans.length) {
      const nextPlan = stagePlans[nextIndex];

      // Time Management check (FR-014): Skip optional stages if low on time
      if (isRunningOutOfTime && nextPlan.isOptional && nextPlan.stage !== 'FINALIZING') {
        skipReason = `Skipped optional stage ${nextPlan.stage} to meet strict session duration deadline (${Math.round(remainingSeconds)}s remaining).`;
        nextIndex++;
        continue;
      }

      return {
        nextStage: nextPlan.stage,
        isFinalStage: nextPlan.stage === 'FINALIZING',
        skipReason
      };
    }

    // All stages in plan completed -> transition to FINALIZING or COMPLETED
    return {
      nextStage: 'FINALIZING',
      isFinalStage: true,
      skipReason
    };
  }
}
