'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Settings, LogIn, LogOut, LayoutDashboard, Shield, User } from 'lucide-react';
import { AISettingsModal, StoredAISettings } from './AISettingsModal';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onReset: () => void;
  currentStep: string;
}

export const Header: React.FC<HeaderProps> = ({ onReset, currentStep }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeEngineLabel, setActiveEngineLabel] = useState('Smart Semantic Engine');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateEngineLabel = () => {
      const saved = localStorage.getItem('verve_ai_settings') || localStorage.getItem('interview_ai_settings');
      if (saved) {
        try {
          const parsed: StoredAISettings = JSON.parse(saved);
          if (parsed.provider === 'openai') {
            setHasApiKey(true);
            setActiveEngineLabel('⚡ OpenAI GPT Active');
            return;
          } else if (parsed.provider === 'groq') {
            setHasApiKey(true);
            setActiveEngineLabel('🚀 Groq LLaMA 3 Active');
            return;
          } else if (parsed.provider === 'local') {
            setHasApiKey(false);
            setActiveEngineLabel('🧠 Smart Cognitive Engine');
            return;
          }
        } catch (e) {}
      }
      setHasApiKey(true);
      setActiveEngineLabel('✨ Gemini 3.6 Flash Active');
    };

    updateEngineLabel();
    const interval = setInterval(updateEngineLabel, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    onReset();
  };

  return (
    <>
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.85rem 0'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div
            onClick={onReset}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              flexShrink: 0
            }}>
              <Bot size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Verve<span style={{ color: 'var(--accent-cyan)' }}>AI</span>
                </span>
                <span className={`badge ${hasApiKey ? 'badge-cyan' : 'badge-indigo'}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>
                  {hasApiKey ? 'LLM Mode' : 'Cognitive Engine'}
                </span>
              </div>
              <span className="mobile-hide" style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                Universal Adaptive Professional Interviewer
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Active Engine Badge */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                background: hasApiKey ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: hasApiKey ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: hasApiKey ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Click to configure AI Engine / API Keys"
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: hasApiKey ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
                boxShadow: hasApiKey ? '0 0 8px var(--accent-cyan)' : '0 0 8px var(--accent-emerald)',
                flexShrink: 0
              }} />
              <span className="mobile-hide" style={{ whiteSpace: 'nowrap' }}>{activeEngineLabel}</span>
              <Settings size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
            </button>

            {currentStep !== 'landing' && (
              <button
                onClick={onReset}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
              >
                New Interview
              </button>
            )}

            {/* Auth section */}
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.35rem 0.75rem', borderRadius: '9999px',
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
                    color: '#a5b4fc', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  <User size={14} />
                  <span className="mobile-hide">{user.name.split(' ')[0]}</span>
                  {user.role === 'admin' && (
                    <span className="badge badge-amber" style={{ fontSize: '0.58rem', padding: '0.1rem 0.35rem' }}>Admin</span>
                  )}
                </button>

                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)',
                      borderRadius: '12px', padding: '0.5rem', zIndex: 200, minWidth: '180px',
                      boxShadow: '0 15px 40px rgba(0,0,0,0.5)'
                    }}
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div style={{ padding: '0.4rem 0.75rem 0.6rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>

                    <button
                      onClick={() => { router.push('/dashboard'); setShowUserMenu(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                        padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                        color: 'var(--text-muted)', fontSize: '0.83rem', cursor: 'pointer',
                        borderRadius: '7px', fontFamily: 'inherit', textAlign: 'left'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <LayoutDashboard size={14} />
                      My Dashboard
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => { router.push('/admin'); setShowUserMenu(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                          padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                          color: '#fcd34d', fontSize: '0.83rem', cursor: 'pointer',
                          borderRadius: '7px', fontFamily: 'inherit', textAlign: 'left'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <Shield size={14} />
                        Admin Panel
                      </button>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                          padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                          color: '#fda4af', fontSize: '0.83rem', cursor: 'pointer',
                          borderRadius: '7px', fontFamily: 'inherit', textAlign: 'left'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="btn btn-outline-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <LogIn size={14} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AISettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
