'use client';

import React, { useEffect, useState } from 'react';
import { EvaluationReport as EvaluationReportType } from '@/lib/types';
import {
  Award, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight,
  Printer, TrendingUp, HelpCircle, RotateCcw, MessageSquarePlus, Zap, Target, Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EvaluationReportProps {
  report: EvaluationReportType;
  onRestart: () => void;
  onRetakePractice?: (weakTopics: string[]) => void;
}

export const EvaluationReportView: React.FC<EvaluationReportProps> = ({ report, onRestart, onRetakePractice }) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackFlag, setFeedbackFlag] = useState<string>('other');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (report.overallScore >= 75) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
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

  const getReadinessBadge = (readiness?: string) => {
    switch (readiness) {
      case 'Immediate Match':
        return 'badge-emerald';
      case 'Ready with Minor Onboarding':
        return 'badge-cyan';
      case 'Needs Targeted Upskilling':
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

  const getQualitativeTag = (score: number) => {
    if (score >= 85) return { label: 'Exceptional', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (score >= 75) return { label: 'Proficient', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' };
    if (score >= 65) return { label: 'Meets Standards', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' };
    return { label: 'Development Area', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: report.sessionId,
          rating: feedbackRating,
          flag_type: feedbackFlag,
          comments: feedbackComments
        })
      });
      setFeedbackSubmitted(true);
      setTimeout(() => setShowFeedbackModal(false), 1500);
    } catch (err) {
      console.warn('Feedback submit error:', err);
    }
  };

  const valuation = report.marketValuation || {
    percentileTier: report.overallScore >= 88 ? 'Top 10% Senior Talent (Tier 1)' : report.overallScore >= 77 ? 'Competitive High Performer (Tier 2)' : report.overallScore >= 65 ? 'Core Operational Contributor (Tier 3)' : 'Developing Candidate (Tier 4)',
    experienceBandMatch: `${report.seniority} Band Alignment`,
    estimatedRampUp: report.overallScore >= 88 ? 'Immediate Day 1 Impact' : report.overallScore >= 77 ? 'Rapid Ramp-Up (1-2 Weeks)' : 'Guided Onboarding (3-4 Weeks)',
    leadershipAptitude: report.overallScore >= 80 ? 'High Professional Ownership' : 'Independent Contributor',
    keyHiringDrivers: [
      'Grounded verification of documented resume claims.',
      'Demonstrated structured problem solving and operational context.'
    ]
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1.5rem 0.75rem 4rem' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-emerald">
              Assessment Completed
            </span>
            {report.roleReadiness && (
              <span className={`badge ${getReadinessBadge(report.roleReadiness)}`}>
                Readiness: {report.roleReadiness}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Candidate Credibility & Valuation Report
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onRetakePractice && report.weaknesses.length > 0 && (
            <button
              onClick={() => onRetakePractice(report.weaknesses.map(w => w.title))}
              className="btn btn-secondary glow-cyan"
              style={{ padding: '0.6rem 1.15rem', borderColor: 'var(--accent-cyan)' }}
            >
              <RotateCcw size={16} color="var(--accent-cyan)" />
              <span>Targeted Practice Session</span>
            </button>
          )}

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1rem' }}
          >
            <MessageSquarePlus size={16} />
            <span>Feedback</span>
          </button>

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

      {/* Incomplete interview warning banner */}
      {report.overallScore === 0 && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '1rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#fca5a5'
        }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
            <strong>Interview Incomplete / Not Conducted:</strong> This interview was concluded early before candidate responses were provided. The score is <strong>0/100</strong> and reflects an unassessed session rather than an evaluation of candidate competency.
          </div>
        </div>
      )}

      {/* Main Executive Summary, Valuation & Score Card */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', border: report.overallScore === 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          
          {/* Column 1: Candidate Overview & Summary */}
          <div style={{ flex: 1.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                {report.candidateName}
              </span>
              <span className={`badge ${getRecommendationBadge(report.recommendation)}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', fontWeight: 700 }}>
                {report.recommendation}
              </span>
            </div>
            <div style={{ fontSize: '0.92rem', color: report.overallScore === 0 ? '#f87171' : 'var(--accent-cyan)', marginBottom: '1rem', fontWeight: 600 }}>
              {report.seniority} {report.targetRole} • {report.totalTurns} Multi-Turn Inquiries Evaluated
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.6 }}>
              {report.executiveSummary}
            </p>
          </div>

          {/* Column 2: Executive Valuation & Talent Band Matrix */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.25rem 1.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <TrendingUp size={16} color={report.overallScore === 0 ? '#ef4444' : 'var(--accent-cyan)'} />
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Executive Valuation & Fit
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Talent Band Tier:</span>
                <span style={{ fontWeight: 700, color: report.overallScore === 0 ? '#f87171' : '#38bdf8' }}>{valuation.percentileTier}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ramp-Up Velocity:</span>
                <span style={{ fontWeight: 700, color: report.overallScore === 0 ? '#fbbf24' : '#34d399' }}>{valuation.estimatedRampUp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Leadership Aptitude:</span>
                <span style={{ fontWeight: 700, color: report.overallScore === 0 ? '#94a3b8' : '#c084fc' }}>{valuation.leadershipAptitude}</span>
              </div>
            </div>

            {valuation.keyHiringDrivers && valuation.keyHiringDrivers.length > 0 && (
              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {valuation.keyHiringDrivers.map((driver, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    <span style={{ color: report.overallScore === 0 ? '#ef4444' : '#10b981', flexShrink: 0 }}>
                      {report.overallScore === 0 ? '•' : '✓'}
                    </span>
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 3: Radial Score Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{
              width: '135px', height: '135px', borderRadius: '50%',
              border: report.overallScore === 0 ? '6px solid #ef4444' : '6px solid var(--accent-cyan)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: report.overallScore === 0
                ? 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(0,0,0,0) 70%)'
                : 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, rgba(0,0,0,0) 70%)',
              boxShadow: report.overallScore === 0
                ? '0 0 30px rgba(239,68,68,0.3)'
                : '0 0 30px rgba(6,182,212,0.3)',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '2.6rem', fontWeight: 800, color: report.overallScore === 0 ? '#f87171' : '#ffffff', lineHeight: 1 }}>
                {report.overallScore}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Score / 100
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: report.overallScore === 0 ? '#f87171' : '#ffffff' }}>
              {report.overallScore === 0 ? 'Interview Incomplete' : 'Overall Role Readiness'}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Competency Performance Pillars */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Target size={18} color="var(--primary-light)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Core Performance Evaluation Pillars
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {Object.entries(report.dimensions).map(([key, dim]) => {
            if (!dim || key === 'roleCompetency') return null;
            const qual = getQualitativeTag(dim.score);

            return (
              <div key={key} className="glass-card" style={{ padding: '1.35rem', background: 'rgba(15, 23, 42, 0.65)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                    {dim.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: qual.color, background: qual.bg, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {qual.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>Competency Benchmark</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: qual.color }}>
                    {dim.score}/100
                  </span>
                </div>

                <div className="progress-bar-container" style={{ height: '6px', marginBottom: '0.75rem' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${dim.score}%`,
                      background: dim.score >= 80 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : dim.score >= 65 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'linear-gradient(90deg, #ef4444, #f43f5e)'
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {dim.summary}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Targeted Growth Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        
        {/* Observed Strengths */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.65)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Demonstrated Strengths & Evidence
            </h3>
          </div>
          {report.strengths.map((str, idx) => (
            <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: idx < report.strengths.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.35rem' }}>
                {str.title}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                {str.description}
              </div>
              {str.quote && str.quote !== 'N/A' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontStyle: 'italic', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', padding: '0.6rem 0.8rem', borderRadius: '6px', lineHeight: 1.4 }}>
                  {str.quote.replace(/^"|"$/g, '"')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Targeted Development Areas */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.65)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Targeted Growth & Development Roadmap
            </h3>
          </div>
          {report.weaknesses.map((w, idx) => (
            <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: idx < report.weaknesses.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.35rem' }}>
                {w.title}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                {w.description}
              </div>
              {w.quote && w.quote !== 'N/A' && (
                <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontStyle: 'italic', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', padding: '0.6rem 0.8rem', borderRadius: '6px', lineHeight: 1.4 }}>
                  {w.quote.replace(/^"|"$/g, '"')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Follow-ups for Next Round */}
      {report.verificationAreas && report.verificationAreas.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.75rem', background: 'rgba(15, 23, 42, 0.65)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HelpCircle size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Recommended Next-Round Follow-up Inquiries
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {report.verificationAreas.map((va, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.25rem' }}>
                  {va.area}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {va.issueFound}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  💡 "{va.suggestedOnsiteQuestion}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Resume Claim Grounding Table */}
      <div className="glass-card" style={{ padding: '1.75rem', background: 'rgba(15, 23, 42, 0.65)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="#10b981" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Resume Claim Grounding & Verification Ledger
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
            Grounded against candidate verbal answers during live interview
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {report.evidenceItems.map((item, idx) => (
            <div key={idx} style={{ padding: '1.1rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  Claim {idx + 1}: {item.claimAssertion}
                </span>
                <span className={`badge ${getVerdictBadge(item.assessmentVerdict)}`} style={{ fontSize: '0.72rem' }}>
                  {item.assessmentVerdict}
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                {item.reasoning}
              </div>
              {item.candidateQuote && item.candidateQuote !== 'N/A' && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.03)', padding: '0.4rem 0.65rem', borderRadius: '4px' }}>
                  Verbal Response: {item.candidateQuote}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Human Feedback Modal */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Interview Feedback & Quality Review
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Share your assessment feedback or report any evaluation inaccuracies.
            </p>

            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#10b981' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 0.5rem' }} />
                <div>Thank you! Your feedback has been recorded for review.</div>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Session Rating (1 to 5)
                  </label>
                  <select
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.65rem', color: '#fff' }}
                  >
                    <option value={5}>5 - Outstanding & Accurate</option>
                    <option value={4}>4 - Very Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Inaccurate Probing</option>
                    <option value={1}>1 - Poor / Glitchy</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Feedback Category
                  </label>
                  <select
                    value={feedbackFlag}
                    onChange={(e) => setFeedbackFlag(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.65rem', color: '#fff' }}
                  >
                    <option value="other">General Feedback</option>
                    <option value="scoring_inaccurate">Scoring Inaccurate</option>
                    <option value="question_irrelevant">Question Irrelevant to Resume</option>
                    <option value="audio_glitch">Audio / Voice Glitch</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Comments & Detailed Notes
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    placeholder="Provide specific notes regarding the questions or scoring..."
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.65rem', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowFeedbackModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary glow-cyan">
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
