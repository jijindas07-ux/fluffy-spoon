export type SeniorityLevel = 'Junior' | 'Mid-Level' | 'Senior' | 'Staff / Lead' | 'Principal / Architect';
export type InterviewFocus = 'System Architecture & Scale' | 'Deep Technical Verification' | 'Problem Solving & Trade-offs' | 'Full-Stack Engineering' | 'Practical Debugging & Reliability';
export type RigorLevel = 'Constructive & Thorough' | 'Rigorous & Challenging' | 'High-Bar FAANG Style';

export interface ResumeClaim {
  id: string;
  rawClaim: string;
  category: 'Scale & Traffic' | 'Architecture' | 'Performance & Latency' | 'Database & Storage' | 'Reliability & CI/CD' | 'Leadership';
  contextProject: string;
  claimedMetrics: string;
  confidenceLevel: 'High' | 'Medium' | 'Needs Deep-Dive';
  verificationStatus: 'Pending' | 'Probing' | 'Verified' | 'Unverified' | 'Questionable';
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

export interface CandidateProfile {
  id: string;
  name: string;
  title: string;
  email?: string;
  experienceYears: number;
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
  claims: ResumeClaim[];
  rawExtractedText?: string;
  scannedKeyPoints?: string[];
  parserSource?: 'gemini_multimodal' | 'gemini_text' | 'direct_pdf_parser';
}

export interface InterviewConfig {
  roleTitle: string;
  seniority: SeniorityLevel;
  durationMinutes: number;
  focusArea: InterviewFocus;
  rigorLevel: RigorLevel;
}

export interface ConversationTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  text: string;
  timestamp: number;
  anchoredClaimId?: string;
  claimDepthLevel?: number; // 1: Inception/Role, 2: Decision/Architecture, 3: Scale/Edge-case, 4: Retrospective
  detectedEntities?: string[];
  evaluationNote?: string;
}

export interface EvidenceItem {
  id: string;
  claimId: string;
  claimAssertion: string;
  candidateQuote: string;
  assessmentVerdict: 'Strong Validation' | 'Moderate Evidence' | 'Superficial / Vague' | 'Potential Inconsistency';
  reasoning: string;
}

export interface EvaluationDimension {
  score: number; // 0 - 100
  label: string;
  summary: string;
  evidenceQuotes: string[];
}

export interface EvaluationReport {
  id: string;
  sessionId: string;
  candidateName: string;
  targetRole: string;
  seniority: string;
  completedAt: string;
  durationMinutesSpent: number;
  totalTurns: number;
  overallScore: number; // 0 - 100
  recommendation: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Needs Follow-Up' | 'Do Not Hire';
  executiveSummary: string;
  dimensions: {
    technicalCompetency: EvaluationDimension;
    problemSolving: EvaluationDimension;
    communication: EvaluationDimension;
    experienceDepth: EvaluationDimension;
    resumeCredibility: EvaluationDimension;
  };
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
}

export interface InterviewSession {
  id: string;
  candidate: CandidateProfile;
  config: InterviewConfig;
  turns: ConversationTurn[];
  currentClaimIndex: number;
  currentClaimDepth: number;
  status: 'initialized' | 'in_progress' | 'completed';
  startedAt: number;
  completedAt?: number;
  evaluationReport?: EvaluationReport;
}
