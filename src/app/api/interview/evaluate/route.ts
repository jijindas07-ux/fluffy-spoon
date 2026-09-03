import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/services/aiService';
import { memoryStore } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, clientLLMConfig } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    const session = await memoryStore.getSession(sessionId);
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
      llmConfig
    );

    await memoryStore.saveReport(report);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: any) {
    console.error('Error generating evaluation report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
