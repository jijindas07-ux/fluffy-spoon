'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Key, Check, Cpu, Shield, Zap, X, ExternalLink } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface StoredAISettings {
  provider: 'gemini' | 'openai' | 'groq' | 'local';
  apiKey: string;
  model: string;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'groq' | 'local'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('verve_ai_settings');
    if (saved) {
      try {
        const parsed: StoredAISettings = JSON.parse(saved);
        setProvider(parsed.provider || 'gemini');
        setApiKey(parsed.apiKey || '');
        setModel(parsed.model || 'gemini-3.6-flash');
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const settings: StoredAISettings = {
      provider,
      apiKey: apiKey.trim(),
      model
    };
    localStorage.setItem('verve_ai_settings', JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    localStorage.removeItem('verve_ai_settings');
    setApiKey('');
    setProvider('local');
    setModel('local-semantic');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Cpu size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              AI Engine & Model Settings
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Configure LLM intelligence provider for authentic candidate evaluation
            </p>
          </div>
        </div>

        {/* Engine Provider Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Select AI Intelligence Provider
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => { setProvider('gemini'); setModel('gemini-3.6-flash'); }}
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                border: provider === 'gemini' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: provider === 'gemini' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Google Gemini</span>
                <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>Free Key</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gemini 3.6 Flash (Recommended)</div>
            </button>

            <button
              type="button"
              onClick={() => { setProvider('openai'); setModel('gpt-4o-mini'); }}
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                border: provider === 'openai' ? '2px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                background: provider === 'openai' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>OpenAI</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>GPT-4o-mini / GPT-4o</div>
            </button>

            <button
              type="button"
              onClick={() => { setProvider('groq'); setModel('llama-3.3-70b-versatile'); }}
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                border: provider === 'groq' ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                background: provider === 'groq' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>Groq</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LLaMA 3.3 70B (Ultra-fast)</div>
            </button>

            <button
              type="button"
              onClick={() => { setProvider('local'); setModel('local-semantic'); setApiKey(''); }}
              style={{
                padding: '0.85rem',
                borderRadius: '10px',
                border: provider === 'local' ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                background: provider === 'local' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>Smart Semantic</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Built-in Cognitive Engine</div>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        {provider !== 'local' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {provider.toUpperCase()} API Key
              </label>
              {provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
                >
                  Get free Gemini API Key <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <Key size={16} color="var(--text-faint)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder={`Paste your ${provider} API key here (AIzaSy...)`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem 0.75rem 2.6rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-faint)', marginTop: '0.4rem' }}>
              Key is stored locally in your browser and used exclusively for your session requests.
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {apiKey && (
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.55rem 1rem' }}
            >
              Clear Key
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.35rem' }}
          >
            {isSaved ? <Check size={16} /> : <Sparkles size={16} />}
            <span>{isSaved ? 'Saved!' : 'Apply Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
