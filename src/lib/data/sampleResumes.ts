import { CandidateProfile } from '../types';

export const SAMPLE_CANDIDATES: CandidateProfile[] = [
  {
    id: 'cand-alex-chen',
    name: 'Alex Chen',
    title: 'Senior Full-Stack & Distributed Systems Engineer',
    email: 'alex.chen.dev@example.com',
    experienceYears: 6,
    location: 'San Francisco, CA',
    summary: 'Full-stack software engineer specializing in high-throughput Node.js microservices, distributed caching, PostgreSQL data pipelines, and responsive React web applications.',
    skills: {
      languages: ['TypeScript', 'JavaScript (ES6+)', 'Go', 'SQL', 'HTML5/CSS3'],
      frameworks: ['Node.js', 'Express', 'Next.js', 'React', 'NestJS', 'Tailwind CSS'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB', 'DynamoDB', 'Elasticsearch'],
      toolsAndInfra: ['Docker', 'Kubernetes', 'AWS (ECS, Lambda, S3, RDS)', 'Kafka', 'CI/CD (GitHub Actions)', 'Prometheus/Grafana']
    },
    projects: [
      {
        id: 'proj-1',
        title: 'High-Throughput E-Commerce & Subscription API',
        role: 'Lead Backend Engineer',
        duration: '2022 - Present',
        technologies: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'AWS ECS', 'Docker'],
        description: 'Designed and deployed core transaction processing engine handling thousands of real-time checkouts and subscription recurring billing cycles.',
        highlights: [
          'Built a high-performance Node.js API handling 100,000 active daily users with sub-80ms p95 latency.',
          'Architected dual-layer caching strategy with Redis, reducing database read pressure by 64%.',
          'Eliminated database deadlocks during flash sales by introducing optimistic concurrency and distributed locks.'
        ]
      },
      {
        id: 'proj-2',
        title: 'Real-Time Event Stream Analytics Pipeline',
        role: 'Full-Stack Software Engineer',
        duration: '2020 - 2022',
        technologies: ['Kafka', 'Go', 'React', 'PostgreSQL', 'Kubernetes', 'WebSockets'],
        description: 'Engineered an end-to-end telemetry ingestion system processing over 12 million events daily with a live dashboard.',
        highlights: [
          'Implemented Kafka consumer groups with dynamic rebalancing, ensuring zero data loss during traffic spikes.',
          'Built interactive React telemetry dashboard with WebSocket streaming at 60 FPS.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        institution: 'University of Washington',
        year: '2018'
      }
    ],
    claims: [
      {
        id: 'claim-1',
        rawClaim: 'Built a high-performance Node.js API handling 100,000 users with sub-80ms p95 latency.',
        category: 'Scale & Traffic',
        contextProject: 'High-Throughput E-Commerce & Subscription API',
        claimedMetrics: '100,000 active users, <80ms p95 latency',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-2',
        rawClaim: 'Architected dual-layer caching strategy with Redis, reducing database read pressure by 64%.',
        category: 'Database & Storage',
        contextProject: 'High-Throughput E-Commerce & Subscription API',
        claimedMetrics: '64% DB read reduction',
        confidenceLevel: 'Needs Deep-Dive',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-3',
        rawClaim: 'Implemented Kafka consumer groups with dynamic rebalancing, ensuring zero data loss during traffic spikes.',
        category: 'Architecture',
        contextProject: 'Real-Time Event Stream Analytics Pipeline',
        claimedMetrics: '12M daily events, zero data loss',
        confidenceLevel: 'Medium',
        verificationStatus: 'Pending'
      }
    ]
  },
  {
    id: 'cand-maya-patel',
    name: 'Maya Patel',
    title: 'Senior AI & ML Infrastructure Platform Engineer',
    email: 'maya.patel.ai@example.com',
    experienceYears: 7,
    location: 'New York, NY',
    summary: 'AI Systems engineer with deep expertise in LLM inference pipelines, vector embeddings at scale, low-latency microservices, and GPU cluster orchestration.',
    skills: {
      languages: ['Python', 'TypeScript', 'C++', 'SQL'],
      frameworks: ['PyTorch', 'FastAPI', 'Next.js', 'LangChain', 'vLLM', 'Triton'],
      databases: ['PostgreSQL (pgvector)', 'Qdrant', 'Redis', 'Pinecone'],
      toolsAndInfra: ['Kubernetes', 'Ray', 'Docker', 'AWS (EC2 G5/P4, EKS, S3)', 'Terraform', 'Weights & Biases']
    },
    projects: [
      {
        id: 'proj-ml-1',
        title: 'Enterprise Semantic Search & LLM RAG Pipeline',
        role: 'Lead ML Platform Engineer',
        duration: '2023 - Present',
        technologies: ['Python', 'FastAPI', 'pgvector', 'vLLM', 'Ray', 'Next.js'],
        description: 'Built scalable document embedding and retrieval-augmented generation engine serving 500+ enterprise clients.',
        highlights: [
          'Scaled semantic retrieval across 50 million vector embeddings with sub-40ms retrieval latency.',
          'Reduced LLM serving GPU cost by 52% by implementing continuous batching and FP8 quantization.',
          'Designed hybrid search combining BM25 keyword matching with dense embeddings in PostgreSQL.'
        ]
      }
    ],
    education: [
      {
        degree: 'M.S. in Artificial Intelligence',
        institution: 'Columbia University',
        year: '2019'
      }
    ],
    claims: [
      {
        id: 'claim-ml-1',
        rawClaim: 'Scaled semantic retrieval across 50 million vector embeddings with sub-40ms retrieval latency.',
        category: 'Performance & Latency',
        contextProject: 'Enterprise Semantic Search & LLM RAG Pipeline',
        claimedMetrics: '50M vectors, <40ms latency',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-ml-2',
        rawClaim: 'Reduced LLM serving GPU cost by 52% by implementing continuous batching and FP8 quantization.',
        category: 'Scale & Traffic',
        contextProject: 'Enterprise Semantic Search & LLM RAG Pipeline',
        claimedMetrics: '52% GPU cost reduction',
        confidenceLevel: 'Needs Deep-Dive',
        verificationStatus: 'Pending'
      }
    ]
  },
  {
    id: 'cand-david-rossi',
    name: 'David Rossi',
    title: 'Principal Cloud & Backend Architect',
    email: 'd.rossi.cloud@example.com',
    experienceYears: 10,
    location: 'Austin, TX',
    summary: 'Cloud backend architect specializing in enterprise microservices decomposition, multi-region database failover, and zero-downtime migrations.',
    skills: {
      languages: ['Go', 'TypeScript', 'Java', 'Rust', 'SQL'],
      frameworks: ['gRPC', 'Node.js', 'Spring Boot', 'Next.js'],
      databases: ['PostgreSQL', 'CockroachDB', 'Cassandra', 'Redis'],
      toolsAndInfra: ['Kubernetes', 'AWS', 'GCP', 'Terraform', 'Envoy / Istio', 'Datadog']
    },
    projects: [
      {
        id: 'proj-dr-1',
        title: 'Core Banking Ledger & Multi-Region Migration',
        role: 'Principal Architect',
        duration: '2021 - 2024',
        technologies: ['Go', 'CockroachDB', 'AWS', 'Terraform', 'gRPC', 'Kubernetes'],
        description: 'Led architecture and zero-downtime data migration for core financial transaction processing engine.',
        highlights: [
          'Migrated 4TB legacy transactional database to multi-region CockroachDB cluster with zero downtime.',
          'Achieved 99.999% uptime SLA across 4 global cloud regions handling 25,000 transactions/sec.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. in Software Engineering',
        institution: 'University of Texas at Austin',
        year: '2014'
      }
    ],
    claims: [
      {
        id: 'claim-dr-1',
        rawClaim: 'Migrated 4TB legacy transactional database to multi-region CockroachDB cluster with zero downtime.',
        category: 'Database & Storage',
        contextProject: 'Core Banking Ledger & Multi-Region Migration',
        claimedMetrics: '4TB data, zero downtime',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-dr-2',
        rawClaim: 'Achieved 99.999% uptime SLA across 4 global cloud regions handling 25,000 transactions/sec.',
        category: 'Reliability & CI/CD',
        contextProject: 'Core Banking Ledger & Multi-Region Migration',
        claimedMetrics: '99.999% SLA, 25k TPS',
        confidenceLevel: 'Needs Deep-Dive',
        verificationStatus: 'Pending'
      }
    ]
  }
];
