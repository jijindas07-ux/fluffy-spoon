import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/services/aiService';
import { memoryStore } from '@/lib/db/client';
import { ConversationTurn } from '@/lib/types';
import { AdaptiveInterviewEngine } from '@/lib/engine/adaptiveEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, answerText, clientLLMConfig } = body;

    if (!sessionId || !answerText?.trim()) {
      return NextResponse.json({ success: false, error: 'Session ID and non-empty answer required' }, { status: 400 });
    }

    const session = await memoryStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Extract headers if passed
    const headerKey = req.headers.get('x-api-key');
    const headerProvider = req.headers.get('x-ai-provider');
    const headerModel = req.headers.get('x-ai-model');

    const llmConfig = clientLLMConfig || (headerKey ? {
      provider: (headerProvider as any) || 'gemini',
      apiKey: headerKey,
      model: headerModel || undefined
    } : undefined);

    // Extract entities from answer
    const entities = AdaptiveInterviewEngine.extractEntities(answerText);
    const activeClaim = session.candidate.claims[session.currentClaimIndex] || session.candidate.claims[0];

    // Add candidate turn
    const candidateTurn: ConversationTurn = {
      id: `turn-cand-${Date.now()}`,
      speaker: 'candidate',
      text: answerText.trim(),
      timestamp: Date.now(),
      anchoredClaimId: activeClaim?.id,
      claimDepthLevel: session.currentClaimDepth,
      detectedEntities: entities
    };
    session.turns.push(candidateTurn);

    // Call AI service to generate next adaptive follow-up
    const aiService = getAIService();
    const nextQResult = await aiService.generateQuestion(
      session.candidate,
      session.config,
      session.turns,
      session.currentClaimIndex,
      session.currentClaimDepth,
      llmConfig
    );

    // Add AI turn
    const aiTurn: ConversationTurn = {
      id: `turn-ai-${Date.now()}`,
      speaker: 'ai',
      text: nextQResult.question,
      timestamp: Date.now(),
      anchoredClaimId: nextQResult.anchoredClaimId,
      claimDepthLevel: nextQResult.claimDepthLevel,
      detectedEntities: nextQResult.detectedEntities,
      evaluationNote: nextQResult.investigationContext
    };
    session.turns.push(aiTurn);

    // Update depth and claim index
    session.currentClaimDepth = nextQResult.claimDepthLevel;
    const claimIdx = session.candidate.claims.findIndex(c => c.id === nextQResult.anchoredClaimId);
    if (claimIdx !== -1) {
      session.currentClaimIndex = claimIdx;
    }

    if (nextQResult.isSessionComplete) {
      session.status = 'completed';
    }

    await memoryStore.saveSession(session);

    return NextResponse.json({
      success: true,
      nextQuestion: nextQResult.question,
      anchoredClaimId: nextQResult.anchoredClaimId,
      claimDepthLevel: nextQResult.claimDepthLevel,
      investigationContext: nextQResult.investigationContext,
      isSessionComplete: nextQResult.isSessionComplete,
      turns: session.turns
    });
  } catch (error: any) {
    console.error('Error in interview respond route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
