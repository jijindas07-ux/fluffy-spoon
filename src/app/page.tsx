'use client';

import React, { useState } from 'react';
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

type AppStep = 'landing' | 'upload' | 'profile' | 'setup' | 'interview' | 'report';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AppStep>('landing');
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleStartFromLanding = () => {
    setCurrentStep('upload');
  };

  const handleProfileParsed = (profile: CandidateProfile) => {
    setCandidateProfile(profile);
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
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          config,
          clientLLMConfig
        })
      });
      const data = await res.json();
      if (data.success && data.session) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: interviewSession.id,
          clientLLMConfig
        })
      });
      const data = await res.json();
      if (data.success && data.report) {
        setEvaluationReport(data.report);
        setCurrentStep('report');
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('landing');
    setCandidateProfile(null);
    setInterviewSession(null);
    setEvaluationReport(null);
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
            profile={candidateProfile}
            onProceed={handleProceedToSetup}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'setup' && candidateProfile && (
          <InterviewSetup
            profile={candidateProfile}
            onStartInterview={handleStartInterview}
            onBack={() => setCurrentStep('profile')}
          />
        )}

        {currentStep === 'interview' && interviewSession && (
          <LiveInterview
            session={interviewSession}
            onComplete={handleCompleteInterview}
          />
        )}

        {currentStep === 'report' && evaluationReport && (
          <EvaluationReportView
            report={evaluationReport}
            onRestart={handleReset}
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
          <p>© 2026 VerveAI Autonomous Adaptive Interview Platform. Powered by LLM & Cognitive Semantic Engine.</p>
        </div>
      </footer>
    </div>
  );
}
