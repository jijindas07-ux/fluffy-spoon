import { CandidateProfile, ConversationTurn, EvaluationReport, InterviewConfig, InterviewPlan, InterviewStage } from '../types';
import { AdaptiveInterviewEngine, DynamicQuestionResult } from '../engine/adaptiveEngine';
import { InterviewEvaluator } from '../engine/evaluator';
import { LLMService, LLMConfig } from './llmService';
import { TelemetryService } from '../engine/telemetry';
import { memoryStore } from '../db/client';

export interface AIServiceAdapter {
  generateQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    clientLLMConfig?: Partial<LLMConfig>,
    currentStage?: InterviewStage,
    plan?: InterviewPlan,
    elapsedSeconds?: number,
    sttConfidence?: number,
    sessionId?: string
  ): Promise<DynamicQuestionResult>;

  evaluateInterview(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    clientLLMConfig?: Partial<LLMConfig>,
    reportVersion?: number
  ): Promise<EvaluationReport>;
}

export class UnifiedAIService implements AIServiceAdapter {
  async generateQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    clientLLMConfig?: Partial<LLMConfig>,
    currentStage: InterviewStage = 'INTRO',
    plan?: InterviewPlan,
    elapsedSeconds: number = 0,
    sttConfidence?: number,
    sessionId?: string
  ): Promise<DynamicQuestionResult> {
    const startTime = Date.now();

    // 1. Try LLM if configured via client or environment
    const effectiveLLM = LLMService.getEffectiveConfig(clientLLMConfig);
    if (effectiveLLM) {
      try {
        const llmResult = await LLMService.generateQuestionWithLLM(
          candidate,
          config,
          history,
          currentClaimIndex,
          currentClaimDepth,
          effectiveLLM
        );
        if (llmResult) {
          const latencyMs = Date.now() - startTime;
          const usage = TelemetryService.createUsageRecord(
            'question_gen',
            effectiveLLM.provider as any,
            effectiveLLM.model || 'gemini-3.6-flash',
            800 + (history.length * 150),
            120,
            latencyMs,
            sessionId,
            config.tenantId
          );
          await memoryStore.recordAIUsage(usage);

          return {
            ...llmResult,
            stage: currentStage
          };
        }
      } catch (err) {
        console.warn('LLM Generation error, gracefully falling back to Adaptive Cognitive Engine:', err);
      }
    }

    // 2. Fallback to advanced Semantic Cognitive Engine with full SRS Stage support
    const result = AdaptiveInterviewEngine.generateNextQuestion(
      candidate,
      config,
      history,
      currentClaimIndex,
      currentClaimDepth,
      currentStage,
      plan,
      elapsedSeconds,
      sttConfidence
    );

    const latencyMs = Date.now() - startTime;
    const usage = TelemetryService.createUsageRecord(
      'question_gen',
      'local',
      'alphagrew-semantic-engine',
      400,
      80,
      latencyMs,
      sessionId,
      config.tenantId
    );
    await memoryStore.recordAIUsage(usage);

    return result;
  }

  async evaluateInterview(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    clientLLMConfig?: Partial<LLMConfig>,
    reportVersion: number = 1
  ): Promise<EvaluationReport> {
    const startTime = Date.now();
    const candidateAnswers = history.filter(t => t.speaker === 'candidate' && t.text && t.text.trim().length > 0);

    // If 0 responses, immediately return genuine unconducted report with score 0
    if (candidateAnswers.length === 0) {
      return InterviewEvaluator.generateEvaluation(candidate, config, history, sessionId, reportVersion);
    }

    // 1. Try LLM if configured
    const effectiveLLM = LLMService.getEffectiveConfig(clientLLMConfig);
    if (effectiveLLM) {
      try {
        const llmReport = await LLMService.evaluateInterviewWithLLM(
          candidate,
          config,
          history,
          sessionId,
          effectiveLLM
        );
        if (llmReport) {
          const latencyMs = Date.now() - startTime;
          const usage = TelemetryService.createUsageRecord(
            'report_gen',
            effectiveLLM.provider as any,
            effectiveLLM.model || 'gemini-3.6-flash',
            2500,
            1200,
            latencyMs,
            sessionId,
            config.tenantId
          );
          await memoryStore.recordAIUsage(usage);

          return {
            ...llmReport,
            version: reportVersion
          };
        }
      } catch (err) {
        console.warn('LLM Evaluation error, falling back to Local Evaluator:', err);
      }
    }

    // 2. Fallback to local intelligent evaluator
    const report = InterviewEvaluator.generateEvaluation(
      candidate,
      config,
      history,
      sessionId,
      reportVersion
    );

    const latencyMs = Date.now() - startTime;
    const usage = TelemetryService.createUsageRecord(
      'report_gen',
      'local',
      'alphagrew-evaluator-v1',
      1200,
      600,
      latencyMs,
      sessionId,
      config.tenantId
    );
    await memoryStore.recordAIUsage(usage);

    return report;
  }
}

// Active singleton instance
const unifiedService = new UnifiedAIService();

export function getAIService(): AIServiceAdapter {
  return unifiedService;
}
