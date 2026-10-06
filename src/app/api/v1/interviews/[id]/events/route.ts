import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';
import { getAIService } from '@/lib/services/aiService';
import { ConversationTurn } from '@/lib/types';
import { AdaptiveInterviewEngine } from '@/lib/engine/adaptiveEngine';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interviewId = params.id;
    const body = await req.json();
    const { event_type, answer_text, stt_confidence = 0.95, audio_path, duration_ms, event_id } = body;

    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId;
    const tenantId = (auth as any)?.tenantId || 'tenant-default';

    const session = await memoryStore.getSession(interviewId, userId, tenantId);
    if (!session) {
      return NextResponse.json({
        error: { code: 'NOT_FOUND', message: 'Interview session not found' }
      }, { status: 404 });
    }

    if (event_type === 'CANDIDATE_ANSWER') {
      if (!answer_text?.trim()) {
        return NextResponse.json({
          error: { code: 'INVALID_ARGUMENT', message: 'answer_text is required for CANDIDATE_ANSWER' }
        }, { status: 400 });
      }

      const entities = AdaptiveInterviewEngine.extractEntities(answer_text);
      const activeClaim = session.candidate.claims[session.currentClaimIndex] || session.candidate.claims[0];

      // Add Candidate Turn
      const candidateTurn: ConversationTurn = {
        id: `turn-cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        speaker: 'candidate',
        text: answer_text.trim(),
        timestamp: Date.now(),
        stage: session.currentStage,
        anchoredClaimId: activeClaim?.id,
        claimDepthLevel: session.currentClaimDepth,
        detectedEntities: entities,
        audioPath: audio_path,
        sttConfidence: stt_confidence
      };
      session.turns.push(candidateTurn);

      // Generate AI Next Turn
      const elapsedSeconds = Math.round((Date.now() - session.startedAt) / 1000);
      const aiService = getAIService();
      const nextQResult = await aiService.generateQuestion(
        session.candidate,
        session.config,
        session.turns,
        session.currentClaimIndex,
        session.currentClaimDepth,
        undefined,
        session.currentStage,
        session.plan,
        elapsedSeconds,
        stt_confidence,
        session.id
      );

      const aiTurn: ConversationTurn = {
        id: `turn-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        speaker: 'ai',
        text: nextQResult.question,
        timestamp: Date.now(),
        stage: nextQResult.stage,
        anchoredClaimId: nextQResult.anchoredClaimId,
        claimDepthLevel: nextQResult.claimDepthLevel,
        detectedEntities: nextQResult.detectedEntities,
        evaluationNote: nextQResult.investigationContext
      };
      session.turns.push(aiTurn);

      session.currentStage = nextQResult.stage;
      session.currentClaimDepth = nextQResult.claimDepthLevel;
      if (nextQResult.isSessionComplete) {
        session.status = 'completed';
        session.completedAt = Date.now();
      }

      await memoryStore.saveSession(session, userId, tenantId);

      return NextResponse.json({
        data: {
          session_id: session.id,
          event_id: event_id || `evt-${Date.now()}`,
          current_stage: session.currentStage,
          next_question: nextQResult.question,
          is_complete: nextQResult.isSessionComplete,
          low_confidence_triggered: nextQResult.lowConfidenceTriggered
        }
      });
    }

    if (event_type === 'PAUSE') {
      session.status = 'paused';
      await memoryStore.saveSession(session, userId, tenantId);
      return NextResponse.json({ data: { status: session.status } });
    }

    if (event_type === 'RESUME') {
      session.status = 'in_progress';
      await memoryStore.saveSession(session, userId, tenantId);
      return NextResponse.json({ data: { status: session.status } });
    }

    if (event_type === 'RECONNECT') {
      session.status = 'in_progress';
      session.reconnectCount = (session.reconnectCount || 0) + 1;
      await memoryStore.saveSession(session, userId, tenantId);
      return NextResponse.json({
        data: {
          status: session.status,
          current_stage: session.currentStage,
          reconnect_count: session.reconnectCount,
          last_turn: session.turns[session.turns.length - 1]
        }
      });
    }

    return NextResponse.json({
      error: { code: 'INVALID_EVENT', message: `Unsupported event_type: ${event_type}` }
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
