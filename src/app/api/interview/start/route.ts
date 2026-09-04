import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/services/aiService';
import { memoryStore } from '@/lib/db/client';
import { ConversationTurn, InterviewSession } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, candidateProfile, config, clientLLMConfig } = body;

    let candidate = candidateProfile;
    if (!candidate && candidateId) {
      candidate = await memoryStore.getCandidate(candidateId);
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate profile required' }, { status: 400 });
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
    const firstQResult = await aiService.generateQuestion(
      candidate,
      config,
      [],
      0,
      1,
      llmConfig
    );

    const initialTurn: ConversationTurn = {
      id: `turn-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      speaker: 'ai',
      text: firstQResult.question,
      timestamp: Date.now(),
      anchoredClaimId: firstQResult.anchoredClaimId,
      claimDepthLevel: firstQResult.claimDepthLevel,
      detectedEntities: firstQResult.detectedEntities,
      evaluationNote: firstQResult.investigationContext
    };

    const session: InterviewSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      candidate,
      config,
      turns: [initialTurn],
      currentClaimIndex: 0,
      currentClaimDepth: 1,
      status: 'in_progress',
      startedAt: Date.now()
    };

    await memoryStore.saveSession(session);

    return NextResponse.json({
      success: true,
      session,
      firstQuestion: firstQResult.question,
      anchoredClaimId: firstQResult.anchoredClaimId,
      investigationContext: firstQResult.investigationContext
    });
  } catch (error: any) {
    console.error('Error starting interview session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
