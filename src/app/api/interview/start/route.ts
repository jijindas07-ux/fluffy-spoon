import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/services/aiService';
import { memoryStore } from '@/lib/db/client';
import { ConversationTurn, InterviewSession } from '@/lib/types';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';
import { authStore } from '@/lib/auth/authStore';
import { InterviewPlanner } from '@/lib/engine/interviewPlanner';
import { JDParser } from '@/lib/engine/jdParser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, candidateProfile, config, clientLLMConfig, userId: bodyUserId, jobDescriptionText } = body;

    // Extract auth token to get userId and tenantId
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId || bodyUserId || null;
    const tenantId = (auth as any)?.tenantId || config?.tenantId || 'tenant-default';

    let candidate = candidateProfile;
    if (!candidate && candidateId) {
      candidate = await memoryStore.getCandidate(candidateId, userId || undefined, tenantId);
    }

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate profile required' }, { status: 400 });
    }

    // Optional Job Description parsing (FR-005)
    let parsedJD = config?.parsedJD;
    if (!parsedJD && (jobDescriptionText || config?.jobDescriptionText)) {
      parsedJD = JDParser.parseJobDescription(jobDescriptionText || config?.jobDescriptionText, config.roleTitle, tenantId);
      await memoryStore.saveJobDescription(parsedJD);
    }

    const enhancedConfig = {
      ...config,
      tenantId,
      parsedJD
    };

    // Precompute bounded interview plan (FR-006, Section 9 Performance Design)
    const interviewPlan = InterviewPlanner.createInterviewPlan(candidate, enhancedConfig, parsedJD);

    const headerKey = req.headers.get('x-api-key');
    const headerProvider = req.headers.get('x-ai-provider');
    const headerModel = req.headers.get('x-ai-model');

    const llmConfig = clientLLMConfig || (headerKey ? {
      provider: (headerProvider as any) || 'gemini',
      apiKey: headerKey,
      model: headerModel || undefined
    } : undefined);

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const aiService = getAIService();
    const firstQResult = await aiService.generateQuestion(
      candidate,
      enhancedConfig,
      [],
      0,
      1,
      llmConfig,
      'INTRO',
      interviewPlan,
      0,
      undefined,
      sessionId
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

    const session: InterviewSession = {
      id: sessionId,
      tenantId,
      userId: userId || undefined,
      candidate,
      config: enhancedConfig,
      plan: interviewPlan,
      currentStage: 'INTRO',
      stageSequenceIndex: 0,
      stageHistory: [
        {
          stage: 'INTRO',
          enteredAt: Date.now(),
          turnCount: 1
        }
      ],
      turns: [initialTurn],
      currentClaimIndex: 0,
      currentClaimDepth: 1,
      difficultyLevel: 2,
      status: 'in_progress',
      startedAt: Date.now()
    };

    await memoryStore.saveSession(session, userId || undefined, tenantId);

    // Audit log (Section 17 Security)
    await memoryStore.logAuditEvent({
      tenantId,
      userId: userId || undefined,
      action: 'interview_start',
      entityType: 'interview',
      entityId: session.id,
      metadataJson: { roleTitle: enhancedConfig.roleTitle, duration: enhancedConfig.durationMinutes }
    });

    // Track interview count for authenticated users
    if (userId) {
      const user = authStore.getUserById(userId);
      if (user) {
        authStore.updateUser(userId, { interviewCount: user.interviewCount + 1 });
      }
    }

    return NextResponse.json({
      success: true,
      session,
      firstQuestion: firstQResult.question,
      stage: 'INTRO',
      anchoredClaimId: firstQResult.anchoredClaimId,
      investigationContext: firstQResult.investigationContext
    });
  } catch (error: any) {
    console.error('Error starting interview session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
