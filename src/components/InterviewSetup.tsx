'use client';

import React, { useState } from 'react';
import { CandidateProfile, InterviewConfig, InterviewFocus, RigorLevel, SeniorityLevel } from '@/lib/types';
import { Sliders, Clock, Target, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface InterviewSetupProps {
  profile: CandidateProfile;
  onStartInterview: (config: InterviewConfig) => void;
  onBack: () => void;
}

export const InterviewSetup: React.FC<InterviewSetupProps> = ({ profile, onStartInterview, onBack }) => {
  const [roleTitle, setRoleTitle] = useState(profile.title || 'Senior Backend Engineer');
  const [seniority, setSeniority] = useState<SeniorityLevel>('Senior');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [focusArea, setFocusArea] = useState<InterviewFocus>('System Architecture & Scale');
  const [rigorLevel, setRigorLevel] = useState<RigorLevel>('Rigorous & Challenging');

  const seniorityOptions: SeniorityLevel[] = [
    'Junior', 'Mid-Level', 'Senior', 'Staff / Lead', 'Principal / Architect'
  ];

  const durationOptions = [
    { mins: 5, label: '5 Min Drill', desc: '4 adaptive turns • Quick claim verification' },
    { mins: 15, label: '15 Min Standard', desc: '7 adaptive turns • Deep architecture probe' },
    { mins: 30, label: '30 Min Comprehensive', desc: '10 adaptive turns • Full system stress test' }
  ];

  const focusOptions: { title: InterviewFocus; desc: string }[] = [
    { title: 'System Architecture & Scale', desc: 'Probes high concurrency, caching, data modeling, and bottlenecks' },
    { title: 'Deep Technical Verification', desc: 'Validates authenticity of exact resume claims and tech stack choices' },
    { title: 'Problem Solving & Trade-offs', desc: 'Investigates engineering decision matrices and alternatives considered' },
    { title: 'Full-Stack Engineering', desc: 'Evaluates end-to-end frontend performance and backend contracts' },
    { title: 'Practical Debugging & Reliability', desc: 'Probes production incident response, metrics, and failover' }
  ];

  const rigorOptions: { title: RigorLevel; desc: string; badge: string }[] = [
    { title: 'Constructive & Thorough', desc: 'Supportive tone, asks guided follow-ups to extract depth', badge: 'badge-emerald' },
    { title: 'Rigorous & Challenging', desc: 'Directly challenges assumptions, explores edge cases and scale limits', badge: 'badge-indigo' },
    { title: 'High-Bar FAANG Style', desc: 'Intensive stress testing on scalability, race conditions, and tradeoffs', badge: 'badge-rose' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartInterview({
      roleTitle,
      seniority,
      durationMinutes,
      focusArea,
      rigorLevel
    });
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge badge-cyan" style={{ marginBottom: '0.4rem' }}>
          Step 3 of 4 • Interview Calibration
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
                  background: '#0e131f',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              >
                {seniorityOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Interview Duration */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Clock size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Interview Duration & Depth
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {durationOptions.map((opt) => (
              <div
                key={opt.mins}
                onClick={() => setDurationMinutes(opt.mins)}
                className="glass-card"
                style={{
                  padding: '1.15rem',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  border: durationMinutes === opt.mins ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: durationMinutes === opt.mins ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>{opt.label}</span>
                  {durationMinutes === opt.mins && <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>Selected</span>}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {opt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Focus Area */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Zap size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Primary Interview Focus
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {focusOptions.map((f) => (
              <div
                key={f.title}
                onClick={() => setFocusArea(f.title)}
                style={{
                  padding: '0.95rem 1.15rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: focusArea === f.title ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                  background: focusArea === f.title ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {f.desc}
                  </div>
                </div>
                {focusArea === f.title && (
                  <span className="badge badge-indigo" style={{ fontSize: '0.68rem', flexShrink: 0 }}>Active Focus</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Rigor Level */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Shield size={18} color="var(--accent-rose)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Interviewer Tone & Rigor
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {rigorOptions.map((r) => (
              <div
                key={r.title}
                onClick={() => setRigorLevel(r.title)}
                className="glass-card"
                style={{
                  padding: '1.15rem',
                  cursor: 'pointer',
                  border: rigorLevel === r.title ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: rigorLevel === r.title ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>{r.title}</span>
                  <span className={`badge ${r.badge}`} style={{ fontSize: '0.62rem' }}>
                    {r.title === rigorLevel ? 'Active' : 'Tone'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onBack} className="btn btn-secondary">
            Back to Profile
          </button>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '12px' }}>
            <Sparkles size={18} />
            <span>Launch Live Adaptive Interview</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
