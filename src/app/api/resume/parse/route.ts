import { NextRequest, NextResponse } from 'next/server';
import { extractClaimsFromText } from '@/lib/engine/claimExtractor';
import { extractTextFromPdfBuffer, cleanPdfText } from '@/lib/engine/pdfParser';
import { SAMPLE_CANDIDATES } from '@/lib/data/sampleResumes';
import { memoryStore } from '@/lib/db/client';
import { LLMService, LLMConfig } from '@/lib/services/llmService';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let rawText = '';
    let candidateName = 'Candidate';
    let presetId = '';
    let clientLLMConfig: Partial<LLMConfig> | undefined;

    let pdfBase64: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      candidateName = (formData.get('candidateName') as string) || (file?.name ? file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Candidate');
      const llmConfigJson = formData.get('clientLLMConfig') as string | null;

      if (llmConfigJson) {
        try { clientLLMConfig = JSON.parse(llmConfigJson); } catch {}
      }

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
          pdfBase64 = buffer.toString('base64');
          rawText = await extractTextFromPdfBuffer(buffer);
        } else {
          rawText = cleanPdfText(buffer.toString('utf-8'));
        }
      }
    } else {
      const body = await req.json();
      rawText = body.rawText ? cleanPdfText(body.rawText) : '';
      candidateName = body.candidateName || 'Candidate';
      presetId = body.presetId || '';
      clientLLMConfig = body.clientLLMConfig;
    }

    let profile;

    if (presetId) {
      const preset = SAMPLE_CANDIDATES.find(c => c.id === presetId);
      profile = preset || SAMPLE_CANDIDATES[0];
    } else {
      // Check if LLM / AI key is configured
      const effectiveLLM = LLMService.getEffectiveConfig(clientLLMConfig);
      if (effectiveLLM && (rawText.length > 10 || pdfBase64)) {
        try {
          const aiProfile = await LLMService.parseResumeWithLLM(rawText, candidateName, effectiveLLM, pdfBase64);
          if (aiProfile) {
            profile = aiProfile;
          }
        } catch (aiErr) {
          console.warn('AI Resume Parse failed, utilizing intelligent local claim extractor:', aiErr);
        }
      }

      // Fallback to intelligent local claim extractor if AI unavailable or returned null
      if (!profile) {
        profile = extractClaimsFromText(rawText || `Resume document for ${candidateName}`, candidateName);
      }
    }

    await memoryStore.saveCandidate(profile);

    return NextResponse.json({ success: true, profile, textLength: rawText.length });
  } catch (error: any) {
    console.error('Error parsing resume:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
