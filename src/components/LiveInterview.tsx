'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CandidateProfile, ConversationTurn, InterviewConfig, InterviewSession } from '@/lib/types';
import { Bot, User, Send, Clock, Sparkles, Shield, AlertCircle, ChevronDown, CheckCircle2, Zap, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { StoredAISettings } from './AISettingsModal';

interface LiveInterviewProps {
  session: InterviewSession;
  onComplete: () => void;
}

export const LiveInterview: React.FC<LiveInterviewProps> = ({ session: initialSession, onComplete }) => {
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investigationContext, setInvestigationContext] = useState(
    initialSession.turns[0]?.evaluationNote || `Investigating: "${session.candidate.claims[0]?.rawClaim || 'Core Engineering Work'}"`
  );
  const [currentClaimDepth, setCurrentClaimDepth] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(session.config.durationMinutes * 60);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.turns, isSubmitting]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendResponse = async (overrideText?: string) => {
    const answer = overrideText || currentResponse;
    if (!answer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setCurrentResponse('');
    setIsSpeaking(true);

    // Retrieve client-configured LLM settings from localStorage if set (defaults to Gemini)
    let clientLLMConfig: any = { provider: 'gemini' };
    const saved = localStorage.getItem('verve_ai_settings') || localStorage.getItem('interview_ai_settings');
    if (saved) {
      try {
        const parsed: StoredAISettings = JSON.parse(saved);
        if (parsed.provider) {
          clientLLMConfig = parsed;
        }
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          answerText: answer,
          clientLLMConfig
        })
      });

      const data = await res.json();
      if (data.success) {
        setSession((prev) => ({
          ...prev,
          turns: data.turns,
          currentClaimDepth: data.claimDepthLevel,
          status: data.isSessionComplete ? 'completed' : 'in_progress'
        }));
        setCurrentClaimDepth(data.claimDepthLevel);
        if (data.investigationContext) {
          setInvestigationContext(data.investigationContext);
        }

        if (data.isSessionComplete) {
          setTimeout(() => {
            onComplete();
          }, 1800);
        }
      }
    } catch (err) {
      console.error('Error submitting response:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setIsSpeaking(false), 1200);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendResponse();
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const candidateTurns = session.turns.filter(t => t.speaker === 'candidate');
  const targetTurns = session.config.durationMinutes <= 5 ? 4 : session.config.durationMinutes <= 15 ? 7 : 10;
  const progressPercent = Math.min(100, Math.round((candidateTurns.length / targetTurns) * 100));

  const latestAiQuestion = [...session.turns].reverse().find(t => t.speaker === 'ai');

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* Top Header Controls & Live Timer */}
      <div className="glass-card" style={{ padding: '0.85rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-emerald)',
            boxShadow: '0 0 10px var(--accent-emerald)'
          }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
              {session.candidate.name} • {session.config.seniority} {session.config.roleTitle}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              Focus: {session.config.focusArea}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Progress Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Progress ({candidateTurns.length}/{targetTurns})
            </div>
            <div style={{ width: '80px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Live Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            color: secondsRemaining < 120 ? '#fda4af' : '#67e8f9'
          }}>
            <Clock size={14} />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            onClick={onComplete}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
          >
            Finish Early & Evaluate
          </button>
        </div>
      </div>

      {/* Investigation Context Bar */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Zap size={16} color="var(--primary-light)" />
          <span style={{ fontSize: '0.88rem', color: '#c7d2fe', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {investigationContext}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
            Adaptive Level L{currentClaimDepth}
          </span>
          <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
            {session.config.rigorLevel}
          </span>
        </div>
      </div>

      {/* Main Conversational Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        {/* Conversation Stream */}
        <div className="glass-card" style={{
          padding: '1.5rem',
          minHeight: '420px',
          maxHeight: '520px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {session.turns.map((turn, idx) => {
            const isAi = turn.speaker === 'ai';
            return (
              <div
                key={turn.id || idx}
                style={{
                  display: 'flex',
                  gap: '0.9rem',
                  alignItems: 'flex-start',
                  alignSelf: isAi ? 'flex-start' : 'flex-end',
                  flexDirection: isAi ? 'row' : 'row-reverse',
                  maxWidth: '88%'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isAi ? 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)' : 'rgba(255, 255, 255, 0.1)',
                  border: isAi ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isAi ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none'
                }}>
                  {isAi ? <Bot size={20} color="#ffffff" /> : <User size={18} color="#ffffff" />}
                </div>

                {/* Message Bubble */}
                <div style={{
                  background: isAi ? 'rgba(255, 255, 255, 0.04)' : 'rgba(99, 102, 241, 0.15)',
                  border: isAi ? '1px solid var(--border-subtle)' : '1px solid rgba(99, 102, 241, 0.35)',
                  borderRadius: '14px',
                  padding: '1rem 1.25rem',
                  color: '#ffffff',
                  lineHeight: 1.55
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '0.35rem',
                    fontSize: '0.72rem'
                  }}>
                    <span style={{ fontWeight: 700, color: isAi ? 'var(--primary-light)' : '#a5b4fc' }}>
                      {isAi ? 'AI INTERVIEWER' : session.candidate.name.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.96rem', whiteSpace: 'pre-wrap' }}>
                    {turn.text}
                  </div>

                  {/* AI Assessment Note */}
                  {isAi && turn.evaluationNote && (
                    <div style={{
                      marginTop: '0.65rem',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      fontSize: '0.74rem',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}>
                      <Sparkles size={13} color="#818cf8" />
                      <span>{turn.evaluationNote}</span>
                    </div>
                  )}

                  {/* Detected Technical Tags */}
                  {turn.detectedEntities && turn.detectedEntities.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.45rem' }}>
                      {turn.detectedEntities.map((ent, eIdx) => (
                        <span key={eIdx} style={{
                          background: 'rgba(6, 182, 212, 0.12)',
                          color: '#67e8f9',
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {ent}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* AI Thinking Indicator */}
          {isSubmitting && (
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', maxWidth: '88%' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Loader2 size={18} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  Assessing your answer & synthesizing next adaptive probe...
                </span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <div className="wave-bar" style={{ animationDelay: '0s' }} />
                  <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                  <div className="wave-bar" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Controls */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <textarea
              ref={textareaRef}
              rows={3}
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your technical response here... (Press Ctrl + Enter to submit)"
              disabled={isSubmitting || session.status === 'completed'}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                color: '#ffffff',
                fontSize: '0.94rem',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              Tip: Explain concrete trade-offs, tech stack details, and specific parameters for highest evaluation accuracy.
            </div>

            <button
              onClick={() => handleSendResponse()}
              disabled={!currentResponse.trim() || isSubmitting || session.status === 'completed'}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.35rem', fontSize: '0.88rem' }}
            >
              {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              <span>Submit Answer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
