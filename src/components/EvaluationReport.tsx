'use client';

import React, { useEffect } from 'react';
import { EvaluationReport as EvaluationReportType } from '@/lib/types';
import { Award, CheckCircle2, AlertTriangle, ShieldCheck, FileText, ArrowRight, Printer, Share2, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EvaluationReportProps {
  report: EvaluationReportType;
  onRestart: () => void;
}

export const EvaluationReportView: React.FC<EvaluationReportProps> = ({ report, onRestart }) => {
  useEffect(() => {
    if (report.overallScore >= 75) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe fallback if canvas is not initialized
      }
    }
  }, [report.overallScore]);

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'Strong Hire':
        return 'badge-emerald';
      case 'Hire':
      case 'Leaning Hire':
        return 'badge-indigo';
      case 'Needs Follow-Up':
        return 'badge-amber';
      default:
        return 'badge-rose';
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'Strong Validation':
        return 'badge-emerald';
      case 'Moderate Evidence':
        return 'badge-cyan';
      case 'Superficial / Vague':
        return 'badge-amber';
      default:
        return 'badge-rose';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1.5rem 0.75rem 4rem' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-emerald" style={{ marginBottom: '0.4rem' }}>
            Evaluation Complete • Evidence Verified
          </span>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Candidate Credibility & Assessment Report
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '0.6rem 1.15rem' }}>
            <Printer size={16} />
            <span>Export / Print</span>
          </button>
          <button onClick={onRestart} className="btn btn-primary" style={{ padding: '0.6rem 1.35rem' }}>
            <span>Start New Candidate</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Executive Summary & Overall Score Card */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                {report.candidateName}
              </span>
              <span className={`badge ${getRecommendationBadge(report.recommendation)}`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                {report.recommendation}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '1rem', fontWeight: 600 }}>
              {report.seniority} {report.targetRole} • {report.totalTurns} Multi-Turn Questions
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.6 }}>
              {report.executiveSummary}
            </p>
          </div>

          {/* Overall Score Dial */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Overall Technical Score
            </div>
            <div style={{
              fontSize: '3.8rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
              background: report.overallScore >= 80
                ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              {report.overallScore}<span style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
              Calibrated against {report.seniority} Engineering Benchmarks
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Competency Dimensions Breakdown */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
            5-Dimension Competency & Credibility Breakdown
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {Object.entries(report.dimensions).map(([key, dim]) => (
            <div key={key} className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>{dim.label}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: dim.score >= 85 ? '#6ee7b7' : dim.score >= 70 ? '#a5b4fc' : '#fda4af'
                }}>
                  {dim.score}/100
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{
                  width: `${dim.score}%`,
                  height: '100%',
                  background: dim.score >= 85 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #6366f1, #818cf8)'
                }} />
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {dim.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence-Based Claim Verification Table (Crucial Feature) */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <ShieldCheck size={20} color="var(--accent-emerald)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              Evidence-Based Claim Verification (Quote Citations)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Verifiable mappings comparing resume claims against candidate direct verbal answers during adaptive questioning.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {report.evidenceItems.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Claim #{idx + 1}
                </div>
                <span className={`badge ${getVerdictBadge(item.assessmentVerdict)}`} style={{ fontSize: '0.7rem' }}>
                  {item.assessmentVerdict}
                </span>
              </div>

              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                "{item.claimAssertion}"
              </div>

              {/* Verbatim Candidate Quote */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                borderLeft: '3px solid var(--primary)',
                padding: '0.6rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.86rem',
                color: '#c7d2fe',
                lineHeight: 1.45,
                fontStyle: 'italic'
              }}>
                Candidate Answer: {item.candidateQuote}
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                <strong>AI Reasoning:</strong> {item.reasoning}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Strengths */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '1rem' }}>
            <CheckCircle2 size={18} />
            <span>Key Demonstrated Strengths</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {report.strengths.map((st, i) => (
              <div key={i} style={{ borderBottom: i < report.strengths.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                  {st.title}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '0.4rem' }}>
                  {st.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontStyle: 'italic' }}>
                  Evidence: {st.quote}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses / Growth Areas */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fda4af', fontWeight: 700, marginBottom: '1rem' }}>
            <AlertTriangle size={18} />
            <span>Areas for Technical Growth</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {report.weaknesses.map((wk, i) => (
              <div key={i} style={{ borderBottom: i < report.weaknesses.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                  {wk.title}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {wk.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Areas Requiring Further Verification & Suggested Onsite Questions */}
      <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HelpCircle size={18} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
            Areas Requiring Further Verification (Recommended Follow-Ups)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {report.verificationAreas.map((va, idx) => (
            <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#fcd34d', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                {va.area}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {va.issueFound}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#c7d2fe', background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                💡 <strong>Suggested On-Site Question:</strong> "{va.suggestedOnsiteQuestion}"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onRestart} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '12px' }}>
          <Sparkles size={18} />
          <span>Conduct Another Interview</span>
        </button>
      </div>
    </div>
  );
};
