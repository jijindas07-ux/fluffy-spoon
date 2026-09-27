'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Bot, User, FileText, Play, History, BarChart3, Settings, LogOut,
  ChevronRight, Clock, CheckCircle2, AlertCircle, Loader2, Plus,
  TrendingUp, Award, Target, Zap, Calendar, ArrowRight
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

interface InterviewSummary {
  id: string;
  candidateName: string;
  candidateTitle: string;
  roleTitle: string;
  seniority: string;
  focusArea: string;
  status: 'in_progress' | 'completed' | 'initialized';
  startedAt: number;
  completedAt?: number;
  turnCount: number;
  hasReport: boolean;
  overallScore: number | null;
  recommendation: string | null;
}

const recommendationColors: Record<string, string> = {
  'Strong Hire': 'var(--accent-emerald)',
  'Hire': '#86efac',
  'Leaning Hire': 'var(--accent-amber)',
  'Needs Follow-Up': '#fb923c',
  'Do Not Hire': 'var(--accent-rose)'
};

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-card" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: `${color || 'rgba(99,102,241,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'profile'>('overview');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchInterviews();
    }
  }, [isAuthenticated, token]);

  const fetchInterviews = async () => {
    setLoadingInterviews(true);
    try {
      const t = token || localStorage.getItem('verveai_token');
      const res = await fetch('/api/user/interviews', {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (data.success) setInterviews(data.interviews);
    } catch (e) {
      console.error('Failed to fetch interviews:', e);
    } finally {
      setLoadingInterviews(false);
    }
  };

  const handleStartNew = () => router.push('/');
  const handleContinue = (interviewId: string) => {
    // Store the session ID and redirect to main interview flow
    localStorage.setItem('verveai_resume_session_id', interviewId);
    router.push('/?continue=' + interviewId);
  };

  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const inProgressInterviews = interviews.filter(i => i.status === 'in_progress');
  const avgScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((s, i) => s + (i.overallScore || 0), 0) / completedInterviews.length)
    : null;

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="bg-ambient-grid" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 25px rgba(99,102,241,0.4)'
          }}>
            <Bot size={34} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>Sign in to access your Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '380px' }}>Track your interviews, view results, and manage your profile.</p>
          <button onClick={() => setShowAuthModal(true)} className="btn btn-primary">Sign In or Create Account</button>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Back to Home
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); if (!isAuthenticated) router.push('/'); }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dashboard Header */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(7,9,14,0.92)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50, padding: '0.85rem 0'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => router.push('/')} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
              cursor: 'pointer', color: '#fff', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'inherit'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={18} color="#fff" />
              </div>
              Verve<span style={{ color: 'var(--accent-cyan)' }}>AI</span>
            </button>
            <span style={{ color: 'var(--border-subtle)', fontSize: '1.2rem' }}>/</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>Dashboard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handleStartNew} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', gap: '0.4rem' }}>
              <Plus size={14} /> New Interview
            </button>
            <button
              onClick={() => { logout(); router.push('/'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'none', border: '1px solid var(--border-subtle)',
                borderRadius: '8px', padding: '0.45rem 0.75rem',
                color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem' }}>
        {/* Welcome */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
            Welcome back, {user?.name.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {user?.email} · Member since {user?.createdAt ? formatDate(user.createdAt) : '—'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
          {(['overview', 'history', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.45rem 1.1rem', border: 'none', cursor: 'pointer',
                borderRadius: '7px', fontSize: '0.87rem', fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: activeTab === tab ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                boxShadow: activeTab === tab ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <StatCard icon={<FileText size={20} color="#818cf8" />} label="Total Interviews" value={interviews.length} color="rgba(99,102,241,0.15)" />
              <StatCard icon={<CheckCircle2 size={20} color="#6ee7b7" />} label="Completed" value={completedInterviews.length} color="rgba(16,185,129,0.15)" />
              <StatCard icon={<Zap size={20} color="#fbbf24" />} label="In Progress" value={inProgressInterviews.length} color="rgba(245,158,11,0.15)" />
              <StatCard icon={<TrendingUp size={20} color="#67e8f9" />} label="Avg Score" value={avgScore !== null ? `${avgScore}%` : '—'} color="rgba(6,182,212,0.15)" />
            </div>

            {/* In-Progress Interviews */}
            {inProgressInterviews.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={18} color="var(--accent-amber)" />
                  Resume In-Progress Interviews
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {inProgressInterviews.map(iv => (
                    <div key={iv.id} className="glass-card" style={{ padding: '1.1rem 1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{iv.candidateName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{iv.candidateTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
                          {iv.seniority} {iv.roleTitle} · {iv.turnCount} answers · Started {formatDate(iv.startedAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>In Progress</span>
                        <button onClick={() => handleContinue(iv.id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', gap: '0.35rem' }}>
                          <Play size={13} /> Continue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Start */}
            <div className="glass-card" style={{
              padding: '2rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.25)', marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>Ready for a new interview?</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Upload a resume for any profession — Finance, HR, Marketing, Healthcare, Tech, and more.</p>
                </div>
                <button onClick={handleStartNew} className="btn btn-primary" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }}>
                  <Plus size={16} /> Start New Interview <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Recent Completed */}
            {completedInterviews.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Recent Results</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {completedInterviews.slice(0, 5).map(iv => (
                    <div key={iv.id} className="glass-card" style={{ padding: '1rem 1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{iv.candidateName}</span>
                          {iv.recommendation && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: recommendationColors[iv.recommendation] || '#fff', background: 'rgba(255,255,255,0.07)', padding: '0.15rem 0.5rem', borderRadius: '999px', border: `1px solid ${recommendationColors[iv.recommendation] || '#fff'}40` }}>
                              {iv.recommendation}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {iv.seniority} {iv.roleTitle} · {formatDate(iv.completedAt || iv.startedAt)}
                        </div>
                      </div>
                      {iv.overallScore !== null && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: iv.overallScore >= 75 ? 'var(--accent-emerald)' : iv.overallScore >= 55 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                            {iv.overallScore}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>Score</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {completedInterviews.length > 5 && (
                  <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    View all {completedInterviews.length} completed interviews →
                  </button>
                )}
              </div>
            )}

            {interviews.length === 0 && !loadingInterviews && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <History size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <h3 style={{ fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>No interviews yet</h3>
                <p style={{ fontSize: '0.88rem' }}>Upload a resume to run your first AI-powered interview.</p>
                <button onClick={handleStartNew} className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
                  Start Your First Interview
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Interview History ({interviews.length})</h2>
              <button onClick={handleStartNew} className="btn btn-outline-primary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
                <Plus size={14} /> New Interview
              </button>
            </div>

            {loadingInterviews ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading interviews...</p>
              </div>
            ) : interviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <History size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>No interviews yet. Start your first one!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {interviews.map(iv => (
                  <div key={iv.id} className="glass-card" style={{ padding: '1.1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.98rem' }}>{iv.candidateName}</span>
                          <span className={`badge ${iv.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                            {iv.status === 'completed' ? '✓ Completed' : '⏸ In Progress'}
                          </span>
                          {iv.recommendation && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: recommendationColors[iv.recommendation] || '#fff' }}>
                              {iv.recommendation}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>{iv.candidateTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span>Role: {iv.seniority} {iv.roleTitle}</span>
                          <span>Focus: {iv.focusArea}</span>
                          <span>{iv.turnCount} answers</span>
                          <span>Started: {formatDate(iv.startedAt)}</span>
                          {iv.completedAt && <span>Completed: {formatDate(iv.completedAt)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {iv.overallScore !== null && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: iv.overallScore >= 75 ? 'var(--accent-emerald)' : iv.overallScore >= 55 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                              {iv.overallScore}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>Score</div>
                          </div>
                        )}
                        {iv.status === 'in_progress' && (
                          <button onClick={() => handleContinue(iv.id)} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.38rem 0.85rem', gap: '0.3rem' }}>
                            <Play size={12} /> Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '560px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem' }}>Account Profile</h2>

            <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', fontWeight: 800, color: '#fff'
                }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                  <span className={`badge ${user?.role === 'admin' ? 'badge-amber' : 'badge-indigo'}`} style={{ marginTop: '0.3rem', fontSize: '0.65rem' }}>
                    {user?.role === 'admin' ? '⚡ Admin' : 'Standard User'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Total Interviews', value: interviews.length },
                  { label: 'Completed Interviews', value: completedInterviews.length },
                  { label: 'Average Score', value: avgScore !== null ? `${avgScore} / 100` : 'N/A' },
                  { label: 'Member Since', value: user?.createdAt ? formatDate(user.createdAt) : '—' }
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { logout(); router.push('/'); }}
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
