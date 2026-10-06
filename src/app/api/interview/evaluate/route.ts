import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/services/aiService';
import { memoryStore } from '@/lib/db/client';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, clientLLMConfig, userId: bodyUserId, reportVersion = 1 } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // Get userId from auth token or body
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId || bodyUserId || null;

    const session = await memoryStore.getSession(sessionId, userId || undefined);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const headerKey = req.headers.get('x-api-key');
    const headerProvider = req.headers.get('x-ai-provider');
    const headerModel = req.headers.get('x-ai-model');

    const llmConfig = clientLLMConfig || (headerKey ? {
      provider: (headerProvider as any) || 'gemini',
      apiKey: headerKey,
      model: headerModel || undefined
    } : undefined);

    const aiService = getAIService();
    const report = await aiService.evaluateInterview(
      session.candidate,
      session.config,
      session.turns,
      session.id,
      llmConfig,
      reportVersion
    );

    // Attach usage telemetry summary
    const usages = await memoryStore.getAIUsage(sessionId);
    if (usages.length > 0) {
      const totalTokens = usages.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0);
      const totalLatencyMs = usages.reduce((sum, u) => sum + u.latencyMs, 0);
      const totalCostUsd = usages.reduce((sum, u) => sum + u.estimatedCostUsd, 0);
      report.aiUsageSummary = {
        totalTokens,
        totalLatencyMs,
        totalCostUsd: Number(totalCostUsd.toFixed(5)),
        provider: usages[0].provider,
        model: usages[0].model
      };
    }

    await memoryStore.saveReport(report, userId || undefined);

    // Audit log (Section 17 Security)
    await memoryStore.logAuditEvent({
      tenantId: session.tenantId,
      userId: userId || undefined,
      action: 'interview_complete',
      entityType: 'report',
      entityId: report.id,
      metadataJson: { overallScore: report.overallScore, recommendation: report.recommendation }
    });

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('Error generating evaluation report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
