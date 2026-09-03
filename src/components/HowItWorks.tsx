'use client';

import React from 'react';
import { FileSearch, GitBranch, Award, CheckCircle, ShieldAlert, Cpu, Database, Zap } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Resume Claim Parsing & Entity Graph',
      description: 'The engine parses candidate resumes to extract verifiable assertions, scale claims (e.g. 100k users), architectural choices, and latency numbers rather than simple keyword counts.',
      icon: FileSearch,
      accent: 'var(--primary)'
    },
    {
      step: '02',
      title: 'Adaptive Multi-Turn Investigation',
      description: 'Zero static scripts. The AI anchors on a claim, inquires about candidate ownership, and analyzes answers to generate deep follow-ups probing databases, concurrency, and trade-offs.',
      icon: GitBranch,
      accent: 'var(--accent-cyan)'
    },
    {
      step: '03',
      title: 'Evidence-Based Credibility Report',
      description: 'After the session, the AI outputs an evaluation grading technical depth and resume credibility—citing exact candidate quotes as evidence behind every score.',
      icon: Award,
      accent: 'var(--accent-emerald)'
    }
  ];

  return (
    <section id="how-it-works" style={{ padding: '4.5rem 0', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <span className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
          Autonomous Intelligence
        </span>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          How the Adaptive Engine Works
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Designed to eliminate generic interview bots by maintaining dynamic state, memory, and context across the entire conversation.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3.5rem'
      }}>
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={idx}
              className="glass-card glass-card-interactive"
              style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `rgba(99, 102, 241, 0.1)`,
                  border: `1px solid ${s.accent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={22} color={s.accent} />
                </div>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.15)', fontFamily: 'var(--font-mono)' }}>
                  {s.step}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.65rem', color: '#ffffff' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {s.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Grid */}
      <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.75rem', textAlign: 'center' }}>
          VerveAI Adaptive Engine vs Traditional Interview Bots
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {/* Traditional bots */}
          <div style={{
            background: 'rgba(244, 63, 94, 0.05)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fda4af', fontWeight: 700, marginBottom: '1rem' }}>
              <ShieldAlert size={18} />
              <span>Traditional Interview Bots</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <li>❌ Fixed, scripted question lists regardless of answer</li>
              <li>❌ Ignores resume claims or treats them as keyword counts</li>
              <li>❌ Cannot detect hand-waving or superficial answers</li>
              <li>❌ Superficial score without quote-level evidence</li>
            </ul>
          </div>

          {/* VerveAI */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '1rem' }}>
              <CheckCircle size={18} />
              <span>VerveAI Adaptive Platform</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <li>✅ Dynamic multi-turn follow-ups targeting exact candidate answers</li>
              <li>✅ Direct claim anchoring (e.g. 100k users, Redis cache, Kafka)</li>
              <li>✅ Probes architectural trade-offs, scaling limits & failure modes</li>
              <li>✅ Complete audit report with verbatim candidate citations</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
