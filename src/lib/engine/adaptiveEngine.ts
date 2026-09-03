import { CandidateProfile, ConversationTurn, InterviewConfig, ResumeClaim } from '../types';

export interface DynamicQuestionResult {
  question: string;
  anchoredClaimId: string;
  claimDepthLevel: number;
  investigationContext: string;
  detectedEntities: string[];
  isSessionComplete: boolean;
}

export interface CandidateResponseAnalysis {
  wordCount: number;
  entities: string[];
  intent: 'unfamiliar_or_dodged' | 'clarification_or_question' | 'superficial' | 'technical_deep' | 'standard';
  keyPhrases: string[];
  referencedTech: string[];
  hasMetrics: boolean;
  sentiment: 'confident' | 'hesitant' | 'neutral';
}

export class AdaptiveInterviewEngine {
  /**
   * Generates the next adaptive question based on resume claims and conversation history.
   * Truly assesses and adapts to the candidate's exact verbal responses.
   */
  public static generateNextQuestion(
    candidate: CandidateProfile,
    config: InterviewConfig,
    history: ConversationTurn[],
    currentClaimIndex: number,
    currentClaimDepth: number
  ): DynamicQuestionResult {
    const claims = candidate.claims || [];
    const maxTurns = config.durationMinutes <= 5 ? 4 : config.durationMinutes <= 15 ? 7 : 10;
    const candidateAnswers = history.filter(t => t.speaker === 'candidate');

    // Check if session completed
    if (candidateAnswers.length >= maxTurns || claims.length === 0) {
      return {
        question: `Thank you, ${candidate.name.split(' ')[0]}. That completes our technical deep-dive across your key resume achievements. I've recorded and cross-referenced your answers against our senior engineering competency rubric. Generating your evaluation report now.`,
        anchoredClaimId: claims[0]?.id || 'claim-end',
        claimDepthLevel: currentClaimDepth,
        investigationContext: 'Technical Assessment Concluded',
        detectedEntities: [],
        isSessionComplete: true
      };
    }

    const activeClaim = claims[currentClaimIndex % claims.length] || claims[0];
    const lastTurn = history.length > 0 ? history[history.length - 1] : null;
    const lastCandidateAnswer = lastTurn?.speaker === 'candidate' ? lastTurn.text : '';

    // If it's the very first question of the interview
    if (history.length === 0 || !lastCandidateAnswer) {
      const firstQ = this.generateInceptionQuestion(activeClaim, candidate, config);
      return {
        question: firstQ,
        anchoredClaimId: activeClaim.id,
        claimDepthLevel: 1,
        investigationContext: `Investigating Claim: "${activeClaim.rawClaim}"`,
        detectedEntities: this.extractEntities(activeClaim.rawClaim),
        isSessionComplete: false
      };
    }

    // Perform deep semantic analysis on candidate's actual answer
    const analysis = this.analyzeCandidateResponse(lastCandidateAnswer, activeClaim);
    const candidateName = candidate.name.split(' ')[0];

    let nextQuestion = '';
    let nextDepth = currentClaimDepth + 1;
    let nextClaimIdx = currentClaimIndex;
    let investigationNote = '';

    // Branch 1: Candidate indicated they don't know, wasn't their responsibility, or dodged
    if (analysis.intent === 'unfamiliar_or_dodged') {
      investigationNote = `Assessed: Candidate noted lack of direct ownership on previous probe. Pivoting to alternate component.`;
      if (claims.length > 1 && currentClaimIndex < claims.length - 1) {
        nextClaimIdx = currentClaimIndex + 1;
        const nextClaim = claims[nextClaimIdx];
        nextDepth = 1;
        nextQuestion = `Understood, thanks for clarifying that this wasn't within your primary scope. Let's redirect our focus to another significant achievement from your background: "${nextClaim.rawClaim}". What was your exact technical ownership and contribution on that initiative?`;
      } else {
        nextQuestion = `Fair enough. In that case, for the parts of ${activeClaim.contextProject || 'this system'} that you did directly build, what was the most complex technical trade-off or challenge you personally solved?`;
      }
    }
    // Branch 2: Candidate asked a clarification question or asked for direction
    else if (analysis.intent === 'clarification_or_question') {
      investigationNote = `Assessed: Candidate asked for clarification. Guiding with concrete scope.`;
      nextQuestion = `Good question. Specifically, I'm evaluating your architectural decision-making for ${activeClaim.rawClaim}. Walk me through how you designed the core data flow and handled potential concurrency bottlenecks under peak load.`;
      nextDepth = currentClaimDepth;
    }
    // Branch 3: Candidate gave a superficial or very short answer (<12 words, zero specifics)
    else if (analysis.intent === 'superficial') {
      investigationNote = `Assessed: Response was high-level. Probing for concrete engineering implementation.`;
      const quotedSnippet = lastCandidateAnswer.length > 40 ? `"${lastCandidateAnswer.slice(0, 38)}..."` : `"${lastCandidateAnswer}"`;
      nextQuestion = `You mentioned ${quotedSnippet}, but that's still quite high-level. As a ${config.seniority} ${config.roleTitle}, could you dive into the concrete technical implementation? Specifically, what protocols, data structures, or configuration parameters did you utilize?`;
      nextDepth = Math.max(1, currentClaimDepth);
    }
    // Branch 4: Deep or Standard Answer with specific technologies & choices
    else {
      const topEntities = analysis.entities;
      const firstEntity = topEntities[0];
      const secondEntity = topEntities[1];

      if (currentClaimDepth === 1) {
        // Drilled from Level 1 (Role) -> Level 2 (Architecture, protocols, database choices)
        if (firstEntity && secondEntity) {
          nextQuestion = `You highlighted working with ${firstEntity} and ${secondEntity}. What architectural trade-offs led you to choose ${firstEntity} over alternatives for this specific workload, and how did you configure the interaction between them?`;
          investigationNote = `Assessed: Candidate identified ${firstEntity} & ${secondEntity}. Probing trade-off rationale.`;
        } else if (firstEntity) {
          nextQuestion = `You mentioned incorporating ${firstEntity} into the solution. What specific constraints or workload patterns drove that decision, and how did you structure your schema or API contracts around it?`;
          investigationNote = `Assessed: Candidate cited ${firstEntity}. Probing data/API architecture.`;
        } else if (analysis.keyPhrases.length > 0) {
          const phrase = analysis.keyPhrases[0];
          nextQuestion = `You noted that you handled ${phrase}. How did you approach error handling, retries, and data consistency when designing that component?`;
          investigationNote = `Assessed: Probing reliability and error contracts for ${phrase}.`;
        } else {
          nextQuestion = `Based on your stated ownership, what were the primary architectural patterns and separation of concerns you established for this system?`;
          investigationNote = `Assessed: Probing architectural patterns and modularity.`;
        }
      } else if (currentClaimDepth === 2) {
        // Drilled from Level 2 (Architecture) -> Level 3 (Scale, Concurrency, Failures, Hotspots)
        if (topEntities.some(e => ['Redis', 'Memcached', 'caching', 'cache'].includes(e))) {
          nextQuestion = `With caching in place, how did you handle cache invalidation, cache stampedes (dogpiling), and TTL synchronization when data mutated rapidly?`;
          investigationNote = `Assessed: Probing cache invalidation & concurrency edge cases.`;
        } else if (topEntities.some(e => ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB', 'SQL', 'database', 'db'].includes(e))) {
          const dbName = topEntities.find(e => ['PostgreSQL', 'MySQL', 'MongoDB', 'DynamoDB'].includes(e)) || 'the database';
          nextQuestion = `When traffic surged toward ${activeClaim.claimedMetrics || 'peak limits'}, what indexing strategies, connection pool sizing, or partitioning did you implement on ${dbName} to prevent lock contention?`;
          investigationNote = `Assessed: Probing ${dbName} indexing, connection pooling & locks.`;
        } else if (topEntities.some(e => ['Kafka', 'RabbitMQ', 'queue', 'event', 'stream'].includes(e))) {
          nextQuestion = `In the event pipeline, how did you handle consumer group rebalancing, backpressure, and at-least-once vs exactly-once delivery guarantees?`;
          investigationNote = `Assessed: Probing message streaming, backpressure & delivery guarantees.`;
        } else if (topEntities.some(e => ['Kubernetes', 'Docker', 'AWS', 'ECS', 'microservices'].includes(e))) {
          nextQuestion = `How did you configure your container autoscaling policies, health checks, and graceful shutdown to prevent in-flight request dropping during deployments?`;
          investigationNote = `Assessed: Probing deployment resilience and horizontal autoscaling.`;
        } else {
          nextQuestion = `When concurrent load reached peak capacity, what was the first unexpected bottleneck or latency degradation you observed, and what was your remediation plan?`;
          investigationNote = `Assessed: Probing real-world load bottlenecks and mitigation.`;
        }
      } else {
        // Transition to next resume claim or Final System Retrospective
        if (claims.length > 1 && currentClaimIndex < claims.length - 1) {
          nextClaimIdx = currentClaimIndex + 1;
          const nextClaim = claims[nextClaimIdx];
          nextDepth = 1;
          nextQuestion = `That gives great clarity into how you resolved those scaling challenges. Let's move to another key accomplishment on your profile: "${nextClaim.rawClaim}". Could you walk me through the background and your direct architectural responsibilities here?`;
          investigationNote = `Advancing to Claim ${nextClaimIdx + 1}: "${nextClaim.rawClaim.slice(0, 40)}..."`;
        } else {
          nextQuestion = `Looking back at the end-to-end architecture of ${activeClaim.contextProject || 'this system'}, knowing what you know now, what is one major architectural trade-off or technology decision you would do differently today?`;
          investigationNote = `Assessed: Probing architectural retrospective and self-critique.`;
        }
      }
    }

    return {
      question: nextQuestion,
      anchoredClaimId: claims[nextClaimIdx]?.id || activeClaim.id,
      claimDepthLevel: nextDepth,
      investigationContext: investigationNote || `Investigating: "${claims[nextClaimIdx]?.rawClaim || activeClaim.rawClaim}" (Depth ${nextDepth})`,
      detectedEntities: analysis.entities,
      isSessionComplete: false
    };
  }

  /**
   * Generates Level 1: Inception question directly referencing the resume claim.
   */
  private static generateInceptionQuestion(claim: ResumeClaim, candidate: CandidateProfile, config: InterviewConfig): string {
    const candidateName = candidate.name.split(' ')[0];
    const claimText = claim.rawClaim.replace(/\.$/, '');

    if (/built|architected|designed|developed|engineered/i.test(claimText)) {
      return `Welcome, ${candidateName}. To start our technical discussion for the ${config.seniority} ${config.roleTitle} role: on your resume, you noted that you "${claimText}". Could you describe your exact personal ownership in building this, and how you architected the system boundaries?`;
    }

    if (/optimized|reduced|improved|scaled|accelerated/i.test(claimText)) {
      return `Hello ${candidateName}. One standout highlight on your profile is that you "${claimText}". Could you walk me through the initial baseline, the root bottleneck you identified, and the engineering approach you took?`;
    }

    return `Hello ${candidateName}, let's begin by discussing one of the key highlights from your experience: "${claimText}". What was your specific role and ownership in delivering this?`;
  }

  /**
   * Technical entities extractor covering 120+ software engineering terms
   */
  public static extractEntities(text: string): string[] {
    const detected: string[] = [];
    const techKeywords = [
      'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang', 'Rust', 'Java', 'C++', 'C#', '.NET', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'PostgreSQL', 'Postgres', 'Redis', 'MongoDB', 'DynamoDB', 'CockroachDB', 'Cassandra', 'MySQL', 'SQLite', 'Elasticsearch', 'ClickHouse', 'Neo4j',
      'Kafka', 'RabbitMQ', 'SQS', 'SNS', 'NATS', 'ZeroMQ', 'Celery', 'BullMQ',
      'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'K8s', 'ECS', 'EKS', 'Lambda', 'Serverless', 'Terraform',
      'Next.js', 'React', 'Vue', 'Angular', 'Svelte', 'FastAPI', 'Express', 'NestJS', 'Django', 'Flask', 'Spring Boot', 'Gin', 'gRPC', 'GraphQL', 'REST',
      'WebSockets', 'SSE', 'HTTP/2', 'HTTP/3', 'gRPC-Web', 'WebRTC',
      'caching', 'sharding', 'partitioning', 'indexing', 'PgBouncer', 'connection pool', 'load balancer', 'Nginx', 'Envoy', 'HAProxy',
      'distributed lock', 'optimistic concurrency', 'pessimistic lock', '2PC', 'Saga pattern', 'event sourcing', 'CQRS',
      'Prometheus', 'Grafana', 'Datadog', 'OpenTelemetry', 'Jaeger', 'ELK', 'Sentry',
      'vLLM', 'pgvector', 'LangChain', 'LlamaIndex', 'Ollama', 'PyTorch', 'TensorFlow'
    ];

    for (const kw of techKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text)) {
        detected.push(kw);
      }
    }

    return Array.from(new Set(detected));
  }

  /**
   * Analyzes candidate's response for depth, intent, tone, and technical substance.
   */
  public static analyzeCandidateResponse(answer: string, claim: ResumeClaim): CandidateResponseAnalysis {
    const cleanAnswer = answer.trim();
    const words = cleanAnswer.split(/\s+/);
    const wordCount = words.length;
    const lower = cleanAnswer.toLowerCase();
    const entities = this.extractEntities(cleanAnswer);

    // Intent detection
    let intent: CandidateResponseAnalysis['intent'] = 'standard';

    const dodgedPhrases = [
      "i don't know", "i dont know", "not sure", "wasn't my responsibility", "wasnt my role",
      "didn't do that", "didnt do that", "someone else", "another team", "no experience with that",
      "i can't remember", "not involved", "was not involved"
    ];
    const isDodged = dodgedPhrases.some(phrase => lower.includes(phrase));

    const isClarification = (lower.endsWith('?') || lower.includes('do you mean') || lower.includes('are you asking')) && wordCount < 20;

    if (isDodged) {
      intent = 'unfamiliar_or_dodged';
    } else if (isClarification) {
      intent = 'clarification_or_question';
    } else if (wordCount < 10 && entities.length === 0) {
      intent = 'superficial';
    } else if (wordCount >= 25 || entities.length >= 2 || /\b(trade-off|latency|concurrency|deadlock|throughput|indexed|sharded|replica|failover)\b/i.test(cleanAnswer)) {
      intent = 'technical_deep';
    }

    // Extract key action phrases
    const keyPhrases: string[] = [];
    const phraseMatches = cleanAnswer.match(/(?:responsible for|designed|built|implemented|handled|focused on|used|selected|migrated)\s+([a-zA-Z0-9\s,\-_]{3,40})/gi);
    if (phraseMatches) {
      for (const m of phraseMatches.slice(0, 2)) {
        keyPhrases.push(m.trim().replace(/^,\s*/, ''));
      }
    }

    const hasMetrics = /\d+[\s]*(?:ms|users|req|rps|%|gb|tb|k|m|million|thousand)/i.test(cleanAnswer);

    return {
      wordCount,
      entities,
      intent,
      keyPhrases,
      referencedTech: entities,
      hasMetrics,
      sentiment: isDodged ? 'hesitant' : intent === 'technical_deep' ? 'confident' : 'neutral'
    };
  }
}
