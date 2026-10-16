'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { LandingHero } from '@/components/LandingHero';
import { HowItWorks } from '@/components/HowItWorks';
import { ResumeUpload } from '@/components/ResumeUpload';
import { CandidateProfileView } from '@/components/CandidateProfile';
import { InterviewSetup } from '@/components/InterviewSetup';
import { LiveInterview } from '@/components/LiveInterview';
import { EvaluationReportView } from '@/components/EvaluationReport';
import { CandidateProfile, EvaluationReport, InterviewConfig, InterviewSession } from '@/lib/types';
import { StoredAISettings } from '@/components/AISettingsModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { SAMPLE_REPORT } from '@/lib/data/sampleReport';

type AppStep = 'landing' | 'upload' | 'profile' | 'setup' | 'interview' | 'report';

const SESSION_PERSIST_KEY = 'verveai_active_session';
const CANDIDATE_PERSIST_KEY = 'verveai_active_candidate';

function HomeInner() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  // Check for demo report or interview in search params
  useEffect(() => {
    const demoParam = searchParams.get('demo') || searchParams.get('step');
    if (demoParam === 'report') {
      setEvaluationReport(SAMPLE_REPORT);
      setCurrentStep('report');
    } else if (demoParam === 'interview') {
      const demoCandidate: CandidateProfile = {
        id: 'cand-demo-1',
        name: 'Sarah Jenkins',
        title: 'Senior Full Stack Engineer',
        experienceYears: 6,
        summary: 'Senior engineer specializing in distributed systems and cloud architecture.',
        skills: {
          languages: ['TypeScript', 'Python', 'Go'],
          frameworks: ['React', 'Next.js', 'Node.js'],
          databases: ['PostgreSQL', 'Redis'],
          toolsAndInfra: ['Docker', 'Kubernetes', 'AWS', 'CI/CD']
        },
        projects: [],
        education: [{ degree: 'B.Tech in Computer Science', institution: 'MIT', year: '2019' }],
        claims: []
      };
      const demoSession: InterviewSession = {
        id: 'sess-demo-interview',
        candidate: demoCandidate,
        config: {
          roleTitle: 'Senior Full-Stack Developer',
          seniority: 'Senior',
          durationMinutes: 15,
          focusArea: 'Deep Technical Verification',
          rigorLevel: 'Rigorous & Challenging',
          mode: 'text'
        },
        currentStage: 'TECHNICAL',
        stageSequenceIndex: 2,
        stageHistory: [{ stage: 'TECHNICAL', enteredAt: Date.now(), turnCount: 3 }],
        currentClaimIndex: 0,
        currentClaimDepth: 1,
        difficultyLevel: 3,
        status: 'in_progress',
        startedAt: Date.now(),
        turns: [
          {
            id: 'turn-1',
            speaker: 'ai',
            text: 'Hello Sarah, welcome to your technical interview. Can you walk me through your experience designing microservices with high throughput and low latency?',
            timestamp: Date.now() - 60000,
            stage: 'TECHNICAL'
          },
          {
            id: 'turn-2',
            speaker: 'candidate',
            text: 'At my previous role, I architected our core checkout service using Node.js and gRPC. We implemented Redis caching and connection pooling to reduce p99 response times from 350ms to 45ms while sustaining 25,000 requests per second.',
            timestamp: Date.now() - 30000,
            stage: 'TECHNICAL'
          },
          {
            id: 'turn-3',
            speaker: 'ai',
            text: 'That is impressive. How did you handle cache invalidation and ensure strong consistency during concurrent checkout spikes?',
            timestamp: Date.now() - 10000,
            stage: 'TECHNICAL',
            anchoredClaimId: 'claim-checkout-latency'
          }
        ]
      };
      setCandidateProfile(demoCandidate);
      setInterviewSession(demoSession);
      setCurrentStep('interview');
    }
  }, [searchParams]);

  // Attempt to restore in-progress session from localStorage after mount
  useEffect(() => {
    if (hasRestoredSession) return;
    setHasRestoredSession(true);

    try {
      const savedSessionJson = localStorage.getItem(SESSION_PERSIST_KEY);
      const savedCandidateJson = localStorage.getItem(CANDIDATE_PERSIST_KEY);

      if (savedSessionJson && savedCandidateJson) {
        const savedSession: InterviewSession = JSON.parse(savedSessionJson);
        const savedCandidate: CandidateProfile = JSON.parse(savedCandidateJson);

        if (savedSession && savedSession.status === 'in_progress' && savedSession.turns.length > 0) {
          console.log(`[RESTORE] Found in-progress session ${savedSession.id} for ${savedCandidate.name}. Restoring...`);
          setCandidateProfile(savedCandidate);
          setInterviewSession(savedSession);
          setCurrentStep('interview');
        }
      }
    } catch (e) {
      console.warn('[RESTORE] Failed to restore session from localStorage:', e);
    }
  }, [hasRestoredSession]);

  // Persist active session to localStorage on changes
  useEffect(() => {
    if (interviewSession && interviewSession.status === 'in_progress') {
      localStorage.setItem(SESSION_PERSIST_KEY, JSON.stringify(interviewSession));
      if (candidateProfile) {
        localStorage.setItem(CANDIDATE_PERSIST_KEY, JSON.stringify(candidateProfile));
      }
    }
  }, [interviewSession, candidateProfile]);

  const getStoredLLMConfig = () => {
    const saved = localStorage.getItem('verve_ai_settings');
    if (saved) {
      try {
        const parsed: StoredAISettings = JSON.parse(saved);
        if (parsed.apiKey && parsed.provider !== 'local') {
          return parsed;
        }
      } catch (e) {}
    }
    return undefined;
  };

  const getAuthHeaders = (): Record<string, string> => {
    const t = token || localStorage.getItem('verveai_token');
    return t ? { 'Authorization': `Bearer ${t}` } : {};
  };

  const handleStartFromLanding = () => {
    setCurrentStep('upload');
  };

  const handleProfileParsed = (profile: CandidateProfile) => {
    console.log(`[STATE] New profile loaded: ${profile.id} (${profile.name}). Resetting session & evaluation report.`);
    setCandidateProfile(profile);
    setInterviewSession(null);
    setEvaluationReport(null);
    localStorage.removeItem(SESSION_PERSIST_KEY);
    localStorage.removeItem(CANDIDATE_PERSIST_KEY);
    setCurrentStep('profile');
  };

  const handleProceedToSetup = () => {
    setCurrentStep('setup');
  };

  const handleStartInterview = async (config: InterviewConfig) => {
    if (!candidateProfile) return;
    setIsLoading(true);
    try {
      const clientLLMConfig = getStoredLLMConfig();
      console.log(`[INTERVIEW ENGINE] Starting interview for candidate ${candidateProfile.id} (${candidateProfile.name})`);
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          candidateProfile,
          config,
          clientLLMConfig,
          userId: user?.id
        })
      });
      const data = await res.json();
      if (data.success && data.session) {
        console.log(`[INTERVIEW ENGINE] Session started: ${data.session.id} for candidate ${data.session.candidate.id}`);
        setInterviewSession(data.session);
        setCurrentStep('interview');
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (!interviewSession) return;
    setIsLoading(true);
    try {
      const clientLLMConfig = getStoredLLMConfig();
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          sessionId: interviewSession.id,
          clientLLMConfig,
          userId: user?.id
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setEvaluationReport(data.report);
        localStorage.removeItem(SESSION_PERSIST_KEY);
        localStorage.removeItem(CANDIDATE_PERSIST_KEY);
        setCurrentStep('report');
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Targeted Retake Practice (FR-016)
  const handleRetakePractice = async (weakTopics: string[]) => {
    if (!candidateProfile || !interviewSession) return;
    setIsLoading(true);
    try {
      const retakeConfig: InterviewConfig = {
        ...interviewSession.config,
        durationMinutes: 10,
        retakeOfSessionId: interviewSession.id,
        targetedTopics: weakTopics
      };
      await handleStartInterview(retakeConfig);
    } catch (err) {
      console.error('Retake error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    console.log(`[STATE] Global application reset`);
    setCurrentStep('landing');
    setCandidateProfile(null);
    setInterviewSession(null);
    setEvaluationReport(null);
    localStorage.removeItem(SESSION_PERSIST_KEY);
    localStorage.removeItem(CANDIDATE_PERSIST_KEY);
  };

  const handleSessionUpdate = (updatedSession: InterviewSession) => {
    setInterviewSession(updatedSession);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header onReset={handleReset} currentStep={currentStep} />

      <main className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {currentStep === 'landing' && (
          <div>
            <LandingHero onStart={handleStartFromLanding} />
            <HowItWorks />
          </div>
        )}

        {currentStep === 'upload' && (
          <ResumeUpload onProfileParsed={handleProfileParsed} />
        )}

        {currentStep === 'profile' && candidateProfile && (
          <CandidateProfileView
            key={candidateProfile.id}
            profile={candidateProfile}
            onProceed={handleProceedToSetup}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'setup' && candidateProfile && (
          <InterviewSetup
            key={candidateProfile.id}
            profile={candidateProfile}
            onStartInterview={handleStartInterview}
            onBack={() => setCurrentStep('profile')}
          />
        )}

        {currentStep === 'interview' && interviewSession && (
          <LiveInterview
            key={interviewSession.id}
            session={interviewSession}
            onComplete={handleCompleteInterview}
            onSessionUpdate={handleSessionUpdate}
            userId={user?.id}
          />
        )}

        {currentStep === 'report' && evaluationReport && (
          <EvaluationReportView
            key={evaluationReport.id}
            report={evaluationReport}
            onRestart={handleReset}
            onRetakePractice={handleRetakePractice}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '2rem 0',
        backgroundColor: 'rgba(7, 9, 14, 0.95)',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-faint)'
      }}>
        <div className="container">
          <p>© 2026 Alphagrew AI Face-to-Face Interviewer · Developer Baseline AG-AII-SRS-001 · <a href="/dashboard" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>Dashboard</a> · <a href="/admin" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>Admin</a></p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-base)' }} />}>
      <HomeInner />
    </Suspense>
  );
}
