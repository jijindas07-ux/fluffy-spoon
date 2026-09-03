import { CandidateProfile, ConversationTurn, EvaluationReport, InterviewConfig } from '../types';
import { AdaptiveInterviewEngine, DynamicQuestionResult } from '../engine/adaptiveEngine';
import { InterviewEvaluator } from '../engine/evaluator';
import { LLMService, LLMConfig } from './llmService';

export interface AIServiceAdapter {
  generateQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    clientLLMConfig?: Partial<LLMConfig>
  ): Promise<DynamicQuestionResult>;

  evaluateInterview(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    clientLLMConfig?: Partial<LLMConfig>
  ): Promise<EvaluationReport>;
}

export class UnifiedAIService implements AIServiceAdapter {
  async generateQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    clientLLMConfig?: Partial<LLMConfig>
  ): Promise<DynamicQuestionResult> {
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
          return llmResult;
        }
      } catch (err) {
        console.warn('LLM Generation error, gracefully falling back to Adaptive Cognitive Engine:', err);
      }
    }

    // 2. Try Python microservice if URL is set
    if (process.env.PYTHON_AI_SERVICE_URL) {
      try {
        const response = await fetch(`${process.env.PYTHON_AI_SERVICE_URL}/api/v1/interview/generate-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate, config, history, currentClaimIndex, currentClaimDepth })
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn('Python AI service failed, falling back to Adaptive Cognitive Engine:', err);
      }
    }

    // 3. Fallback to advanced Semantic Cognitive Engine
    return AdaptiveInterviewEngine.generateNextQuestion(
      candidate,
      config,
      history,
      currentClaimIndex,
      currentClaimDepth
    );
  }

  async evaluateInterview(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    clientLLMConfig?: Partial<LLMConfig>
  ): Promise<EvaluationReport> {
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
          return llmReport;
        }
      } catch (err) {
        console.warn('LLM Evaluation error, falling back to Local Evaluator:', err);
      }
    }

    // 2. Fallback to local intelligent evaluator
    return InterviewEvaluator.generateEvaluation(
      candidate,
      config,
      history,
      sessionId
    );
  }
}

// Active singleton instance
const unifiedService = new UnifiedAIService();

export function getAIService(): AIServiceAdapter {
  return unifiedService;
}
