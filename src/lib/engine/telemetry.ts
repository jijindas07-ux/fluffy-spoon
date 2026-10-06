import { AIUsageRecord } from '../types';

export class TelemetryService {
  // Approximate pricing per 1M tokens in USD
  private static readonly PRICING: Record<string, { input: number; output: number }> = {
    'gemini-3.6-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'local': { input: 0, output: 0 }
  };

  /**
   * Calculate estimated USD cost for an AI inference operation.
   */
  public static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rate = this.PRICING[model] || this.PRICING['gemini-3.6-flash'];
    const inputCost = (inputTokens / 1_000_000) * rate.input;
    const outputCost = (outputTokens / 1_000_000) * rate.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Record an AI telemetry event (FR-019).
   */
  public static createUsageRecord(
    operation: AIUsageRecord['operation'],
    provider: AIUsageRecord['provider'],
    model: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    interviewId?: string,
    tenantId?: string,
    audioSeconds?: number
  ): AIUsageRecord {
    const estimatedCostUsd = this.calculateCost(model, inputTokens, outputTokens);

    return {
      id: `ai-use-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      interviewId,
      tenantId,
      operation,
      provider,
      model,
      inputTokens,
      outputTokens,
      audioSeconds,
      latencyMs,
      estimatedCostUsd,
      timestamp: Date.now()
    };
  }
}
