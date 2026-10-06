'use client';

import React, { useState } from 'react';
import { CandidateProfile, InterviewConfig, InterviewFocus, JobDescription, RigorLevel, SeniorityLevel } from '@/lib/types';
import { Sliders, Clock, Target, Shield, Zap, Sparkles, ArrowRight, FileText, Mic, MessageSquare } from 'lucide-react';
import { JDParser } from '@/lib/engine/jdParser';

interface InterviewSetupProps {
  profile: CandidateProfile;
  onStartInterview: (config: InterviewConfig) => void;
  onBack: () => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({ profile, onStartInterview, onBack }) => {
  const [roleTitle, setRoleTitle] = useState(profile.title || 'Professional');
  const [seniority, setSeniority] = useState<SeniorityLevel>(
    profile.experienceYears >= 8 ? 'Staff / Lead' : profile.experienceYears >= 4 ? 'Senior' : profile.experienceYears >= 2 ? 'Mid-Level' : 'Junior'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [focusArea, setFocusArea] = useState<InterviewFocus>('Core Competencies & Claim Verification');
  const [rigorLevel, setRigorLevel] = useState<RigorLevel>('Rigorous & Challenging');
  const [interviewMode, setInterviewMode] = useState<'voice' | 'text'>('voice');
  const [showJDInput, setShowJDInput] = useState(false);
  const [jobDescriptionText, setJobDescriptionText] = useState('');

  const seniorityOptions: SeniorityLevel[] = [
    'Junior', 'Mid-Level', 'Senior', 'Staff / Lead', 'Principal / Architect', 'Executive / Director'
  ];

  const durationOptions = [
    { mins: 5, label: '5 Min Drill', desc: '4 adaptive turns • Quick claim verification' },
    { mins: 15, label: '15 Min Standard', desc: '6-8 turns across SRS stages • Full competency probe' },
    { mins: 30, label: '30 Min Comprehensive', desc: '10-12 turns across all 11 stages • Deep evaluation' }
  ];

  const focusOptions: { title: InterviewFocus; desc: string }[] = [
    { title: 'Core Competencies & Claim Verification', desc: 'Validates authenticity of documented achievements, skills, and outcomes' },
    { title: 'Problem Solving & Strategic Decisions', desc: 'Investigates decision-making logic, alternatives considered, and professional rationale' },
    { title: 'Process, Operations & Execution', desc: 'Evaluates end-to-end workflows, execution discipline, and project delivery' },
    { title: 'Leadership & Stakeholder Management', desc: 'Probes cross-functional leadership, negotiation, alignment, and team direction' },
    { title: 'Domain Expertise & Scenario Handling', desc: 'Tests deep subject-matter knowledge, industry standards, and hands-on scenarios' }
  ];

  const rigorOptions: { title: RigorLevel; desc: string; badge: string }[] = [
    { title: 'Constructive & Thorough', desc: 'Supportive tone, asks guided follow-ups to extract professional depth', badge: 'badge-emerald' },
    { title: 'Rigorous & Challenging', desc: 'Directly challenges assumptions, explores edge cases and operational limits', badge: 'badge-indigo' },
    { title: 'High-Bar Executive Standard', desc: 'Intensive evaluation of strategic judgment, measurable impact, and accountability', badge: 'badge-rose' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedJD: JobDescription | undefined;
    if (jobDescriptionText.trim()) {
      parsedJD = JDParser.parseJobDescription(jobDescriptionText, roleTitle);
    }

    onStartInterview({
      roleTitle,
      seniority,
      durationMinutes,
      focusArea,
      rigorLevel,
      mode: interviewMode,
      jobDescriptionText: jobDescriptionText.trim() || undefined,
      parsedJD
    });
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge badge-cyan" style={{ marginBottom: '0.4rem' }}>
          Step 3 of 4 • Interview Calibration (SRS FR-006)
        </span>
        <h2 style={{ fontSize: '2.3rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '0.5rem' }}>
          Configure Interview Parameters
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Calibrate the AI interviewer's target role, evaluation depth, and adaptive questioning rigor for <strong>{profile.name}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Target Job Role & Seniority */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Target size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Target Job Role & Seniority
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 600 }}>
                Job Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 600 }}>
                Seniority Level
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              >
                {seniorityOptions.map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#0f172a', color: '#fff' }}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selector */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>
              Interview Interaction Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                onClick={() => setInterviewMode('voice')}
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${interviewMode === 'voice' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  background: interviewMode === 'voice' ? 'rgba(6,182,212,0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <Mic size={18} color={interviewMode === 'voice' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Realtime Voice & Audio</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Streamed STT/TTS with live speech synthesis</div>
                </div>
              </div>

              <div
                onClick={() => setInterviewMode('text')}
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: `1.5px solid ${interviewMode === 'text' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  background: interviewMode === 'text' ? 'rgba(6,182,212,0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <MessageSquare size={18} color={interviewMode === 'text' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Text Conversation</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Low-bandwidth conversational text mode</div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Job Description Accordion */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div
              onClick={() => setShowJDInput(!showJDInput)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#38bdf8' }}>
                  {showJDInput ? '▼ Hide Target Job Description' : '▶ Map to Target Job Description (Optional - FR-005)'}
                </span>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>P1 Requirement</span>
            </div>

            {showJDInput && (
              <div style={{ marginTop: '0.85rem' }}>
                <textarea
                  rows={4}
                  placeholder="Paste target Job Description text here. The engine will extract required/preferred skills and role themes to align interview questions directly to this JD."
                  value={jobDescriptionText}
                  onChange={(e) => setJobDescriptionText(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Duration & Rigor */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Clock size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Interview Duration & Pacing
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {durationOptions.map((opt) => (
              <div
                key={opt.mins}
                onClick={() => setDurationMinutes(opt.mins)}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${durationMinutes === opt.mins ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  background: durationMinutes === opt.mins ? 'rgba(6, 182, 212, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {opt.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Focus Area */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Sliders size={18} color="#c084fc" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Primary Evaluation Focus
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
            {focusOptions.map((opt) => (
              <div
                key={opt.title}
                onClick={() => setFocusArea(opt.title)}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${focusArea === opt.title ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                  background: focusArea === opt.title ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 0, 0, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {opt.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rigor Level */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Shield size={18} color="#f43f5e" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Questioning Rigor & Standard
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {rigorOptions.map((opt) => (
              <div
                key={opt.title}
                onClick={() => setRigorLevel(opt.title)}
                style={{
                  padding: '1.1rem',
                  borderRadius: '10px',
                  border: `1.5px solid ${rigorLevel === opt.title ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                  background: rigorLevel === opt.title ? 'rgba(244, 63, 94, 0.08)' : 'rgba(0, 0, 0, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>{opt.title}</div>
                  <span className={`badge ${opt.badge}`} style={{ fontSize: '0.68rem' }}>Standard</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {opt.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '0.85rem 1.75rem' }}
          >
            ← Back to Profile
          </button>

          <button
            type="submit"
            className="btn btn-primary glow-cyan"
            style={{ padding: '0.85rem 2.25rem', fontSize: '1.02rem', gap: '0.65rem' }}
          >
            Launch Calibrated Interview
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
