'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Layers, MessageSquare, Cpu, CheckCircle2 } from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStart }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Simulated adaptive interview sequence on the landing hero
  const demoDialogue = [
    {
      claim: 'Resume Claim: "Built a Node.js API handling 100,000 users."',
      aiPrompt: 'What was your role in building that API?',
      candidateAnswer: 'I designed the backend and handled the database.',
      nextFollowUp: 'What database did you use and why did you choose it?'
    },
    {
      claim: 'Investigating Technology Choice: PostgreSQL + Redis',
      aiPrompt: 'What database did you use and why did you choose it over alternatives?',
      candidateAnswer: 'PostgreSQL with Redis caching for hot session data.',
      nextFollowUp: 'How did you handle performance and connection pooling when traffic surged?'
    },
    {
      claim: 'Investigating Scalability: 100,000 Peak Users',
      aiPrompt: 'How did you handle performance when traffic increased?',
      candidateAnswer: 'Used PgBouncer connection pooling and read replicas.',
      nextFollowUp: 'Verified! Evidence logged to candidate credibility report.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % demoDialogue.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [demoDialogue.length]);

  const currentDemo = demoDialogue[activeStepIndex];

  return (
    <div style={{ paddingTop: '3.5rem', paddingBottom: '4.5rem' }}>
      {/* Top Banner Tag */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div 
          className="badge badge-indigo"
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.82rem',
            borderRadius: '9999px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.25)',
            border: '1px solid rgba(99, 102, 241, 0.4)'
          }}
        >
          <Sparkles size={14} color="#818cf8" />
          <span>Zero Static Question Lists • 100% Adaptive Follow-ups</span>
        </div>
      </div>

      {/* Main Hero Header */}
      <div style={{ textAlign: 'center', maxWidth: '880px', margin: '0 auto 2.5rem' }}>
        <h1 style={{
          fontSize: 'clamp(2.3rem, 5vw, 3.8rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '1.25rem'
        }}>
          The AI Interviewer That <br />
          <span className="text-gradient-primary">Directly Probes & Verifies Claims</span>
        </h1>
        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          maxWidth: '720px',
          margin: '0 auto'
        }}>
          Upload any engineering resume. The AI extracts technical assertions, initiates an adaptive deep-dive, and investigates candidate answers in real time—generating evidence-based credibility reports.
        </p>
      </div>

      {/* CTA Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3.5rem' }}>
        <button 
          onClick={onStart}
          className="btn btn-primary"
          style={{ fontSize: '1.05rem', padding: '0.9rem 2.2rem', borderRadius: '12px' }}
        >
          <span>Start Interview Now</span>
          <ArrowRight size={18} />
        </button>
        <button 
          onClick={() => {
            const section = document.getElementById('how-it-works');
            section?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="btn btn-secondary"
          style={{ fontSize: '1.05rem', padding: '0.9rem 1.75rem', borderRadius: '12px' }}
        >
          <span>See How It Works</span>
        </button>
      </div>

      {/* Live Interactive Reasoning Engine Preview Card */}
      <div style={{ maxWidth: '920px', margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '1.75rem', border: '1px solid rgba(99, 102, 241, 0.3)', position: 'relative', overflow: 'hidden' }}>
          {/* Top Status Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                adaptive_engine_session.ts [LIVE INFERENCE]
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                Turn {activeStepIndex + 1} of 3
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                Memory Active
              </span>
            </div>
          </div>

          {/* Active Claim Target Banner */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px dashed rgba(99, 102, 241, 0.35)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Zap size={16} color="#818cf8" />
              <span style={{ fontSize: '0.85rem', color: '#c7d2fe', fontFamily: 'var(--font-mono)' }}>
                {currentDemo.claim}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              Dynamic Probe Level {activeStepIndex + 1}
            </span>
          </div>

          {/* Simulated Dialogue Sequence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* AI Question */}
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Cpu size={16} color="#ffffff" />
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '0.85rem 1.1rem',
                maxWidth: '85%'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: 700, marginBottom: '0.2rem' }}>
                  AI INTERVIEWER (Contextual Inception)
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  "{currentDemo.aiPrompt}"
                </div>
              </div>
            </div>

            {/* Candidate Answer */}
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>YOU</span>
              </div>
              <div style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '0.85rem 1.1rem',
                maxWidth: '85%',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '0.2rem' }}>
                  CANDIDATE RESPONSE
                </div>
                <div style={{ fontSize: '0.95rem', color: '#f8fafc', lineHeight: 1.5 }}>
                  "{currentDemo.candidateAnswer}"
                </div>
              </div>
            </div>

            {/* AI Dynamic Follow-up */}
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={16} color="#ffffff" />
              </div>
              <div style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                padding: '0.85rem 1.1rem',
                maxWidth: '85%'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.2rem' }}>
                  AI DYNAMIC FOLLOW-UP (Investigating Previous Answer)
                </div>
                <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 500, lineHeight: 1.5 }}>
                  "{currentDemo.nextFollowUp}"
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1.5rem' }}>
            {demoDialogue.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStepIndex(i)}
                style={{
                  width: i === activeStepIndex ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === activeStepIndex ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
