import { CandidateProfile } from '../types';

export const SAMPLE_CANDIDATES: CandidateProfile[] = [
  {
    id: 'cand-sarah-jenkins',
    name: 'Sarah Jenkins',
    title: 'Senior Financial Analyst & FP&A Lead',
    email: 'sarah.jenkins.fpa@example.com',
    experienceYears: 6,
    location: 'Chicago, IL',
    summary: 'Senior Corporate Finance Analyst specializing in multi-entity financial modeling, annual budgeting, variance analysis, rolling forecasts, and ERP migration across multinational entities.',
    skills: {
      languages: ['Financial Modeling', 'Financial Analysis', 'Budgeting & Forecasting', 'Tax Accounting', 'Financial Auditing'],
      frameworks: ['Variance Analysis', 'GAAP', 'Internal Controls', 'SOX Compliance', 'Cash Flow Management', 'P&L Management'],
      databases: ['SAP ERP', 'Oracle Financials', 'NetSuite', 'Hyperion', 'QuickBooks'],
      toolsAndInfra: ['Microsoft Excel', 'Power BI', 'Tableau', 'Bloomberg Terminal']
    },
    projects: [
      {
        id: 'proj-fin-1',
        title: 'Global Operating Budget & Rolling Forecast',
        role: 'Senior FP&A Lead',
        duration: '2022 - Present',
        technologies: ['SAP ERP', 'Financial Modeling', 'Power BI', 'Microsoft Excel'],
        description: 'Led annual $45M operating budget and multi-currency rolling forecasts across 4 international subsidiaries.',
        highlights: [
          'Streamlined global quarterly forecast cycle from 21 days down to 6 days utilizing automated SAP data pipelines.',
          'Identified $2.3M in operational cost redundancies through departmental variance analysis and vendor consolidation.',
          'Built dynamic sensitivity models forecasting cash runway under variable interest rate and inflation scenarios.'
        ]
      },
      {
        id: 'proj-fin-2',
        title: 'Cloud ERP Migration & SOX Controls Framework',
        role: 'Corporate Financial Analyst',
        duration: '2020 - 2022',
        technologies: ['NetSuite', 'SOX Compliance', 'GAAP', 'Tableau'],
        description: 'Spearheaded general ledger migration to NetSuite and established key internal audit controls.',
        highlights: [
          'Audited 12,000+ balance sheet accounts during legacy ERP cutover, achieving 100% reconciliation accuracy.',
          'Designed SOX-compliant internal control matrix reducing external audit testing fees by 24%.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. in Finance & Accounting',
        institution: 'University of Illinois Urbana-Champaign',
        year: '2018'
      }
    ],
    claims: [
      {
        id: 'claim-fin-1',
        rawClaim: 'Streamlined global quarterly forecast cycle from 21 days down to 6 days utilizing automated SAP data pipelines.',
        category: 'Process & Operations',
        contextProject: 'Global Operating Budget & Rolling Forecast',
        claimedMetrics: '21 to 6 days cycle reduction',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-fin-2',
        rawClaim: 'Identified $2.3M in operational cost redundancies through departmental variance analysis.',
        category: 'Impact & Results',
        contextProject: 'Global Operating Budget & Rolling Forecast',
        claimedMetrics: '$2.3M cost reduction',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-fin-3',
        rawClaim: 'Designed SOX-compliant internal control matrix reducing external audit testing fees by 24%.',
        category: 'Leadership & Management',
        contextProject: 'Cloud ERP Migration & SOX Controls Framework',
        claimedMetrics: '24% audit fee reduction',
        confidenceLevel: 'Medium',
        verificationStatus: 'Pending'
      }
    ]
  },
  {
    id: 'cand-marcus-vance',
    name: 'Marcus Vance',
    title: 'Global Talent Acquisition & HR Business Partner',
    email: 'marcus.vance.talent@example.com',
    experienceYears: 7,
    location: 'Atlanta, GA',
    summary: 'Talent acquisition strategist and HRBP with 7+ years directing high-volume campus hiring, executive recruitment, employer branding, and structured interview loops for Fortune 500 organizations.',
    skills: {
      languages: ['Talent Acquisition', 'Full-Cycle Recruitment', 'Employee Relations', 'Compensation & Benefits'],
      frameworks: ['Candidate Sourcing', 'Employee Onboarding', 'Campus Hiring', 'Boolean Search', 'HR Policy Development'],
      databases: ['Workday HRIS', 'Greenhouse ATS', 'BambooHR', 'Lever ATS', 'ATS Management'],
      toolsAndInfra: ['LinkedIn Recruiter', 'Indeed', 'Microsoft Outlook']
    },
    projects: [
      {
        id: 'proj-hr-1',
        title: 'Enterprise Technical & Leadership Hiring Initiative',
        role: 'Talent Acquisition Lead',
        duration: '2022 - Present',
        technologies: ['Greenhouse ATS', 'LinkedIn Recruiter', 'Workday HRIS'],
        description: 'Managed end-to-end recruitment across 8 departments, leading a team of 4 senior recruiters.',
        highlights: [
          'Scaled organization from 180 to 420 employees across North America while decreasing average time-to-hire by 32%.',
          'Sourced and closed 45+ senior and director-level candidates with an offer acceptance rate of 91%.',
          'Implemented structured behavioral rubrics across all hiring managers, improving 90-day retention to 94%.'
        ]
      },
      {
        id: 'proj-hr-2',
        title: 'University Partnerships & Campus Placement Drive',
        role: 'Recruitment Specialist',
        duration: '2019 - 2022',
        technologies: ['Handshake', 'BambooHR', 'Boolean Search'],
        description: 'Designed campus recruitment drives partnering with 14 top-tier universities.',
        highlights: [
          'Spearheaded annual campus recruitment campaign interviewing 500+ student applicants and hiring 65 interns.',
          'Reduced intern onboarding turnover to under 3% through structured mentorship and weekly pulse checks.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.A. in Human Resource Management',
        institution: 'Georgia State University',
        year: '2017'
      }
    ],
    claims: [
      {
        id: 'claim-hr-1',
        rawClaim: 'Scaled organization from 180 to 420 employees while decreasing average time-to-hire by 32%.',
        category: 'Impact & Results',
        contextProject: 'Enterprise Technical & Leadership Hiring Initiative',
        claimedMetrics: '180 to 420 hires, -32% time-to-hire',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-hr-2',
        rawClaim: 'Closed 45+ senior and director-level candidates with an offer acceptance rate of 91%.',
        category: 'Domain Expertise',
        contextProject: 'Enterprise Technical & Leadership Hiring Initiative',
        claimedMetrics: '45+ senior hires, 91% acceptance rate',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-hr-3',
        rawClaim: 'Implemented structured behavioral rubrics across hiring managers, improving 90-day retention to 94%.',
        category: 'Process & Operations',
        contextProject: 'Enterprise Technical & Leadership Hiring Initiative',
        claimedMetrics: '94% 90-day retention',
        confidenceLevel: 'Medium',
        verificationStatus: 'Pending'
      }
    ]
  },
  {
    id: 'cand-elena-rostova',
    name: 'Elena Rostova',
    title: 'VP of Growth & Brand Strategy',
    email: 'elena.rostova.mkt@example.com',
    experienceYears: 8,
    location: 'New York, NY',
    summary: 'Growth marketing executive specialized in omnichannel customer acquisition, brand repositioning, paid media attribution, funnel optimization, and lifecycle retention.',
    skills: {
      languages: ['Digital Marketing', 'Brand Strategy', 'Content Strategy', 'Copywriting'],
      frameworks: ['Search Engine Optimization (SEO)', 'Search Engine Marketing (SEM)', 'Email Marketing', 'Market Research'],
      databases: ['HubSpot', 'Salesforce CRM'],
      toolsAndInfra: ['Google Analytics', 'Google Ads', 'Meta Ads Manager', 'SEMrush']
    },
    projects: [
      {
        id: 'proj-mkt-1',
        title: 'Direct-to-Consumer Customer Acquisition Scale',
        role: 'VP of Growth',
        duration: '2021 - Present',
        technologies: ['Google Analytics', 'Meta Ads Manager', 'HubSpot'],
        description: 'Oversaw $6M annual growth marketing budget across paid social, search, and influencer partnerships.',
        highlights: [
          'Grew annual recurring revenue from $4M to $18M while lowering blended customer acquisition cost (CAC) by 28%.',
          'Restructured lifecycle email marketing sequences, generating $2.4M in repeat sales within 12 months.',
          'Built multi-touch attribution model in Google Analytics to optimize cross-channel spend efficiency.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. in Integrated Marketing Communications',
        institution: 'Northwestern University',
        year: '2016'
      }
    ],
    claims: [
      {
        id: 'claim-mkt-1',
        rawClaim: 'Grew annual recurring revenue from $4M to $18M while lowering blended customer acquisition cost (CAC) by 28%.',
        category: 'Impact & Results',
        contextProject: 'Direct-to-Consumer Customer Acquisition Scale',
        claimedMetrics: '$4M to $18M ARR, -28% CAC',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-mkt-2',
        rawClaim: 'Restructured lifecycle email marketing sequences, generating $2.4M in repeat sales within 12 months.',
        category: 'Strategy & Planning',
        contextProject: 'Direct-to-Consumer Customer Acquisition Scale',
        claimedMetrics: '$2.4M repeat sales',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      }
    ]
  },
  {
    id: 'cand-alex-chen',
    name: 'Alex Chen',
    title: 'Senior Full-Stack & Distributed Systems Engineer',
    email: 'alex.chen.dev@example.com',
    experienceYears: 6,
    location: 'San Francisco, CA',
    summary: 'Full-stack software engineer specializing in high-throughput Node.js microservices, distributed caching, PostgreSQL data pipelines, and responsive React web applications.',
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Go', 'SQL'],
      frameworks: ['Node.js', 'React', 'Next.js', 'FastAPI'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB'],
      toolsAndInfra: ['Docker', 'Kubernetes', 'AWS', 'Git']
    },
    projects: [
      {
        id: 'proj-tech-1',
        title: 'High-Throughput E-Commerce & Subscription API',
        role: 'Lead Backend Engineer',
        duration: '2022 - Present',
        technologies: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'AWS', 'Docker'],
        description: 'Designed and deployed core transaction processing engine handling thousands of real-time checkouts.',
        highlights: [
          'Built a high-performance Node.js API handling 100,000 active daily users with sub-80ms p95 latency.',
          'Architected dual-layer caching strategy with Redis, reducing database read pressure by 64%.'
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
        id: 'claim-tech-1',
        rawClaim: 'Built a high-performance Node.js API handling 100,000 users with sub-80ms p95 latency.',
        category: 'Scale & Systems',
        contextProject: 'High-Throughput E-Commerce & Subscription API',
        claimedMetrics: '100,000 active users, <80ms p95 latency',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      },
      {
        id: 'claim-tech-2',
        rawClaim: 'Architected dual-layer caching strategy with Redis, reducing database read pressure by 64%.',
        category: 'Scale & Systems',
        contextProject: 'High-Throughput E-Commerce & Subscription API',
        claimedMetrics: '64% DB read reduction',
        confidenceLevel: 'High',
        verificationStatus: 'Pending'
      }
    ]
  }
];
