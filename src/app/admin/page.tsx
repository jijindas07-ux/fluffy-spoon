'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Bot, Shield, Users, FileText, BarChart3, AlertCircle, CheckCircle2,
  Clock, Loader2, TrendingUp, Database, Zap, Activity, ChevronRight,
  LogOut, ArrowLeft, RefreshCw, Eye, Search
} from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

interface PlatformStats {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  totalCandidates: number;
  totalReports: number;
  totalUsers: number;
  totalAdmins: number;
  activeSessions: number;
  totalInterviews: number;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  interviewCount: number;
  completedInterviews: number;
  createdAt: number;
  lastLoginAt: number | null;
}

interface SessionRecord {
  id: string;
  userId: string | null;
  candidateName: string;
  candidateTitle: string;
  candidateId: string;
  roleTitle: string;
  seniority: string;
  focusArea: string;
  rigorLevel: string;
  status: string;
  startedAt: number;
  completedAt?: number;
  turnCount: number;
  totalTurns: number;
  hasReport: boolean;
  overallScore: number | null;
  recommendation: string | null;
  parserSource: string;
}

const recommendationColors: Record<string, string> = {
  'Strong Hire': '#6ee7b7',
  'Hire': '#86efac',
  'Leaning Hire': '#fcd34d',
  'Needs Follow-Up': '#fb923c',
  'Do Not Hire': '#fda4af'
};

function AdminStatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: color || 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions'>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) setShowAuthModal(true);
      else if (!isAdmin) router.push('/dashboard');
      else fetchData();
    }
  }, [isLoading, isAuthenticated, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const t = token || localStorage.getItem('verveai_token');
      const headers = { Authorization: `Bearer ${t}` };

      const [statsRes, usersRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/sessions', { headers })
      ]);

      const [statsData, usersData, sessionsData] = await Promise.all([
        statsRes.json(), usersRes.json(), sessionsRes.json()
      ]);

      if (statsData.success) setStats(statsData.stats.platform);
      if (usersData.success) setUsers(usersData.users);
      if (sessionsData.success) setSessions(sessionsData.sessions);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Failed to fetch admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.candidateTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <Shield size={48} color="var(--accent-amber)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Admin Access Required</h1>
        <button onClick={() => setShowAuthModal(true)} className="btn btn-primary">Sign In as Admin</button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--accent-rose)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)' }}>You do not have admin privileges.</p>
        <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Header */}
      <header style={{
        borderBottom: '1px solid rgba(245,158,11,0.25)',
        backgroundColor: 'rgba(7,9,14,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50, padding: '0.85rem 0'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => router.push('/')} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
              cursor: 'pointer', color: '#fff', fontSize: '1rem', fontWeight: 800, fontFamily: 'inherit'
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="#fff" />
              </div>
              Verve<span style={{ color: 'var(--accent-cyan)' }}>AI</span>
            </button>
            <span style={{ color: 'var(--border-subtle)', fontSize: '1.2rem' }}>/</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="#fcd34d" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fcd34d' }}>Admin Panel</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastRefreshed && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                Refreshed {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button onClick={fetchData} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-muted)',
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={() => router.push('/dashboard')} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-muted)',
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <ArrowLeft size={13} /> Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Platform Administration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Signed in as: {user?.name} ({user?.email})</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
          {(['overview', 'users', 'sessions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.45rem 1.1rem', border: 'none', cursor: 'pointer', borderRadius: '7px',
              fontSize: '0.87rem', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
              background: activeTab === tab ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === tab ? '#000' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? '0 2px 8px rgba(245,158,11,0.3)' : 'none'
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <AdminStatCard icon={<Users size={18} color="#818cf8" />} label="Registered Users" value={stats?.totalUsers || 0} color="rgba(99,102,241,0.18)" />
              <AdminStatCard icon={<FileText size={18} color="#6ee7b7" />} label="Total Interviews" value={stats?.totalSessions || 0} color="rgba(16,185,129,0.15)" />
              <AdminStatCard icon={<CheckCircle2 size={18} color="#67e8f9" />} label="Completed" value={stats?.completedSessions || 0} color="rgba(6,182,212,0.15)" />
              <AdminStatCard icon={<Zap size={18} color="#fcd34d" />} label="In Progress" value={stats?.inProgressSessions || 0} color="rgba(245,158,11,0.15)" />
              <AdminStatCard icon={<Database size={18} color="#c4b5fd" />} label="Candidates Parsed" value={stats?.totalCandidates || 0} color="rgba(139,92,246,0.15)" />
              <AdminStatCard icon={<BarChart3 size={18} color="#fda4af" />} label="Reports Generated" value={stats?.totalReports || 0} color="rgba(244,63,94,0.15)" />
            </div>

            {/* Recent Sessions */}
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="var(--accent-amber)" /> Recent Activity
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {sessions.slice(0, 8).map(s => (
                <div key={s.id} className="glass-card" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{s.candidateName}</span>
                      <span className={`badge ${s.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.62rem' }}>
                        {s.status}
                      </span>
                      {s.recommendation && (
                        <span style={{ fontSize: '0.68rem', color: recommendationColors[s.recommendation] || '#aaa' }}>{s.recommendation}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>{s.candidateTitle}</span>
                      <span>→ {s.seniority} {s.roleTitle}</span>
                      <span>{s.turnCount} answers</span>
                      <span>{formatDate(s.startedAt)}</span>
                      {s.userId ? <span style={{ color: 'var(--accent-cyan)' }}>User: {s.userId.slice(0, 12)}...</span> : <span style={{ color: 'var(--text-faint)' }}>Anonymous</span>}
                    </div>
                  </div>
                  {s.overallScore !== null && (
                    <div style={{ textAlign: 'center', minWidth: '48px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.overallScore >= 75 ? 'var(--accent-emerald)' : s.overallScore >= 55 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                        {s.overallScore}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>Score</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Users ({users.filter(u => u.role !== 'admin').length})</h2>
              <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  style={{
                    width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                    borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredUsers.filter(u => u.role !== 'admin').map(u => (
                <div key={u.id} className="glass-card" style={{ padding: '1rem 1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem', marginBottom: '0.2rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{u.email}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <span>Joined: {formatDate(u.createdAt)}</span>
                      {u.lastLoginAt && <span>Last login: {formatDate(u.lastLoginAt)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{u.interviewCount}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>Interviews</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{u.completedInterviews}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>Completed</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.filter(u => u.role !== 'admin').length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {searchQuery ? 'No users match your search.' : 'No registered users yet.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>All Interviews ({sessions.length})</h2>
              <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, role..."
                  style={{
                    width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                    borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredSessions.map(s => (
                <div key={s.id} className="glass-card" style={{ padding: '1rem 1.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{s.candidateName}</span>
                        <span className={`badge ${s.status === 'completed' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.62rem' }}>{s.status}</span>
                        {s.recommendation && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: recommendationColors[s.recommendation] || '#fff' }}>{s.recommendation}</span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                          {s.parserSource}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>{s.candidateTitle}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>{s.seniority} {s.roleTitle}</span>
                        <span>{s.focusArea}</span>
                        <span>{s.turnCount} answers ({s.totalTurns} turns)</span>
                        <span>{formatDate(s.startedAt)}</span>
                        {s.userId ? <span style={{ color: '#a5b4fc' }}>uid: {s.userId.slice(0, 14)}...</span> : <span>Anonymous</span>}
                      </div>
                    </div>
                    {s.overallScore !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.overallScore >= 75 ? 'var(--accent-emerald)' : s.overallScore >= 55 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                          {s.overallScore}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>Score</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredSessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {searchQuery ? 'No interviews match your search.' : 'No interviews recorded yet.'}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
