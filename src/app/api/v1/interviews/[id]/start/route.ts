import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';
import { getAIService } from '@/lib/services/aiService';
import { ConversationTurn } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interviewId = params.id;
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

    const aiService = getAIService();
    const firstQResult = await aiService.generateQuestion(
      session.candidate,
      session.config,
      [],
      0,
      1,
      undefined,
      'INTRO',
      session.plan,
      0,
      undefined,
      session.id
    );

    const initialTurn: ConversationTurn = {
      id: `turn-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      speaker: 'ai',
      text: firstQResult.question,
      timestamp: Date.now(),
      stage: 'INTRO',
      anchoredClaimId: firstQResult.anchoredClaimId,
      claimDepthLevel: firstQResult.claimDepthLevel,
      detectedEntities: firstQResult.detectedEntities,
      evaluationNote: firstQResult.investigationContext
    };

    session.turns = [initialTurn];
    session.currentStage = 'INTRO';
    session.status = 'in_progress';
    session.startedAt = Date.now();
    session.stageHistory = [{ stage: 'INTRO', enteredAt: Date.now(), turnCount: 1 }];

    await memoryStore.saveSession(session, userId, tenantId);

    // Mock LiveKit room token generation for realtime voice / WebRTC (Section 4 & 8)
    const roomName = `room-${session.id}`;
    const roomToken = `livekit_jwt_${Buffer.from(JSON.stringify({ room: roomName, identity: session.candidate.id, exp: Date.now() + 3600000 })).toString('base64url')}`;

    return NextResponse.json({
      data: {
        session_id: session.id,
        status: session.status,
        current_stage: session.currentStage,
        room_name: roomName,
        room_token: roomToken,
        first_question: firstQResult.question,
        anchored_claim_id: firstQResult.anchoredClaimId,
        investigation_context: firstQResult.investigationContext
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
