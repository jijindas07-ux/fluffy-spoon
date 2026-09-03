-- AI Adaptive Interview Platform - PostgreSQL Schema
-- Supports Candidate profiles, Extracted claims, Adaptive interview sessions, Conversation turns, and Evidence reports.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    target_role VARCHAR(255),
    experience_years INTEGER DEFAULT 0,
    location VARCHAR(255),
    summary TEXT,
    skills JSONB NOT NULL DEFAULT '{}'::jsonb,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resume Claims Table
CREATE TABLE IF NOT EXISTS resume_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    raw_claim TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    context_project VARCHAR(255),
    claimed_metrics VARCHAR(255),
    confidence_level VARCHAR(50) DEFAULT 'High',
    verification_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Interview Sessions Table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    role_title VARCHAR(255) NOT NULL,
    seniority_level VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    focus_area VARCHAR(100) NOT NULL,
    rigor_level VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Conversation Turns Table
CREATE TABLE IF NOT EXISTS conversation_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    speaker VARCHAR(20) NOT NULL, -- 'ai' or 'candidate'
    message_text TEXT NOT NULL,
    anchored_claim_id UUID REFERENCES resume_claims(id) ON DELETE SET NULL,
    claim_depth_level INTEGER DEFAULT 1,
    detected_entities JSONB DEFAULT '[]'::jsonb,
    evaluation_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Evaluation Reports Table
CREATE TABLE IF NOT EXISTS evaluation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    overall_score INTEGER NOT NULL,
    recommendation VARCHAR(50) NOT NULL,
    technical_competency INTEGER NOT NULL,
    problem_solving INTEGER NOT NULL,
    communication INTEGER NOT NULL,
    experience_depth INTEGER NOT NULL,
    resume_credibility INTEGER NOT NULL,
    executive_summary TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Evidence Items Table (Quote to Claim mappings)
CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES evaluation_reports(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES resume_claims(id) ON DELETE SET NULL,
    claim_assertion TEXT NOT NULL,
    candidate_quote TEXT NOT NULL,
    assessment_verdict VARCHAR(100) NOT NULL,
    reasoning TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_claims_candidate_id ON resume_claims(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate_id ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_turns_session_id ON conversation_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_evidence_report_id ON evidence_items(report_id);
