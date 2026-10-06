export type SeniorityLevel = 'Junior' | 'Mid-Level' | 'Senior' | 'Staff / Lead' | 'Principal / Architect' | 'Executive / Director';

export type InterviewFocus = 
  | 'Core Competencies & Claim Verification'
  | 'Problem Solving & Strategic Decisions'
  | 'Process, Operations & Execution'
  | 'Leadership & Stakeholder Management'
  | 'Domain Expertise & Scenario Handling'
  | 'System Architecture & Scale'
  | 'Deep Technical Verification'
  | 'Problem Solving & Trade-offs'
  | 'Full-Stack Engineering'
  | 'Practical Debugging & Reliability';

export type RigorLevel = 'Constructive & Thorough' | 'Rigorous & Challenging' | 'High-Bar Executive Standard' | 'High-Bar FAANG Style';

export type UserRole = 'student' | 'placement_officer' | 'faculty' | 'tenant_admin' | 'platform_admin' | 'candidate' | 'admin';

export type ClaimCategory = 
  | 'Impact & Results'
  | 'Leadership & Management'
  | 'Process & Operations'
  | 'Domain Expertise'
  | 'Strategy & Planning'
  | 'Scale & Systems'
  | 'Scale & Traffic'
  | 'Architecture'
  | 'Performance & Latency'
  | 'Database & Storage'
  | 'Reliability & CI/CD';

// ─── SRS 11-STAGE INTERVIEW STATE MACHINE ─────────────────────────
export type InterviewStage = 
  | 'CREATED'
  | 'READY'
  | 'STARTING'
  | 'INTRO'
  | 'RESUME_DISCUSSION'
  | 'TECHNICAL'
  | 'PROJECT_DEEP_DIVE'
  | 'PROBLEM_SOLVING'
  | 'BEHAVIORAL_HR'
  | 'CANDIDATE_QUESTIONS'
  | 'FINALIZING'
  | 'COMPLETED';

export type InterviewStateStatus = 
  | 'initialized'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'reconnecting'
  | 'cancelled'
  | 'failed'
  | 'completed';

export interface ResumeClaim {
  id: string;
  rawClaim: string;
  category: ClaimCategory | string;
  contextProject: string;
  claimedMetrics: string;
  confidenceLevel: 'High' | 'Medium' | 'Needs Deep-Dive';
  verificationStatus: 'Pending' | 'Probing' | 'Verified' | 'Unverified' | 'Questionable';
  evidenceRef?: string;
  sourceText?: string;
  probeQuestionsAsked?: number;
}

export interface CandidateProject {
  id: string;
  title: string;
  role: string;
  duration: string;
  technologies: string[];
  description: string;
  highlights: string[];
}

export interface CandidateCertification {
  name: string;
  issuer: string;
  year?: string;
}

export interface CandidateAmbiguity {
  area: string;
  description: string;
  suggestedProbe: string;
}

export interface CandidateProfile {
  id: string;
  candidateId?: string;
  tenantId?: string;
  resumeId?: string;
  name: string;
  title: string;
  email?: string;
  experienceYears: number;
  experienceLevel?: SeniorityLevel;
  location?: string;
  summary: string;
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    toolsAndInfra: string[];
  };
  projects: CandidateProject[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications?: CandidateCertification[];
  ambiguities?: CandidateAmbiguity[];
  claims: ResumeClaim[];
  rawExtractedText?: string;
  scannedKeyPoints?: string[];
  parserSource?: 'gemini_multimodal' | 'gemini_text' | 'direct_pdf_parser' | 'docx_parser';
  confidenceScore?: number;
  profileSchemaVersion?: string;
}

// ─── SRS JOB DESCRIPTION (FR-005) ──────────────────────────────────
export interface JobDescription {
  id: string;
  tenantId?: string;
  title: string;
  rawText: string;
  requiredSkills: string[];
  preferredSkills: string[];
  roleThemes: string[];
  seniorityLevel?: SeniorityLevel;
  parsedAt?: number;
  status: 'draft' | 'active' | 'archived';
}

// ─── SRS INTERVIEW PLAN (FR-006) ───────────────────────────────────
export interface StagePlan {
  stage: InterviewStage;
  targetDurationMinutes: number;
  targetQuestionCount: number;
  objective: string;
  isOptional: boolean;
}

export interface InterviewPlan {
  id: string;
  totalDurationMinutes: number;
  stages: StagePlan[];
  plannedQuestions: {
    stage: InterviewStage;
    topic: string;
    targetClaimId?: string;
    difficulty: number;
  }[];
  createdAt: number;
}

export interface InterviewConfig {
  roleTitle: string;
  seniority: SeniorityLevel;
  durationMinutes: number;
  focusArea: InterviewFocus;
  rigorLevel: RigorLevel;
  tenantId?: string;
  jobDescriptionId?: string;
  jobDescriptionText?: string;
  parsedJD?: JobDescription;
  language?: string;
  mode?: 'text' | 'voice' | 'coding';
  retakeOfSessionId?: string;
  targetedTopics?: string[];
}

// ─── SRS REALTIME TURN & QUESTION GROUNDING ────────────────────────
export interface QuestionQualityGateResult {
  approved: boolean;
  score: number;
  reasons: string[];
  isDuplicate: boolean;
  duplicateSimilarity?: number;
  adjustedQuestion?: string;
}

export interface ConversationTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  text: string;
  timestamp: number;
  stage?: InterviewStage;
  anchoredClaimId?: string;
  claimDepthLevel?: number;
  detectedEntities?: string[];
  evaluationNote?: string;
  audioPath?: string;
  sttConfidence?: number;
  qualityGate?: QuestionQualityGateResult;
  latencyMs?: number;
}

export interface EvidenceItem {
  id: string;
  claimId: string;
  claimAssertion: string;
  candidateQuote: string;
  assessmentVerdict: 'Strong Validation' | 'Moderate Evidence' | 'Superficial / Vague' | 'Potential Inconsistency';
  reasoning: string;
  stage?: InterviewStage;
}

export interface EvaluationDimension {
  score: number; // 0 - 100
  label: string;
  summary: string;
  evidenceQuotes: string[];
}

export interface SkillAssessment {
  skill: string;
  category: string;
  score: number; // 0 - 100
  confidence: number; // 0 - 100
  evidenceQuotes: string[];
  gapIdentified?: string;
}

export interface AIUsageRecord {
  id: string;
  interviewId?: string;
  tenantId?: string;
  operation: 'resume_parse' | 'interview_plan' | 'question_gen' | 'question_val' | 'answer_eval' | 'report_gen' | 'jd_parse';
  provider: 'gemini' | 'openai' | 'groq' | 'local';
  model: string;
  inputTokens: number;
  outputTokens: number;
  audioSeconds?: number;
  latencyMs: number;
  estimatedCostUsd: number;
  timestamp: number;
}

export interface CandidateFeedback {
  id: string;
  interviewId: string;
  tenantId?: string;
  userId?: string;
  rating: number; // 1 - 5
  flagType?: 'scoring_inaccurate' | 'question_irrelevant' | 'audio_glitch' | 'interruption_issue' | 'other';
  comments: string;
  createdAt: number;
}

export interface AuditLogRecord {
  id: string;
  tenantId?: string;
  userId?: string;
  action: 'resume_upload' | 'interview_start' | 'interview_complete' | 'report_view' | 'feedback_submit' | 'admin_change' | 'retake_started';
  entityType: 'resume' | 'candidate' | 'interview' | 'report' | 'user' | 'tenant';
  entityId: string;
  metadataJson?: Record<string, any>;
  timestamp: number;
}

export interface EvaluationReport {
  id: string;
  sessionId: string;
  version: number;
  candidateName: string;
  targetRole: string;
  seniority: string;
  completedAt: string;
  durationMinutesSpent: number;
  totalTurns: number;
  overallScore: number; // 0 - 100
  roleReadiness: 'Immediate Match' | 'Ready with Minor Onboarding' | 'Needs Targeted Upskilling' | 'Not Currently Ready';
  recommendation: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Follow-Up' | 'Do Not Hire';
  executiveSummary: string;
  dimensions: {
    technicalCompetency: EvaluationDimension;
    roleCompetency?: EvaluationDimension;
    problemSolving: EvaluationDimension;
    communication: EvaluationDimension;
    experienceDepth: EvaluationDimension;
    resumeCredibility: EvaluationDimension;
  };
  skillAssessments?: SkillAssessment[];
  strengths: {
    title: string;
    description: string;
    quote: string;
  }[];
  weaknesses: {
    title: string;
    description: string;
    quote: string;
  }[];
  verificationAreas: {
    area: string;
    issueFound: string;
    suggestedOnsiteQuestion: string;
  }[];
  evidenceItems: EvidenceItem[];
  aiUsageSummary?: {
    totalTokens: number;
    totalLatencyMs: number;
    totalCostUsd: number;
    provider: string;
    model: string;
  };
}

export interface InterviewSession {
  id: string;
  tenantId?: string;
  userId?: string;
  candidate: CandidateProfile;
  config: InterviewConfig;
  plan?: InterviewPlan;
  currentStage: InterviewStage;
  stageSequenceIndex: number;
  stageHistory: {
    stage: InterviewStage;
    enteredAt: number;
    exitedAt?: number;
    turnCount: number;
  }[];
  turns: ConversationTurn[];
  currentClaimIndex: number;
  currentClaimDepth: number;
  difficultyLevel: number; // 1 - 5
  status: InterviewStateStatus;
  startedAt: number;
  completedAt?: number;
  reconnectCount?: number;
  evaluationReport?: EvaluationReport;
  usageRecords?: AIUsageRecord[];
}
