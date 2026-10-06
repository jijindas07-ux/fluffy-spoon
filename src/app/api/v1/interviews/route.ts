import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';
import { InterviewPlanner } from '@/lib/engine/interviewPlanner';
import { InterviewConfig, InterviewSession } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      candidate_id,
      resume_id,
      job_description_id,
      role_title,
      seniority = 'Mid-Level',
      duration_min = 15,
      mode = 'voice',
      language = 'en',
      focus_area = 'Core Competencies & Claim Verification',
      rigor_level = 'Rigorous & Challenging',
      tenant_id,
      retake_of_session_id,
      targeted_topics
    } = body;

    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const effectiveTenantId = tenant_id || (auth as any)?.tenantId || 'tenant-default';
    const userId = auth?.userId;

    const candidate = await memoryStore.getCandidate(candidate_id, userId, effectiveTenantId);
    if (!candidate) {
      return NextResponse.json({
        error: { code: 'NOT_FOUND', message: 'Candidate not found' }
      }, { status: 404 });
    }

    let parsedJD = undefined;
    if (job_description_id) {
      parsedJD = (await memoryStore.getJobDescription(job_description_id)) || undefined;
    }

    const config: InterviewConfig = {
      roleTitle: role_title || parsedJD?.title || candidate.title || 'Professional',
      seniority,
      durationMinutes: duration_min,
      focusArea: focus_area,
      rigorLevel: rigor_level,
      tenantId: effectiveTenantId,
      jobDescriptionId: job_description_id,
      parsedJD,
      mode,
      language,
      retakeOfSessionId: retake_of_session_id,
      targetedTopics: targeted_topics
    };

    const plan = InterviewPlanner.createInterviewPlan(candidate, config, parsedJD);
    const sessionId = `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const session: InterviewSession = {
      id: sessionId,
      tenantId: effectiveTenantId,
      userId: userId,
      candidate,
      config,
      plan,
      currentStage: 'READY',
      stageSequenceIndex: 0,
      stageHistory: [],
      turns: [],
      currentClaimIndex: 0,
      currentClaimDepth: 1,
      difficultyLevel: 2,
      status: 'ready',
      startedAt: Date.now()
    };

    await memoryStore.saveSession(session, userId, effectiveTenantId);

    return NextResponse.json({
      data: {
        id: session.id,
        tenant_id: session.tenantId,
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        role_title: config.roleTitle,
        seniority: config.seniority,
        duration_min: config.durationMinutes,
        status: session.status,
        mode: config.mode,
        plan: session.plan
      }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
