'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, User, Sparkles, ArrowRight, Loader2, Code2, Database, Shield } from 'lucide-react';
import { SAMPLE_CANDIDATES } from '@/lib/data/sampleResumes';
import { CandidateProfile } from '@/lib/types';
import { extractClaimsFromText } from '@/lib/engine/claimExtractor';

interface ResumeUploadProps {
  onProfileParsed: (profile: CandidateProfile) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onProfileParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateProcessing = async (profileData: CandidateProfile, fileName?: string) => {
    setIsProcessing(true);
    if (fileName) setUploadedFileName(fileName);

    const stages = [
      'Extracting Document Structure & Typography...',
      'Identifying Projects, Stack & Quantifiable Assertions...',
      'Indexing Key Claims (Traffic, Architecture, Latency)...',
      'Synthesizing Adaptive Knowledge Graph...'
    ];

    for (let i = 0; i < stages.length; i++) {
      setProcessingStage(stages[i]);
      await new Promise(r => setTimeout(r, 450));
    }

    setIsProcessing(false);
    onProfileParsed(profileData);
  };

  const handleSelectPreset = async (preset: CandidateProfile) => {
    await simulateProcessing(preset, `${preset.name.replace(/\s+/g, '_')}_Resume.pdf`);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await handleFileUpload(file);
    }
  };

  const getSavedLLMConfig = () => {
    try {
      const saved = localStorage.getItem('verve_ai_settings') || localStorage.getItem('interview_ai_settings');
      return saved ? JSON.parse(saved) : { provider: 'gemini' };
    } catch {
      return { provider: 'gemini' };
    }
  };

  const handleFileUpload = async (file: File) => {
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateName', cleanName);
      
      const llmConfig = getSavedLLMConfig();
      if (llmConfig) {
        formData.append('clientLLMConfig', JSON.stringify(llmConfig));
      }

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.profile) {
        await simulateProcessing(data.profile, file.name);
      } else {
        const fallbackProfile = extractClaimsFromText(`Resume document for ${cleanName}`, cleanName);
        await simulateProcessing(fallbackProfile, file.name);
      }
    } catch {
      const fallbackProfile = extractClaimsFromText(`Resume document for ${cleanName}`, cleanName);
      await simulateProcessing(fallbackProfile, file.name);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    try {
      const llmConfig = getSavedLLMConfig();
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawText: manualText, 
          candidateName: 'Candidate',
          clientLLMConfig: llmConfig 
        })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        await simulateProcessing(data.profile, 'Custom_Resume.txt');
      } else {
        const fallbackProfile = extractClaimsFromText(manualText, 'Candidate');
        await simulateProcessing(fallbackProfile, 'Custom_Resume.txt');
      }
    } catch {
      const fallbackProfile = extractClaimsFromText(manualText, 'Candidate');
      await simulateProcessing(fallbackProfile, 'Custom_Resume.txt');
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge badge-indigo" style={{ marginBottom: '0.75rem' }}>
          Step 1 of 4
        </span>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
          Upload Candidate Resume
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Drag & drop a candidate resume or select one of our curated high-caliber engineering presets to begin.
        </p>
      </div>

      {isProcessing ? (
        <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '2px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}>
            <Loader2 size={32} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
            Analyzing Resume & Extracting Claims
          </h3>
          <p style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)', marginBottom: '1.5rem' }}>
            {processingStage}
          </p>

          <div style={{
            maxWidth: '380px',
            margin: '0 auto',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: '80%',
              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              borderRadius: '999px',
              animation: 'pulse 1.5s infinite ease-in-out'
            }} />
          </div>
        </div>
      ) : (
        <div>
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-card glass-card-interactive"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-subtle)',
              background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface-glass)',
              cursor: 'pointer',
              marginBottom: '2.5rem'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: 'none' }}
            />

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <UploadCloud size={32} color="#818cf8" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              Drop candidate resume here, or <span style={{ color: 'var(--accent-cyan)' }}>browse files</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Supports PDF, DOCX, and TXT files (Up to 10MB)
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-indigo">Auto-extracts claims</span>
              <span className="badge badge-emerald">Instant verification</span>
            </div>
          </div>

          {/* Quick Start Presets Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="#818cf8" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Or select a pre-loaded candidate profile to test immediately:
                </span>
              </div>
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showManualInput ? 'Hide manual paste' : 'Paste resume text directly'}
              </button>
            </div>

            {/* Presets Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {SAMPLE_CANDIDATES.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="glass-card glass-card-interactive"
                  style={{
                    padding: '1.35rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.09)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                        {preset.name}
                      </span>
                      <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                        {preset.experienceYears}y Exp
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                      {preset.title}
                    </div>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      Key Claim: "{preset.claims[0]?.rawClaim.slice(0, 70)}..."
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                      {preset.claims.length} claims extracted
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Select <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Manual Text Paste */}
          {showManualInput && (
            <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Paste Raw Resume Text
              </h4>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste candidate resume or technical background here..."
                rows={5}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  color: '#ffffff',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  marginBottom: '1rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualText.trim()}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Extract Claims & Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
