'use client';

import React from 'react';
import { CandidateProfile as CandidateProfileType } from '@/lib/types';
import { User, Briefcase, Code, Database, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Award } from 'lucide-react';

interface CandidateProfileProps {
  profile: CandidateProfileType;
  onProceed: () => void;
  onBack: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileProps> = ({ profile, onProceed, onBack }) => {
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
              {profile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  {profile.name}
                </h3>
                <span className="badge badge-emerald">Parsed Active</span>
              </div>
              <p style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                {profile.title}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {profile.experienceYears > 0 && <span>🎯 {profile.experienceYears}+ Years Exp</span>}
                {profile.location && <span>📍 {profile.location}</span>}
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
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-light)' }}>
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

      {/* Extracted Verifiable Claims (Target Anchors for Adaptive Interview) */}
      {profile.claims && profile.claims.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <ShieldCheck size={18} color="#818cf8" style={{ flexShrink: 0 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Extracted Claims (Targeted for AI Adaptive Probe)
            </h4>
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
                    <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                      {claim.category}
                    </span>
                    {claim.contextProject && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        Context: {claim.contextProject}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4, fontFamily: 'var(--font-mono)' }}>
                    "{claim.rawClaim}"
                  </div>
                  {claim.claimedMetrics && claim.claimedMetrics !== 'N/A' && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', marginTop: '0.3rem' }}>
                      Metric / Focus: <strong>{claim.claimedMetrics}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                    Ready to Probe
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills & Technologies Grid (Only rendered if actual skills were extracted) */}
      {((profile.skills?.languages?.length || 0) > 0 || (profile.skills?.frameworks?.length || 0) > 0 || (profile.skills?.databases?.length || 0) > 0 || (profile.skills?.toolsAndInfra?.length || 0) > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {((profile.skills?.languages?.length || 0) > 0 || (profile.skills?.frameworks?.length || 0) > 0) && (
            <div className="glass-card" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Code size={16} color="var(--primary-light)" />
                <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Languages & Frameworks
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
                  Databases & Infrastructure
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
              Extracted Project Experience
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
