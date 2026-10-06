'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ConversationTurn, InterviewSession, InterviewStage } from '@/lib/types';
import {
  Bot, User, Send, Clock, Sparkles, Shield, AlertCircle, CheckCircle2,
  Zap, ArrowRight, Loader2, RefreshCw, Mic, MicOff, Volume2, VolumeX, Pause, Play, Wifi, WifiOff
} from 'lucide-react';
import { StoredAISettings } from './AISettingsModal';

interface LiveInterviewProps {
  session: InterviewSession;
  onComplete: () => void;
  onSessionUpdate?: (session: InterviewSession) => void;
  userId?: string;
}

const STAGE_DISPLAY_NAMES: Record<InterviewStage, string> = {
  CREATED: 'Initialization',
  READY: 'Calibrated',
  STARTING: 'Connecting',
  INTRO: '1. Introduction',
  RESUME_DISCUSSION: '2. Career Highlights',
  TECHNICAL: '3. Domain Mastery',
  PROJECT_DEEP_DIVE: '4. Claim Deep-Dive',
  PROBLEM_SOLVING: '5. Applied Problem Solving',
  BEHAVIORAL_HR: '6. Collaboration & Leadership',
  CANDIDATE_QUESTIONS: '7. Candidate Q&A',
  FINALIZING: '8. Evaluation Wrap-up',
  COMPLETED: 'Completed'
};

const STAGE_ORDER: InterviewStage[] = [
  'INTRO',
  'RESUME_DISCUSSION',
  'TECHNICAL',
  'PROJECT_DEEP_DIVE',
  'PROBLEM_SOLVING',
  'BEHAVIORAL_HR',
  'CANDIDATE_QUESTIONS',
  'FINALIZING'
];

export const LiveInterview: React.FC<LiveInterviewProps> = ({ session: initialSession, onComplete, onSessionUpdate, userId }) => {
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investigationContext, setInvestigationContext] = useState(
    initialSession.turns[0]?.evaluationNote || `Stage: ${initialSession.currentStage || 'INTRO'}`
  );
  const [secondsRemaining, setSecondsRemaining] = useState((session.config?.durationMinutes || 15) * 60);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [sttConfidence, setSttConfidence] = useState<number>(0.95);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.turns, isSubmitting]);

  // Countdown timer
  useEffect(() => {
    if (isPaused || isReconnecting) return;
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
  }, [isPaused, isReconnecting]);

  // Speech Recognition (Web Speech API for voice mode - FR-009)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        let confidenceSum = 0;
        let resultCount = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i][0].confidence) {
            confidenceSum += event.results[i][0].confidence;
            resultCount++;
          }
        }

        setCurrentResponse(transcript);
        if (resultCount > 0) {
          const avgConfidence = confidenceSum / resultCount;
          setSttConfidence(avgConfidence);
          if (avgConfidence < 0.65) {
            setLowConfidenceWarning('Low speech clarity detected. Speak clearly into the microphone.');
          } else {
            setLowConfidenceWarning(null);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechRecognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your responses in the text box.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
        setLowConfidenceWarning(null);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // Text-To-Speech (FR-009)
  const speakQuestion = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeakingTTS(true);
    utterance.onend = () => setIsSpeakingTTS(false);
    utterance.onerror = () => setIsSpeakingTTS(false);
    window.speechSynthesis.speak(utterance);
  };

  // Speak initial question on load if in voice mode
  useEffect(() => {
    if (session.config.mode === 'voice' && session.turns.length === 1 && session.turns[0].speaker === 'ai') {
      speakQuestion(session.turns[0].text);
    }
  }, []);

  const handleSendResponse = async (overrideText?: string) => {
    const answer = overrideText || currentResponse;
    if (!answer.trim() || isSubmitting) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    setCurrentResponse('');

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

    const authToken = localStorage.getItem('verveai_token');
    const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const res = await fetch('/api/interview/respond', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sessionId: session.id,
          answerText: answer,
          clientLLMConfig,
          userId,
          sttConfidence
        })
      });

      const data = await res.json();
      if (data.success) {
        const updatedSession = {
          ...session,
          turns: data.turns,
          currentStage: data.stage || session.currentStage,
          currentClaimDepth: data.claimDepthLevel,
          status: data.isSessionComplete ? 'completed' as const : 'in_progress' as const
        };
        setSession(updatedSession);
        if (onSessionUpdate) onSessionUpdate(updatedSession);

        if (data.investigationContext) {
          setInvestigationContext(data.investigationContext);
        }

        // Voice output
        if (data.nextQuestion && session.config.mode === 'voice') {
          speakQuestion(data.nextQuestion);
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
    }
  };

  const handleSimulateReconnect = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
    }, 1500);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const currentStageIndex = STAGE_ORDER.indexOf(session.currentStage || 'INTRO');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      {/* Top Header & SRS Stage Machine Bar */}
      <div className="glass-card" style={{ padding: '1.15rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                SRS State: {session.currentStage || 'INTRO'}
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                {session.config.seniority} {session.config.roleTitle}
              </span>
              {session.config.mode === 'voice' && (
                <span className="badge badge-emerald" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Mic size={12} /> Live Voice
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {investigationContext}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Countdown Clock */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.45rem 0.85rem', borderRadius: '8px',
              background: secondsRemaining < 120 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${secondsRemaining < 120 ? '#ef4444' : 'var(--border-subtle)'}`
            }}>
              <Clock size={16} color={secondsRemaining < 120 ? '#ef4444' : '#38bdf8'} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: secondsRemaining < 120 ? '#ef4444' : '#fff' }}>
                {formatTime(secondsRemaining)}
              </span>
            </div>

            {/* Audio Controls */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted && typeof window !== 'undefined') window.speechSynthesis.cancel();
              }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem' }}
              title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} color="var(--accent-cyan)" />}
            </button>

            {/* Reconnect / Health Handler (FR-010) */}
            <button
              type="button"
              onClick={handleSimulateReconnect}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem' }}
              title="Verify connection state"
            >
              {isReconnecting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} color="#10b981" />}
            </button>

            {/* Finish Early */}
            <button
              type="button"
              onClick={onComplete}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', borderColor: 'var(--border-subtle)' }}
            >
              Finish & Evaluate
            </button>
          </div>
        </div>

        {/* Visual Stage Progress Stepper (FR-006 / Section 7) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {STAGE_ORDER.map((stage, idx) => {
            const isCurrent = session.currentStage === stage;
            const isPassed = currentStageIndex > idx;
            return (
              <div
                key={stage}
                style={{
                  flex: 1,
                  minWidth: '90px',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '6px',
                  background: isCurrent ? 'rgba(6, 182, 212, 0.2)' : isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isCurrent ? 'var(--accent-cyan)' : isPassed ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--accent-cyan)' : isPassed ? '#10b981' : 'var(--text-faint)' }}>
                  {STAGE_DISPLAY_NAMES[stage].replace(/^\d+\.\s*/, '')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="glass-card" style={{ padding: '1.5rem', minHeight: '420px', maxHeight: '550px', overflowY: 'auto', marginBottom: '1.25rem' }}>
        {session.turns.map((turn, index) => {
          const isAI = turn.speaker === 'ai';
          return (
            <div
              key={turn.id || index}
              style={{
                display: 'flex',
                gap: '0.85rem',
                marginBottom: '1.35rem',
                justifyContent: isAI ? 'flex-start' : 'flex-end'
              }}
            >
              {isAI && (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Bot size={20} color="#fff" />
                </div>
              )}

              <div style={{
                maxWidth: '78%',
                padding: '1rem 1.25rem',
                borderRadius: isAI ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                background: isAI ? 'rgba(15, 23, 42, 0.8)' : 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(99,102,241,0.25))',
                border: `1px solid ${isAI ? 'var(--border-subtle)' : 'rgba(6,182,212,0.3)'}`,
                color: '#ffffff',
                lineHeight: 1.55,
                fontSize: '0.95rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isAI ? 'var(--accent-cyan)' : '#818cf8' }}>
                    {isAI ? 'Alphagrew AI Interviewer' : session.candidate.name}
                  </span>
                  {turn.stage && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>
                      {turn.stage}
                    </span>
                  )}
                </div>

                <div>{turn.text}</div>

                {/* Grounding tag for AI turns */}
                {isAI && turn.anchoredClaimId && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                    🎯 Grounded in Resume Evidence ({turn.anchoredClaimId})
                  </div>
                )}
              </div>

              {!isAI && (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={20} color="#fff" />
                </div>
              )}
            </div>
          );
        })}

        {isSubmitting && (
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={18} className="animate-spin" color="var(--accent-cyan)" />
            </div>
            <span>Evaluating answer evidence and formulating next adaptive probe...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Waveform Activity Indicator (FR-009) */}
      {(isListening || isSpeakingTTS) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.6rem', marginBottom: '0.85rem', borderRadius: '8px',
          background: isListening ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)',
          border: `1px solid ${isListening ? 'rgba(239,68,68,0.3)' : 'rgba(6,182,212,0.3)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '4px', height: '16px', background: isListening ? '#ef4444' : 'var(--accent-cyan)', borderRadius: '2px', animation: 'pulse 1s infinite' }} />
            <span style={{ width: '4px', height: '24px', background: isListening ? '#ef4444' : 'var(--accent-cyan)', borderRadius: '2px', animation: 'pulse 0.7s infinite' }} />
            <span style={{ width: '4px', height: '12px', background: isListening ? '#ef4444' : 'var(--accent-cyan)', borderRadius: '2px', animation: 'pulse 1.2s infinite' }} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isListening ? '#ef4444' : 'var(--accent-cyan)' }}>
            {isListening ? 'Microphone Active • Listening to your answer...' : 'AI Speaking • Synthesizing question audio...'}
          </span>
        </div>
      )}

      {/* Low-Confidence STT Warning (FR-012) */}
      {lowConfidenceWarning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 0.85rem', marginBottom: '0.85rem', borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24', fontSize: '0.8rem'
        }}>
          <AlertCircle size={15} />
          <span>{lowConfidenceWarning}</span>
        </div>
      )}

      {/* Response Input Area */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendResponse(); }} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="Type or speak your answer with specific details, metrics, and execution trade-offs..."
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendResponse();
              }
            }}
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              color: '#ffffff',
              fontSize: '0.95rem',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Voice Toggle Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
          style={{
            height: '52px',
            padding: '0 1.25rem',
            background: isListening ? '#ef4444' : undefined,
            color: isListening ? '#fff' : undefined
          }}
          title={isListening ? 'Stop listening' : 'Speak answer using microphone'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} color="var(--accent-cyan)" />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!currentResponse.trim() || isSubmitting}
          className="btn btn-primary glow-cyan"
          style={{ height: '52px', padding: '0 1.5rem', opacity: !currentResponse.trim() || isSubmitting ? 0.5 : 1 }}
        >
          <Send size={18} />
          <span>Submit</span>
        </button>
      </form>
    </div>
  );
};
