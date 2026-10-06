import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { JDParser } from '@/lib/engine/jdParser';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, raw_text, tenant_id } = body;

    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const effectiveTenantId = tenant_id || (auth as any)?.tenantId || 'tenant-default';

    if (!raw_text && !title) {
      return NextResponse.json({
        error: { code: 'INVALID_ARGUMENT', message: 'title or raw_text is required' }
      }, { status: 400 });
    }

    const parsedJD = JDParser.parseJobDescription(raw_text || '', title, effectiveTenantId);
    await memoryStore.saveJobDescription(parsedJD);

    return NextResponse.json({
      data: {
        id: parsedJD.id,
        tenant_id: parsedJD.tenantId,
        title: parsedJD.title,
        seniority_level: parsedJD.seniorityLevel,
        required_skills: parsedJD.requiredSkills,
        preferred_skills: parsedJD.preferredSkills,
        role_themes: parsedJD.roleThemes,
        status: parsedJD.status,
        parsed_at: parsedJD.parsedAt
      }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const tenantId = (auth as any)?.tenantId || 'tenant-default';

    const jds = await memoryStore.getAllJobDescriptions(tenantId);
    return NextResponse.json({ data: jds });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
