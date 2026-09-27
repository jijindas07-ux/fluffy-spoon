'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let result;
      if (tab === 'login') {
        result = await login(email, password);
      } else {
        result = await register(name, email, password);
      }

      if (result.success) {
        onClose();
        // Reset form
        setName(''); setEmail(''); setPassword('');
      } else {
        setError(result.error || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (newTab: 'login' | 'register') => {
    setTab(newTab);
    setError('');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: '420px', padding: '2rem', position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-subtle)',
            borderRadius: '8px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px', height: '48px', margin: '0 auto 0.75rem',
            borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)'
          }}>
            <Bot size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            Verve<span style={{ color: 'var(--accent-cyan)' }}>AI</span>
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            {tab === 'login' ? 'Sign in to your account' : 'Create your free account'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px', padding: '4px', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)'
        }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', cursor: 'pointer',
                borderRadius: '7px', fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: tab === t ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tab === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  style={{
                    width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                    borderRadius: '9px', color: '#fff', fontSize: '0.92rem', outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                  borderRadius: '9px', color: '#fff', fontSize: '0.92rem', outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={{
                  width: '100%', padding: '0.7rem 2.75rem 0.7rem 2.5rem',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                  borderRadius: '9px', color: '#fff', fontSize: '0.92rem', outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.83rem', color: '#fda4af'
            }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Demo admin hint */}
        {tab === 'login' && (
          <div style={{
            marginTop: '1rem', padding: '0.65rem', borderRadius: '8px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center'
          }}>
            Admin demo: <strong style={{ color: '#a5b4fc' }}>admin@verveai.com</strong> / <strong style={{ color: '#a5b4fc' }}>admin123</strong>
          </div>
        )}
      </div>
    </div>
  );
};
