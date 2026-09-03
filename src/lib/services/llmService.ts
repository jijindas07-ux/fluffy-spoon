import { CandidateProfile, ConversationTurn, EvaluationReport, InterviewConfig } from '../types';
import { DynamicQuestionResult } from '../engine/adaptiveEngine';

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'groq' | 'custom' | 'auto';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class LLMService {
  /**
   * Determine available LLM provider and key
   */
  public static getEffectiveConfig(clientConfig?: Partial<LLMConfig>): LLMConfig | null {
    const serverGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const serverOpenaiKey = process.env.OPENAI_API_KEY;
    const serverGroqKey = process.env.GROQ_API_KEY;

    // Prioritize valid server keys first (so client stale localStorage doesn't break server key)
    if (serverGeminiKey) {
      return { provider: 'gemini', apiKey: serverGeminiKey, model: clientConfig?.model || 'gemini-3.6-flash' };
    }

    if (clientConfig?.provider === 'gemini' && clientConfig?.apiKey) {
      return { provider: 'gemini', apiKey: clientConfig.apiKey, model: clientConfig.model || 'gemini-3.6-flash' };
    }
    if (clientConfig?.provider === 'openai' && clientConfig?.apiKey) {
      return { provider: 'openai', apiKey: clientConfig.apiKey, model: clientConfig.model || 'gpt-4o-mini' };
    }
    if (clientConfig?.provider === 'groq' && clientConfig?.apiKey) {
      return { provider: 'groq', apiKey: clientConfig.apiKey, model: clientConfig.model || 'llama-3.3-70b-versatile' };
    }

    if (clientConfig?.apiKey) {
      return { provider: clientConfig.provider || 'gemini', apiKey: clientConfig.apiKey, model: clientConfig.model || 'gemini-3.6-flash' };
    }
    if (serverOpenaiKey) {
      return { provider: 'openai', apiKey: serverOpenaiKey, model: clientConfig?.model || 'gpt-4o-mini' };
    }
    if (serverGroqKey) {
      return { provider: 'groq', apiKey: serverGroqKey, model: clientConfig?.model || 'llama-3.3-70b-versatile' };
    }

    return null;
  }

  /**
   * Parse PDF text / resume content into CandidateProfile with English claims using AI
   */
  public static async parseResumeWithLLM(
    rawText: string,
    fallbackName: string = 'Candidate',
    llmConfig: LLMConfig,
    pdfBase64?: string
  ): Promise<CandidateProfile | null> {
    const hasPdfAttachment = Boolean(pdfBase64 && llmConfig.provider === 'gemini');
    
    const prompt = `You are a Principal Technical Recruiter and AI Talent Intelligence Engine.
${hasPdfAttachment ? 'Thoroughly examine the attached candidate resume document (including header, all work history roles, multi-column sections, technical skills, quantifiable bullet points, and project deliverables).' : 'Thoroughly examine the extracted resume text below.'}

${rawText && rawText.length > 20 ? `RAW RESUME TEXT:
${rawText.slice(0, 12000)}` : ''}

ANALYSIS GOALS:
1. **Candidate Identity & Role**: Extract the candidate's authentic Full Name, current/latest Job Title, and calculate total years of professional experience from the dates on the resume.
2. **Key Roles & Companies**: Identify the candidate's key employment roles, company names, and employment dates.
3. **Verifiable Technical Claims**: Extract 4 to 10 prominent, concrete claims, accomplishments, technical designs, optimizations, or project highlights documented on the resume.
4. **Metrics & Impact**: Capture the exact metrics, percentages, traffic volumes, latency reductions, cost savings, user counts, or business outcomes mentioned.
5. **Categorization**: Categorize each claim naturally (e.g., "System Architecture", "Scale & High Concurrency", "Performance & Optimization", "Reliability & Infrastructure", "Product & Full-Stack", "Leadership & Mentorship").
6. **Skills & Tools**: Extract all languages, frameworks, databases, and tools/platforms explicitly mentioned on the resume.

Respond ONLY with a valid JSON object matching this schema:
{
  "name": "Candidate Full Name",
  "title": "Exact Current or Latest Role Title",
  "experienceYears": 5,
  "summary": "2-3 sentence executive summary accurately capturing their background, key tech competencies, and primary domain.",
  "skills": {
    "languages": ["TypeScript", "Python"],
    "frameworks": ["React", "FastAPI"],
    "databases": ["PostgreSQL", "Redis"],
    "toolsAndInfra": ["Docker", "AWS", "Kubernetes"]
  },
  "claims": [
    {
      "id": "claim-1",
      "rawClaim": "Clear, complete sentence describing a real achievement, architecture, or responsibility directly from the resume.",
      "category": "Architecture & Scale",
      "contextProject": "Company or Project Name",
      "claimedMetrics": "Exact metric mentioned (or 'Documented Highlight')",
      "confidenceLevel": "High",
      "verificationStatus": "Pending"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "Project or Company Name",
      "role": "Role Title",
      "duration": "Dates (e.g. 2022 - Present)",
      "technologies": ["Tech used"],
      "description": "Short project summary.",
      "highlights": ["Key bullet point 1", "Key bullet point 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree / Certification",
      "institution": "University / Issuer",
      "year": "Year"
    }
  ]
}`;

    try {
      const inlineData = hasPdfAttachment ? { mimeType: 'application/pdf', data: pdfBase64! } : undefined;
      const responseText = await this.callLLM(prompt, llmConfig, true, inlineData);
      const parsed = this.cleanAndParseJSON(responseText);
      if (parsed && parsed.name && Array.isArray(parsed.claims) && parsed.claims.length > 0) {
        return {
          id: `cand-${Date.now()}`,
          name: parsed.name && parsed.name !== 'Candidate' ? parsed.name : fallbackName,
          title: parsed.title || 'Professional',
          experienceYears: Number(parsed.experienceYears) || 0,
          summary: parsed.summary || 'Demonstrated technical and professional experience documented on resume.',
          skills: {
            languages: parsed.skills?.languages || [],
            frameworks: parsed.skills?.frameworks || [],
            databases: parsed.skills?.databases || [],
            toolsAndInfra: parsed.skills?.toolsAndInfra || []
          },
          projects: parsed.projects || [],
          education: parsed.education || [],
          parserSource: hasPdfAttachment ? 'gemini_multimodal' : 'gemini_text',
          claims: parsed.claims.map((c: any, i: number) => ({
            id: c.id || `claim-${i + 1}`,
            rawClaim: c.rawClaim || 'Demonstrated professional accomplishment',
            category: c.category || 'Architecture',
            contextProject: c.contextProject || 'Project Experience',
            claimedMetrics: c.claimedMetrics || 'Documented Highlight',
            confidenceLevel: c.confidenceLevel || 'High',
            verificationStatus: 'Pending'
          }))
        };
      }
    } catch (err) {
      console.warn('LLM resume parsing failed, falling back to local extractor:', err);
    }

    return null;
  }

  /**
   * Generate next question using LLM with deep assessment of candidate's answer
   */
  public static async generateQuestionWithLLM(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number,
    llmConfig: LLMConfig
  ): Promise<DynamicQuestionResult | null> {
    const claims = candidate.claims || [];
    const activeClaim = claims[currentClaimIndex % claims.length] || claims[0];
    const maxTurns = config.durationMinutes <= 5 ? 4 : config.durationMinutes <= 15 ? 7 : 10;
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');

    const isLastTurn = candidateAnswers.length >= maxTurns;

    const transcriptFormatted = history.map((t, idx) => {
      return `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: "${t.text}"`;
    }).join('\n\n');

    const isFirstQuestion = history.length === 0;

    const prompt = `You are a professional, highly articulate interviewer.
You are conducting a live interview for candidate "${candidate.name}".

CANDIDATE TITLE / ROLE: ${candidate.title || 'Professional'}
CANDIDATE RESUME SUMMARY:
${candidate.summary}
Key Skills / Knowledge: ${[...candidate.skills.languages, ...candidate.skills.frameworks, ...candidate.skills.databases, ...candidate.skills.toolsAndInfra].join(', ')}

KEY CLAIMS EXTRACTED FROM RESUME:
${claims.map((c, i) => `${i + 1}. [${c.category}] "${c.rawClaim}" (Context: ${c.contextProject || 'General Experience'}, Metrics: ${c.claimedMetrics || 'N/A'})`).join('\n')}

CURRENT FOCUS CLAIM: "${activeClaim?.rawClaim || 'Candidate Experience'}" (Claim ${currentClaimIndex + 1} of ${claims.length})
CURRENT CLAIM DEPTH: Level ${currentClaimDepth} of 3
TURNS COMPLETED BY CANDIDATE: ${candidateAnswers.length} of ${maxTurns} target turns

CONVERSATION TRANSCRIPT SO FAR:
${transcriptFormatted || '(Interview is just starting - Question #1)'}

CRITICAL INTERVIEW INSTRUCTIONS:
1. **${isFirstQuestion ? 'OPENING QUESTION' : 'INTERVIEW PROBE & FOLLOW-UP'}**:
   ${isFirstQuestion ? `- Greet the candidate by name ("Hello ${candidate.name.split(' ')[0]}...").
   - Briefly introduce that you will be exploring their background and the key experiences listed on their resume.
   - Ask an engaging, clear, and probing question that directly inquires about their actual resume claim: "${activeClaim?.rawClaim}".
   - Base your question strictly on what is stated in the claim — ask about their specific role, methodologies, key decisions, challenges faced, tools used, or outcomes achieved.
   - DO NOT make assumptions about rigid external job templates or force a specific backend/systems framework unless that is what the claim describes.` : `- Carefully evaluate the candidate's last answer.
   - Probe deeper into the specific tools, techniques, processes, or decisions they mentioned in their previous response.
   - Ask for concrete implementation details, trade-offs, or real-world examples from their experience.
   - Keep your question clear, natural, professional, and targeted (1-3 sentences max).`}

2. **ADAPTIVE PACING**:
   - ${isLastTurn ? 'This is the final turn. Thank the candidate, summarize that you have gathered the necessary signal, and state that the evaluation report is being prepared.' : 'Ask ONE clear question.'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "question": "Your spoken interviewer response or question to the candidate",
  "assessmentNote": "A 1-sentence analytical assessment of the candidate's response or focus",
  "anchoredClaimId": "${activeClaim?.id || 'claim-1'}",
  "claimDepthLevel": ${Math.min(3, currentClaimDepth + 1)},
  "detectedEntities": ["Entity1", "Entity2"],
  "isSessionComplete": ${isLastTurn}
}`;

    try {
      const responseText = await this.callLLM(prompt, llmConfig, true);
      const parsed = this.cleanAndParseJSON(responseText);
      if (parsed && parsed.question) {
        return {
          question: parsed.question,
          anchoredClaimId: parsed.anchoredClaimId || activeClaim?.id || 'claim-1',
          claimDepthLevel: typeof parsed.claimDepthLevel === 'number' ? parsed.claimDepthLevel : currentClaimDepth + 1,
          investigationContext: parsed.assessmentNote || `Investigating: "${activeClaim?.rawClaim || 'Core Engineering'}"`,
          detectedEntities: Array.isArray(parsed.detectedEntities) ? parsed.detectedEntities : [],
          isSessionComplete: Boolean(parsed.isSessionComplete || isLastTurn)
        };
      }
    } catch (err) {
      console.warn('LLM question generation failed, falling back to local engine:', err);
    }

    return null;
  }

  /**
   * Evaluate entire interview using LLM
   */
  public static async evaluateInterviewWithLLM(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    sessionId: string,
    llmConfig: LLMConfig
  ): Promise<EvaluationReport | null> {
    const claims = candidate.claims || [];
    const transcriptFormatted = history.map((t, idx) => {
      return `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: "${t.text}"`;
    }).join('\n\n');

    const prompt = `You are a Senior Engineering Director and Hiring Committee Chair evaluating candidate "${candidate.name}" based on a live technical interview transcript.

CANDIDATE: ${candidate.name}
TARGET ROLE: ${config.seniority} ${config.roleTitle}
INTERVIEW FOCUS: ${config.focusArea}
RIGOR LEVEL: ${config.rigorLevel}

RESUME CLAIMS:
${claims.map(c => `- [${c.category}] "${c.rawClaim}" (Project: ${c.contextProject})`).join('\n')}

FULL INTERVIEW TRANSCRIPT:
${transcriptFormatted}

EVALUATION INSTRUCTIONS:
- Analyze every answer provided by the candidate.
- Look for genuine evidence vs. superficial buzzwords, concrete trade-off reasoning, edge-case awareness, communication clarity, and alignment with their resume claims.
- Extract actual quotes directly from the candidate's spoken turns.
- Provide objective, calibrated scores from 0-100 for each dimension.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "overallScore": 85,
  "recommendation": "Strong Hire | Hire | Leaning Hire | Needs Follow-Up | Do Not Hire",
  "executiveSummary": "Comprehensive 3-4 sentence hiring committee summary evaluating technical depth, credibility, and real-world system design readiness.",
  "dimensions": {
    "technicalCompetency": {
      "score": 88,
      "label": "Technical Competency",
      "summary": "Detailed assessment of their domain depth and tech stack command.",
      "evidenceQuotes": ["Exact candidate quote 1", "Exact candidate quote 2"]
    },
    "problemSolving": {
      "score": 82,
      "label": "Problem Solving & Trade-offs",
      "summary": "Detailed assessment of their trade-off evaluations and design rationale.",
      "evidenceQuotes": ["Exact candidate quote"]
    },
    "communication": {
      "score": 85,
      "label": "Communication & Conciseness",
      "summary": "Assessment of clarity, structure, and precision in technical explanations.",
      "evidenceQuotes": ["Exact candidate quote"]
    },
    "experienceDepth": {
      "score": 84,
      "label": "Experience Depth",
      "summary": "Assessment of hands-on architectural ownership vs passive involvement.",
      "evidenceQuotes": ["Exact candidate quote"]
    },
    "resumeCredibility": {
      "score": 86,
      "label": "Resume Claim Credibility",
      "summary": "How well their verbal explanations matched their claimed resume metrics and achievements.",
      "evidenceQuotes": ["Exact candidate quote"]
    }
  },
  "strengths": [
    {
      "title": "Clear strength title",
      "description": "Specific explanation of what they demonstrated.",
      "quote": "Direct quote from candidate"
    },
    {
      "title": "Second strength title",
      "description": "Specific explanation of what they demonstrated.",
      "quote": "Direct quote from candidate"
    }
  ],
  "weaknesses": [
    {
      "title": "Specific area of concern or gap",
      "description": "Detailed explanation of what was lacking or unverified.",
      "quote": "Direct quote or context from candidate"
    }
  ],
  "verificationAreas": [
    {
      "area": "Specific topic (e.g. Distributed Consensus / Database Indexing)",
      "issueFound": "Observation from interview",
      "suggestedOnsiteQuestion": "Targeted whiteboard or deep-dive question for round 2"
    }
  ],
  "evidenceItems": [
    {
      "id": "ev-1",
      "claimId": "claim-1",
      "claimAssertion": "Claim text",
      "candidateQuote": "Direct quote from candidate",
      "assessmentVerdict": "Strong Validation | Moderate Evidence | Superficial / Vague | Potential Inconsistency",
      "reasoning": "Why this verdict was assigned"
    }
  ]
}`;

    try {
      const responseText = await this.callLLM(prompt, llmConfig, true);
      const parsed = this.cleanAndParseJSON(responseText);
      if (parsed && parsed.overallScore && parsed.executiveSummary) {
        return {
          id: `rep-${Date.now()}`,
          sessionId,
          candidateName: candidate.name,
          targetRole: config.roleTitle,
          seniority: config.seniority,
          completedAt: new Date().toISOString(),
          durationMinutesSpent: config.durationMinutes,
          totalTurns: history.length,
          overallScore: Number(parsed.overallScore) || 75,
          recommendation: parsed.recommendation || 'Hire',
          executiveSummary: parsed.executiveSummary,
          dimensions: parsed.dimensions,
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          verificationAreas: parsed.verificationAreas || [],
          evidenceItems: parsed.evidenceItems || []
        };
      }
    } catch (err) {
      console.warn('LLM evaluation failed, falling back to local evaluator:', err);
    }

    return null;
  }

  /**
   * Helper to dispatch LLM call to appropriate provider
   */
  private static async callLLM(
    prompt: string, 
    config: LLMConfig, 
    jsonMode: boolean = false,
    inlineData?: { mimeType: string; data: string }
  ): Promise<string> {
    const provider = config.provider;

    if (provider === 'gemini') {
      const apiKey = config.apiKey;
      if (!apiKey) throw new Error('Missing Gemini API Key');
      const modelsToTry = [config.model || 'gemini-3.6-flash', 'gemini-3.6-flash'].filter((v, i, a) => a.indexOf(v) === i);
      
      const parts: any[] = [{ text: prompt }];
      if (inlineData) {
        parts.push({
          inlineData: {
            mimeType: inlineData.mimeType,
            data: inlineData.data
          }
        });
      }

      let lastError = '';
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
                ...(jsonMode ? { responseMimeType: 'application/json' } : {})
              }
            })
          });

          if (!res.ok) {
            lastError = await res.text();
            continue;
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } catch (e: any) {
          lastError = e.message;
        }
      }
      throw new Error(`Gemini API error: ${lastError}`);
    }

    if (provider === 'openai' || provider === 'groq' || provider === 'custom') {
      const apiKey = config.apiKey;
      const baseUrl = provider === 'groq' 
        ? 'https://api.groq.com/openai/v1/chat/completions' 
        : config.baseUrl || 'https://api.openai.com/v1/chat/completions';
      const defaultModel = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      const model = config.model || defaultModel;

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an expert technical interviewer and hiring committee chair. Always return clean valid JSON when requested.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`LLM API error (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenAI-compatible API');
      return text;
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  private static cleanAndParseJSON(raw: string): any {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // Attempt substring match
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = raw.substring(start, end + 1);
        return JSON.parse(candidate);
      }
      throw new Error('Failed to parse JSON from LLM response');
    }
  }
}
