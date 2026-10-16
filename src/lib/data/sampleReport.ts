import { EvaluationReport } from '../types';

export const SAMPLE_REPORT: EvaluationReport = {
  id: 'rep-demo-101',
  sessionId: 'sess-demo-101',
  version: 1,
  candidateName: 'Sarah Jenkins',
  targetRole: 'Senior Full Stack Cloud Architect',
  seniority: 'Senior',
  completedAt: new Date().toISOString(),
  durationMinutesSpent: 28,
  totalTurns: 12,
  overallScore: 84,
  roleReadiness: 'Immediate Match',
  recommendation: 'Strong Hire',
  executiveSummary: 'Sarah demonstrated outstanding architectural depth across distributed systems and cloud infrastructure. Her responses were nuanced, pragmatic, and directly grounded in production trade-offs. She effectively articulated database sharding strategies, latency mitigations, and cross-functional engineering leadership.',
  marketValuation: {
    percentileTier: 'Top 10% Senior Talent (Tier 1)',
    experienceBandMatch: 'Senior Band Alignment',
    estimatedRampUp: 'Immediate Day 1 Impact',
    leadershipAptitude: 'High Professional Ownership',
    keyHiringDrivers: [
      'Grounded verification of documented resume claims including 45% latency reduction.',
      'Demonstrated structured problem solving and operational resiliency under multi-region outages.'
    ]
  },
  dimensions: {
    technicalCompetency: {
      score: 88,
      label: 'Role & Domain Competency',
      summary: 'Exceptional mastery of modern distributed cloud primitives, microservice architectures, and event-driven patterns with Kafka and Kubernetes.',
      evidenceQuotes: ['"We migrated our monolithic API to gRPC microservices, which reduced inter-service overhead by 45% under peak traffic."']
    },
    problemSolving: {
      score: 82,
      label: 'Problem Solving & Trade-offs',
      summary: 'Demonstrated rigorous trade-off evaluation when balancing eventual consistency versus synchronous lock contention.',
      evidenceQuotes: ['"Rather than 2-phase commits across services, we adopted the Saga pattern with compensating transactions."']
    },
    communication: {
      score: 85,
      label: 'Communication & Conciseness',
      summary: 'Structured, top-down communication style using STAR frameworks, crisp technical vocabulary, and business impact translation.',
      evidenceQuotes: ['"The primary driver was SLA compliance during Q4 flash sales."']
    },
    experienceDepth: {
      score: 86,
      label: 'Experience Depth',
      summary: 'Deep hands-on experience troubleshooting edge cases, memory leaks in Node.js event loops, and PostgreSQL connection pool starvation.',
      evidenceQuotes: ['"We introduced PgBouncer with transaction pooling to handle sudden bursts from autoscaling Lambdas."']
    },
    resumeCredibility: {
      score: 80,
      label: 'Resume Credibility & Grounding',
      summary: 'Documented claims were substantiated with authentic implementation details, numbers, and technical rationale during inquiry.',
      evidenceQuotes: ['"The 45% latency reduction was measured using Datadog p99 metrics over a 30-day baseline."']
    }
  },
  skillAssessments: [
    {
      skill: 'Distributed Cloud Architecture & High-Availability Design',
      category: 'Core Competency',
      score: 90,
      confidence: 94,
      evidenceQuotes: ['"Designed active-active multi-region failover with Route53 latency routing and DynamoDB global tables."'],
      gapIdentified: undefined
    },
    {
      skill: 'Event-Driven Systems & Stream Processing (Kafka)',
      category: 'Methodology',
      score: 85,
      confidence: 88,
      evidenceQuotes: ['"Partitioning strategy was based on customer tenant ID to guarantee in-order delivery."'],
      gapIdentified: undefined
    },
    {
      skill: 'Database Scaling & Cache Invalidation Strategies',
      category: 'Technical Architecture',
      score: 79,
      confidence: 86,
      evidenceQuotes: ['"Used Redis with cache-aside and TTL jitter to prevent thundering herd problems."'],
      gapIdentified: 'Explore CDC (Change Data Capture) patterns for automated cache invalidation.'
    },
    {
      skill: 'Cross-Functional Technical Leadership & Mentorship',
      category: 'Communication',
      score: 82,
      confidence: 90,
      evidenceQuotes: ['"Mentored 6 engineers through architecture review boards and established RFC templates."'],
      gapIdentified: undefined
    }
  ],
  strengths: [
    {
      title: 'Distributed System Resiliency & Observability',
      description: 'Candidate possesses comprehensive understanding of tracing, distributed logs, circuit breakers, and telemetry under partial network failures.',
      quote: '"We designed circuit breakers using Envoy proxies so downstream timeouts never cascade into catastrophic service outages."'
    },
    {
      title: 'Pragmatic Engineering Economics & Cost Optimization',
      description: 'Understands cloud financial governance, right-sizing compute instances, and optimizing egress bandwidth costs.',
      quote: '"We cut cloud expenditure by 22% by leveraging Spot instances for non-critical asynchronous background workers."'
    }
  ],
  weaknesses: [
    {
      title: 'Specialized Hardware Acceleration & Low-Level Kernels',
      description: 'Limited hands-on depth with custom eBPF networking probes and direct kernel bypass architectures, though not mandatory for this role.',
      quote: '"We primarily rely on standard Linux kernel networking stacks and AWS VPC CNI rather than custom eBPF filters."'
    }
  ],
  verificationAreas: [
    {
      area: 'Multi-Region Data Sovereignty & GDPR Compliance',
      issueFound: 'Probe data localization strategies when replicating user state across EU and US regions.',
      suggestedOnsiteQuestion: 'How would you architect database replication across regions while strictly guaranteeing that EU citizen PII never leaves European jurisdiction?'
    }
  ],
  evidenceItems: [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      claimAssertion: 'Reduced end-to-end API response latency by 45% through gRPC migration and cache optimization.',
      candidateQuote: '"We converted JSON over HTTP/1.1 internal microservice communications to binary protobuf over HTTP/2 gRPC, dropping serialization costs."',
      assessmentVerdict: 'Strong Validation',
      reasoning: 'Provided specific implementation details, protocols, and benchmarking methodology that validate the documented resume outcome.'
    },
    {
      id: 'ev-2',
      claimId: 'claim-2',
      claimAssertion: 'Architected automated zero-downtime CI/CD deployment pipelines for 30+ microservices.',
      candidateQuote: '"Implemented Canary deployments using Argo Rollouts and automated Prometheus metric analysis for rollback triggers."',
      assessmentVerdict: 'Strong Validation',
      reasoning: 'Demonstrated precise knowledge of modern GitOps tooling and statistical rollback criteria.'
    },
    {
      id: 'ev-3',
      claimId: 'claim-3',
      claimAssertion: 'Led disaster recovery drills and achieved RTO under 5 minutes.',
      candidateQuote: '"We conducted quarterly game days with chaos engineering to test automated failover of our read replicas."',
      assessmentVerdict: 'Moderate Evidence',
      reasoning: 'Good conceptual knowledge, though recovery drills focused primarily on database failover rather than full datacenter evacuation.'
    }
  ],
  aiUsageSummary: {
    totalTokens: 14250,
    totalLatencyMs: 3200,
    totalCostUsd: 0.0084,
    provider: 'Gemini 1.5 Pro',
    model: 'gemini-1.5-pro'
  }
};
