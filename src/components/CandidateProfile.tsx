'use client';

import React, { useState } from 'react';
import { CandidateProfile as CandidateProfileType } from '@/lib/types';
import { User, Briefcase, Code, Database, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Award, FileText, ListChecks, Eye, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface CandidateProfileProps {
  profile: CandidateProfileType;
  onProceed: () => void;
  onBack: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileProps> = ({ profile, onProceed, onBack }) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'keywords' | 'scanned_pdf'>('claims');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRawText, setShowRawText] = useState(false);

  const keyPoints = profile.scannedKeyPoints || [];
  const extractedKeywords = profile.extractedKeywords || [];
  const rawText = profile.rawExtractedText || '';
  const isAiParsed = profile.parserSource === 'gemini_multimodal' || profile.parserSource === 'gemini_text';

  const formatCategoryName = (cat: string) => {
    switch (cat) {
      case 'core_skill': return 'Core Skills';
      case 'domain_expertise': return 'Domain Expertise';
      case 'tool_or_technology': return 'Tools & Technology';
      case 'methodology_or_standard': return 'Methodologies & Standards';
      case 'job_responsibility': return 'Job Responsibilities';
      case 'qualification_or_education': return 'Qualifications & Degrees';
      case 'measurable_result': return 'Measurable Results & Metrics';
      case 'key_achievement': return 'Key Achievements';
      default: return cat;
    }
  };

  const filteredKeywords = selectedCategory === 'all'
    ? extractedKeywords
    : extractedKeywords.filter(k => k.category === selectedCategory);

  const renderCategoryBadge = (category: string) => {
    switch (category) {
      case 'Key Achievement & Outcomes':
      case 'Impact & Results':
        return <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>📈 {category}</span>;
      case 'Leadership & Team Direction':
      case 'Leadership & Management':
        return (
          <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            👥 Leadership & Team Direction
          </span>
        );
      case 'Operational Execution & Quality':
      case 'Process & Operations':
        return <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>⚙️ {category}</span>;
      case 'Strategic Initiatives & Planning':
      case 'Strategy & Planning':
        return <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>🧭 Strategic Initiatives & Planning</span>;
      case 'Tools, Platforms & Methodologies':
      case 'Scale & Systems':
        return <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>🛠️ Tools, Platforms & Methodologies</span>;
      default:
        return <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>📋 {category}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      {/* Header breadcrumb & navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-indigo" style={{ marginBottom: '0.4rem' }}>
            Step 2 of 4 • Profile & Claims Extracted
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Candidate Profile & Claim Graph
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '340px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', flex: 1 }}>
            Back
          </button>
          <button onClick={onProceed} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', flex: 2 }}>
            <span>Configure Interview</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Candidate Card */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
              flexShrink: 0
            }}>
              {(profile.name || 'C').split(' ').map(n => n[0] || '').join('').slice(0, 2)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  {profile.name}
                </h3>
                <span className={isAiParsed ? "badge badge-emerald" : "badge badge-cyan"}>
                  {isAiParsed ? '🤖 AI Verified Extraction' : '📄 Direct Document Extraction'}
                </span>
              </div>
              <p style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                {profile.title}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {profile.experienceYears > 0 && <span>🎯 {profile.experienceYears}+ Years Exp</span>}
                {profile.location && <span>📍 {profile.location}</span>}
                {rawText.length > 0 && <span>📝 {rawText.length} Characters Scanned</span>}
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '10px',
            padding: '0.6rem 1rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted Claims
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}>
              {profile.claims.length} Verifiable Items
            </div>
          </div>
        </div>

        {profile.summary && (
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            {profile.summary}
          </p>
        )}
      </div>

      {/* Tab Switcher: Targeted Grounded Claims vs Extracted Keywords vs Scanned Key Points */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('claims')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: activeTab === 'claims' ? '1px solid var(--primary)' : '1px solid transparent',
            background: activeTab === 'claims' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'claims' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <ShieldCheck size={16} color={activeTab === 'claims' ? '#818cf8' : '#94a3b8'} />
          <span>Grounded Claims ({profile.claims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: activeTab === 'keywords' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'keywords' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'keywords' ? '#6ee7b7' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={16} color={activeTab === 'keywords' ? '#34d399' : '#94a3b8'} />
          <span>Extracted Keywords & Skills ({extractedKeywords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scanned_pdf')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: activeTab === 'scanned_pdf' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            background: activeTab === 'scanned_pdf' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'scanned_pdf' ? '#67e8f9' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <ListChecks size={16} color={activeTab === 'scanned_pdf' ? '#06b6d4' : '#94a3b8'} />
          <span>Scanned Document Key Points ({keyPoints.length})</span>
        </button>
      </div>

      {/* Tab 1: Targeted Grounded Claims */}
      {activeTab === 'claims' && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Extracted Verifiable Claims
              </h4>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
              Targeted for adaptive interview inquiry & validation
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {profile.claims.map((claim, idx) => (
              <div
                key={claim.id || idx}
                className="glass-card"
                style={{
                  padding: '1rem 1.15rem',
                  borderLeft: '4px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  flexWrap: 'wrap',
                  background: 'rgba(14, 19, 31, 0.65)'
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    {renderCategoryBadge(claim.category)}
                    {claim.contextProject && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        Context: {claim.contextProject}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4, fontFamily: 'var(--font-mono)' }}>
                    "{claim.rawClaim}"
                  </div>
                  {claim.claimedMetrics && claim.claimedMetrics !== 'N/A' && claim.claimedMetrics !== 'Documented Highlight' && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>📌 Stated Deliverable / Metric:</span>
                      <strong>{claim.claimedMetrics}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.72rem',
                    color: '#34d399',
                    background: 'rgba(52, 211, 153, 0.1)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}>
                    <CheckCircle2 size={12} />
                    <span>Grounded in Resume</span>
                  </span>
                  {claim.confidenceLevel && (
                    <span style={{
                      fontSize: '0.68rem',
                      color: claim.confidenceLevel === 'High' ? '#a7f3d0' : '#fde68a',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px'
                    }}>
                      Confidence: {claim.confidenceLevel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Extracted Keywords & Skills (Domain-Independent with Grounded Evidence) */}
      {activeTab === 'keywords' && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#34d399" style={{ flexShrink: 0 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Extracted Keywords, Skills & Evidence
              </h4>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
              100% Verified against Document Content • Zero Hallucinations
            </span>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              { id: 'all', label: `All (${extractedKeywords.length})` },
              { id: 'core_skill', label: `Skills (${extractedKeywords.filter(k => k.category === 'core_skill').length})` },
              { id: 'job_responsibility', label: `Responsibilities (${extractedKeywords.filter(k => k.category === 'job_responsibility').length})` },
              { id: 'measurable_result', label: `Metrics & Results (${extractedKeywords.filter(k => k.category === 'measurable_result').length})` },
              { id: 'qualification_or_education', label: `Qualifications (${extractedKeywords.filter(k => k.category === 'qualification_or_education').length})` },
              { id: 'tool_or_technology', label: `Tools (${extractedKeywords.filter(k => k.category === 'tool_or_technology').length})` },
              { id: 'methodology_or_standard', label: `Methodologies (${extractedKeywords.filter(k => k.category === 'methodology_or_standard').length})` }
            ].filter(f => f.id === 'all' || !f.label.includes('(0)')).map(filter => (
              <button
                key={filter.id}
                onClick={() => setSelectedCategory(filter.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedCategory === filter.id ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  background: selectedCategory === filter.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedCategory === filter.id ? '#6ee7b7' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredKeywords.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
              {filteredKeywords.map((kw, idx) => (
                <div
                  key={kw.id || idx}
                  className="glass-card"
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderLeft: '3px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.6rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{
                        fontSize: '0.68rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#6ee7b7',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {formatCategoryName(kw.category)}
                      </span>
                      {kw.sourceSection && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
                          📍 {kw.sourceSection}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                      {kw.keyword}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      borderLeft: '2px solid rgba(16, 185, 129, 0.5)',
                      fontStyle: 'italic'
                    }}>
                      "{kw.evidenceSnippet}"
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-faint)', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Verified Grounding</span>
                    <span>Confidence: {Math.round(kw.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No keywords match the selected filter category.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Scanned PDF Key Points (Pure Document Extraction Without Gemini) */}
      {activeTab === 'scanned_pdf' && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#06b6d4" style={{ flexShrink: 0 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Verbatim Key Points Extracted Directly from PDF
              </h4>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
              Native PDF Extraction • Zero AI Modification
            </span>
          </div>

          {keyPoints.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {keyPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: '0.85rem 1.15rem',
                    borderLeft: '3px solid var(--accent-cyan)',
                    background: 'rgba(6, 182, 212, 0.04)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--accent-cyan)',
                    background: 'rgba(6, 182, 212, 0.12)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    flexShrink: 0,
                    marginTop: '0.1rem'
                  }}>
                    #{idx + 1}
                  </span>
                  <div style={{ fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                    {point}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bullet points detected in scanned stream. Check the raw text inspector below.
            </div>
          )}

          {/* Raw Scanned Text Collapsible Drawer */}
          {rawText.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <button
                onClick={() => setShowRawText(!showRawText)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Eye size={14} />
                <span>{showRawText ? 'Hide Raw Scanned Document Stream' : 'View Full Raw Scanned Document Stream'} ({rawText.length} chars)</span>
                {showRawText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showRawText && (
                <div style={{
                  marginTop: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '350px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6
                }}>
                  {rawText}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skills & Technologies Grid (Only rendered if actual skills were extracted) */}
      {((profile.skills?.languages?.length || 0) > 0 || (profile.skills?.frameworks?.length || 0) > 0 || (profile.skills?.databases?.length || 0) > 0 || (profile.skills?.toolsAndInfra?.length || 0) > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {((profile.skills?.languages?.length || 0) > 0 || (profile.skills?.frameworks?.length || 0) > 0) && (
            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Sparkles size={16} color="var(--primary-light)" />
                <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Core Competencies & Methodologies
                </h5>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {[...(profile.skills.languages || []), ...(profile.skills.frameworks || [])].map((skill, i) => (
                  <span key={i} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-main)'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {((profile.skills?.databases?.length || 0) > 0 || (profile.skills?.toolsAndInfra?.length || 0) > 0) && (
            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Database size={16} color="var(--accent-cyan)" />
                <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Tools, Platforms & Enterprise Systems
                </h5>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {[...(profile.skills.databases || []), ...(profile.skills.toolsAndInfra || [])].map((skill, i) => (
                  <span key={i} style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.8rem',
                    color: '#67e8f9'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects Highlights */}
      {profile.projects && profile.projects.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Briefcase size={16} color="#818cf8" />
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Professional Experience & Key Initiatives
            </h5>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profile.projects.map((p, idx) => (
              <div key={p.id || idx} style={{ borderBottom: idx < profile.projects.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>{p.title}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>{p.duration}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.4rem' }}>{p.role}</div>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {p.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ flex: 1, minWidth: '140px' }}>
          Change Candidate
        </button>
        <button onClick={onProceed} className="btn btn-primary" style={{ padding: '0.85rem 2rem', flex: 2, minWidth: '200px' }}>
          <span>Configure Interview Parameters</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
