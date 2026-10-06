'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, User, Sparkles, ArrowRight, Loader2, Code2, Database, Shield, Zap } from 'lucide-react';
import { SAMPLE_CANDIDATES } from '@/lib/data/sampleResumes';
import { CandidateProfile } from '@/lib/types';
import { extractClaimsFromText } from '@/lib/engine/claimExtractor';

interface ResumeUploadProps {
  onProfileParsed: (profile: CandidateProfile) => void;
}

interface ProcessingStep {
  step: number;
  label: string;
  sublabel: string;
}

const STEPS: ProcessingStep[] = [
  { step: 1, label: 'Uploading Document', sublabel: 'Validating MIME type & computing SHA-256 hash' },
  { step: 2, label: 'Reading Resume', sublabel: 'Spatial layout extraction & OCR stream parsing' },
  { step: 3, label: 'Extracting Information', sublabel: 'Identifying quantifiable metrics & career claims' },
  { step: 4, label: 'Building Profile', sublabel: 'Structuring knowledge graph & competency matrix' }
];

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onProfileParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCachedHit, setIsCachedHit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRequestIdRef = useRef<number>(0);
  const stageTimerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    stageTimerRef.current.forEach(t => clearTimeout(t));
    stageTimerRef.current = [];
  };

  const startProgressAnimation = () => {
    clearTimers();
    setCurrentStepIndex(0);
    setProcessingStage(STEPS[0].label);

    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProcessingStage(STEPS[1].label);
    }, 250);

    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProcessingStage(STEPS[2].label);
    }, 650);

    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProcessingStage(STEPS[3].label);
    }, 1100);

    stageTimerRef.current = [t1, t2, t3];
  };

  const handleSelectPreset = (preset: CandidateProfile) => {
    setUploadError(null);
    clearTimers();
    const freshId = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const freshPreset: CandidateProfile = {
      ...preset,
      id: freshId,
      claims: preset.claims.map((c, i) => ({
        ...c,
        id: `claim-${i + 1}-${Date.now()}`
      }))
    };
    console.log(`[UPLOAD] Selected preset profile "${preset.name}", generated fresh ID: ${freshId}`);
    onProfileParsed(freshPreset);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
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
    const requestId = ++uploadRequestIdRef.current;
    console.log(`[UPLOAD] Received file: "${file.name}" (size: ${file.size} bytes, type: "${file.type}") [Upload #${requestId}]`);

    setUploadedFileName(file.name);
    setIsProcessing(true);
    setUploadError(null);
    setIsCachedHit(false);
    startProgressAnimation();

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

      if (requestId !== uploadRequestIdRef.current) {
        console.warn(`[UPLOAD RACE GUARD] Ignored stale upload response #${requestId}`);
        return;
      }

      if (data.success && data.profile) {
        clearTimers();
        setCurrentStepIndex(3);
        setProcessingStage('Profile Ready!');
        if (data.cached) {
          setIsCachedHit(true);
        }

        console.log(`[EXTRACTION SUCCESS] Profile ready in ${data.processingTimeMs || 0}ms (Cached: ${!!data.cached})`);

        // Smooth instant transition
        setTimeout(() => {
          setIsProcessing(false);
          onProfileParsed(data.profile);
        }, data.cached ? 150 : 350);
      } else {
        clearTimers();
        setIsProcessing(false);
        setUploadError(data.error || 'This resume could not be reliably read. Please upload a clearer PDF/DOCX or paste text below.');
        setShowManualInput(true);
      }
    } catch (err: any) {
      if (requestId !== uploadRequestIdRef.current) return;
      clearTimers();
      setIsProcessing(false);
      setUploadError('Failed to parse resume document. Please upload a clearer PDF or paste text manually.');
      setShowManualInput(true);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    const requestId = ++uploadRequestIdRef.current;
    setIsProcessing(true);
    setUploadError(null);
    setUploadedFileName('Custom_Resume.txt');
    startProgressAnimation();

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
      if (requestId !== uploadRequestIdRef.current) return;

      clearTimers();
      setIsProcessing(false);

      if (data.success && data.profile) {
        onProfileParsed(data.profile);
      } else {
        const fallbackProfile = extractClaimsFromText(manualText, 'Candidate');
        onProfileParsed(fallbackProfile);
      }
    } catch {
      if (requestId !== uploadRequestIdRef.current) return;
      clearTimers();
      setIsProcessing(false);
      const fallbackProfile = extractClaimsFromText(manualText, 'Candidate');
      onProfileParsed(fallbackProfile);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge badge-indigo" style={{ marginBottom: '0.75rem' }}>
          Step 1 of 4 • Fast Multimodal Ingestion (SRS FR-001)
        </span>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
          Upload Candidate Resume
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Drag & drop a candidate resume or select a curated candidate profile across industries.
        </p>
      </div>

      {isProcessing ? (
        <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '2px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 20px rgba(6,182,212,0.3)'
          }}>
            <Loader2 size={32} color="var(--accent-cyan)" className="animate-spin" />
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem', color: '#ffffff' }}>
            {uploadedFileName || 'Processing Document'}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
            <span style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontWeight: 600 }}>
              {STEPS[currentStepIndex]?.label || processingStage}
            </span>
            {isCachedHit && (
              <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem' }}>
                <Zap size={11} /> Instant Cache Hit
              </span>
            )}
          </div>

          {/* 4-Step Progress Flow */}
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              return (
                <div
                  key={step.step}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    background: isCompleted ? 'rgba(16,185,129,0.15)' : isCurrent ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isCompleted ? '#10b981' : isCurrent ? 'var(--accent-cyan)' : 'transparent'}`,
                    textAlign: 'center',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCompleted ? '#10b981' : isCurrent ? 'var(--accent-cyan)' : 'var(--text-faint)', marginBottom: '0.2rem' }}>
                    {isCompleted ? '✓ Done' : `Step ${step.step}`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isCurrent ? '#fff' : 'var(--text-muted)', lineHeight: 1.2 }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            maxWidth: '420px',
            margin: '0 auto',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (currentStepIndex + 1) * 25)}%`,
              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              borderRadius: '999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      ) : (
        <div>
          {/* Error Banner */}
          {uploadError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              color: '#fca5a5',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{uploadError}</span>
              </div>
              <button
                onClick={() => setUploadError(null)}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-card glass-card-interactive"
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-subtle)',
              background: isDragging ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-surface-glass)',
              cursor: 'pointer',
              marginBottom: '2rem'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: 'none' }}
            />

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <UploadCloud size={28} color="var(--accent-cyan)" />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
              Drop candidate resume here, or <span style={{ color: 'var(--accent-cyan)' }}>browse files</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
              Supports PDF, DOCX, and TXT files with SHA-256 deduplication
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="badge badge-indigo">Fast Spatial Parser</span>
              <span className="badge badge-emerald">SHA-256 Duplicate Cache</span>
              <span className="badge badge-purple">DOCX & PDF</span>
            </div>
          </div>

          {/* Preset Candidates Across Diverse Fields */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Or Select a Curated Candidate Profile Across Domains
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {SAMPLE_CANDIDATES.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => handleSelectPreset(candidate)}
                  className="glass-card glass-card-interactive"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.02rem' }}>
                        {candidate.name}
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                        {candidate.experienceYears}y exp
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent-purple)', fontWeight: 600, marginBottom: '0.65rem' }}>
                      {candidate.title}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                      {candidate.summary.slice(0, 105)}...
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      {candidate.claims.length} verified claims
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      Select Profile <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paste Resume Text Accordion */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {showManualInput ? 'Hide manual text input' : 'Paste plain resume text manually instead'}
            </button>

            {showManualInput && (
              <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem', textAlign: 'left' }}>
                <textarea
                  rows={6}
                  placeholder="Paste candidate resume text directly here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    marginBottom: '1rem'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualText.trim()}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.25rem' }}
                  >
                    Parse Pasted Text
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
