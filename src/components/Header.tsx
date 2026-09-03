'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Cpu, Settings } from 'lucide-react';
import { AISettingsModal, StoredAISettings } from './AISettingsModal';

interface HeaderProps {
  onReset: () => void;
  currentStep: string;
}

export const Header: React.FC<HeaderProps> = ({ onReset, currentStep }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeEngineLabel, setActiveEngineLabel] = useState('Smart Semantic Engine');
  const [hasApiKey, setHasApiKey] = useState(false);

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
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            onClick={onReset}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Verve<span style={{ color: 'var(--accent-cyan)' }}>AI</span>
                </span>
                <span className={`badge ${hasApiKey ? 'badge-cyan' : 'badge-indigo'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                  {hasApiKey ? 'LLM Mode' : 'Cognitive Engine'}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                Claim-Verified Autonomous Technical Interviewer
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Active Engine Badge Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                background: hasApiKey ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: hasApiKey ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: hasApiKey ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Click to configure AI Engine / API Keys"
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: hasApiKey ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
                boxShadow: hasApiKey ? '0 0 8px var(--accent-cyan)' : '0 0 8px var(--accent-emerald)'
              }} />
              <span>{activeEngineLabel}</span>
              <Settings size={14} style={{ opacity: 0.7 }} />
            </button>

            {currentStep !== 'landing' && (
              <button 
                onClick={onReset}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
              >
                New Interview
              </button>
            )}
          </div>
        </div>
      </header>

      <AISettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
