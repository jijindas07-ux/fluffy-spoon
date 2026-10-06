'use client';

import React, { useEffect, useState } from 'react';
import { EvaluationReport as EvaluationReportType } from '@/lib/types';
import {
  Award, CheckCircle2, AlertTriangle, ShieldCheck, FileText, ArrowRight,
  Printer, Share2, Sparkles, TrendingUp, HelpCircle, RotateCcw, MessageSquarePlus, DollarSign, Cpu, Clock
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

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1.5rem 0.75rem 4rem' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-emerald">
              Evaluation Complete (SRS FR-015)
            </span>
            {report.roleReadiness && (
              <span className={`badge ${getReadinessBadge(report.roleReadiness)}`}>
                Readiness: {report.roleReadiness}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Candidate Credibility & Assessment Report
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Targeted Retake Practice (FR-016) */}
          {onRetakePractice && report.weaknesses.length > 0 && (
            <button
              onClick={() => onRetakePractice(report.weaknesses.map(w => w.title))}
              className="btn btn-secondary glow-cyan"
              style={{ padding: '0.6rem 1.15rem', borderColor: 'var(--accent-cyan)' }}
            >
              <RotateCcw size={16} color="var(--accent-cyan)" />
              <span>Targeted Retake (FR-016)</span>
            </button>
          )}

          {/* Feedback (FR-020) */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1rem' }}
          >
            <MessageSquarePlus size={16} />
            <span>Provide Feedback (FR-020)</span>
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

      {/* Executive Summary & Overall Score Card */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                {report.candidateName}
              </span>
              <span className={`badge ${getRecommendationBadge(report.recommendation)}`} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                {report.recommendation}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginBottom: '1rem', fontWeight: 600 }}>
              {report.seniority} {report.targetRole} • {report.totalTurns} Multi-Turn Question Cycles
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', lineHeight: 1.6 }}>
              {report.executiveSummary}
            </p>
          </div>

          {/* Score Circle & Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{
              width: '130px', height: '130px', borderRadius: '50%',
              border: '6px solid var(--accent-cyan)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 70%)',
              boxShadow: '0 0 25px rgba(6,182,212,0.25)',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                {report.overallScore}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Score / 100
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
              Overall Readiness Rating
            </div>
          </div>
        </div>
      </div>

      {/* AI Telemetry & Cost Ledger Card (FR-019 / NFR-011) */}
      {report.aiUsageSummary && (
        <div className="glass-card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                AI Telemetry & Usage Ledger (FR-019)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <div>
                <strong>Tokens:</strong> {report.aiUsageSummary.totalTokens.toLocaleString()}
              </div>
              <div>
                <strong>Avg Latency:</strong> {Math.round(report.aiUsageSummary.totalLatencyMs / (report.totalTurns || 1))}ms
              </div>
              <div>
                <strong>Est. Cost:</strong> ${report.aiUsageSummary.totalCostUsd} USD
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 Core Competency Dimensions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {Object.entries(report.dimensions).map(([key, dim]) => {
          if (!dim || key === 'roleCompetency') return null;
          return (
            <div key={key} className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                  {dim.label}
                </span>
                <span style={{
                  fontSize: '0.92rem', fontWeight: 800,
                  color: dim.score >= 80 ? '#10b981' : dim.score >= 65 ? '#f59e0b' : '#f43f5e'
                }}>
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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {dim.summary}
              </p>
            </div>
          );
        })}
      </div>

      {/* Granular Skill Assessments Card (FR-011) */}
      {report.skillAssessments && report.skillAssessments.length > 0 && (
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Award size={18} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Granular Skill Assessments & Confidence (FR-011)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {report.skillAssessments.map((sa, idx) => (
              <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{sa.skill}</span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>{sa.score}/100</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '0.35rem' }}>
                  Category: {sa.category} • Eval Confidence: {sa.confidence}%
                </div>
                {sa.gapIdentified && (
                  <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginTop: '0.35rem' }}>
                    ⚠️ {sa.gapIdentified}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Growth Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Strengths */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Observed Strengths & Validation
            </h3>
          </div>
          {report.strengths.map((str, idx) => (
            <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: idx < report.strengths.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.35rem' }}>
                {str.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {str.description}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontStyle: 'italic', background: 'rgba(6,182,212,0.06)', padding: '0.5rem', borderRadius: '6px' }}>
                "{str.quote.replace(/"/g, '')}"
              </div>
            </div>
          ))}
        </div>

        {/* Weaknesses / Gaps */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Development Gaps & Probing Areas
            </h3>
          </div>
          {report.weaknesses.map((w, idx) => (
            <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: idx < report.weaknesses.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '0.35rem' }}>
                {w.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {w.description}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontStyle: 'italic', background: 'rgba(245,158,11,0.06)', padding: '0.5rem', borderRadius: '6px' }}>
                "{w.quote.replace(/"/g, '')}"
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Follow-ups for Next Round */}
      {report.verificationAreas && report.verificationAreas.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HelpCircle size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Recommended Next-Round Follow-up Inquiries
            </h3>
          </div>
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
      )}

      {/* Candidate Resume Claim Grounding Table (FR-004) */}
      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <ShieldCheck size={18} color="#10b981" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Resume Claim Grounding & Verification Ledger (FR-004)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {report.evidenceItems.map((item, idx) => (
            <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                  Claim {idx + 1}: {item.claimAssertion}
                </span>
                <span className={`badge ${getVerdictBadge(item.assessmentVerdict)}`} style={{ fontSize: '0.72rem' }}>
                  {item.assessmentVerdict}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {item.reasoning}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                Candidate Verbal Quote: {item.candidateQuote}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Human Feedback Modal (FR-020) */}
      {showFeedbackModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Candidate Feedback (FR-020)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Flag inaccurate AI feedback or rate this interview session for quality reviews.
            </p>

            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#10b981' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 0.5rem' }} />
                <div>Thank you! Your feedback has been recorded for evaluation datasets.</div>
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
