import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { ExperienceCalculator } from '../src/lib/engine/experienceCalculator';
import { SAMPLE_CANDIDATES } from '../src/lib/data/sampleResumes';

async function runIntegrationTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING RESUME EXPERIENCE PARSING INTEGRATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName} (Actual: ${actual !== undefined ? actual : 'OK'})`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - Expected: ${expected}, Got: ${actual}`);
      failed++;
    }
  }

  // 1. Fresh Graduate Resume Test (Engineering Graduate, No Jobs)
  console.log('--- Test 1: Fresh Graduate with 4-Year College & School Dates Only ---');
  const freshGradResume = `
Ananya Sharma
ananya.sharma@example.com | +91 9876543210 | Bangalore, India

EDUCATION
National Institute of Technology Karnataka (NITK)
Bachelor of Technology in Computer Science and Engineering (2020 - 2024)
CGPA: 8.9/10

Delhi Public School
Senior Secondary School Certificate (CBSE) (2018 - 2020)
Percentage: 96%

ACADEMIC PROJECTS
Distributed Key-Value Store (2023 - 2024)
• Built a Raft consensus distributed storage system in Go handling node failover.
• Achieved 12,000 read requests per second with linearizable consistency.

SKILLS
Python, Go, C++, React, Node.js, PostgreSQL, Docker, Git
  `.trim();

  const freshGradProfile = extractClaimsFromText(freshGradResume, 'Ananya Sharma');
  assert(
    freshGradProfile.experienceYears === 0,
    'Fresh graduate profile correctly assigned 0 years (Education 2020-2024 NOT counted as work)',
    freshGradProfile.experienceYears,
    0
  );
  assert(
    freshGradProfile.education.length > 0,
    'Education entries were correctly parsed into education list',
    freshGradProfile.education.length,
    '> 0'
  );
  assert(
    freshGradProfile.projects.length === 0,
    'Education degrees were NOT erroneously added to work experience projects',
    freshGradProfile.projects.length,
    0
  );

  // 2. Fresh Graduate with College + 1 Short Summer Internship
  console.log('\n--- Test 2: Fresh Graduate with 3-Month Summer Internship (< 1 Year) ---');
  const internResume = `
Rohan Mehta
rohan.mehta@example.com

EDUCATION
B.Tech in Information Technology - Anna University (2020 - 2024)

WORK EXPERIENCE
Tech Solutions Inc. - Software Engineering Intern (Jun 2023 - Aug 2023)
• Developed automated Python test suites for REST APIs reducing test runtime by 35%.
• Wrote documentation and resolved 15 bug tickets.

PROJECTS
Smart Health Monitoring Portal (2023)
• Created full stack React and Node.js portal.
  `.trim();

  const internProfile = extractClaimsFromText(internResume, 'Rohan Mehta');
  assert(
    internProfile.experienceYears === 0,
    'Fresh graduate with 3-month summer internship has 0 full years of exp',
    internProfile.experienceYears,
    0
  );

  // 3. Experienced Senior Candidate
  console.log('\n--- Test 3: Experienced Candidate (College must NOT be added to Job Dates) ---');
  const experiencedResume = `
David Miller
david.miller@example.com | Seattle, WA

SUMMARY
Senior Cloud Engineer with extensive experience in Kubernetes and AWS microservices.

PROFESSIONAL EXPERIENCE
Senior Cloud Engineer - Apex Cloud Solutions (2021 - 2024)
• Led migration of 40 microservices to EKS, reducing infrastructure cost by 28%.
• Maintained 99.99% system uptime across multi-region production deployments.

Software Engineer - DataTech Corp (2018 - 2021)
• Engineered real-time ingestion pipelines in Python and Kafka processing 5M events/day.
• Optimized PostgreSQL query performance by 45%.

EDUCATION
B.S. in Computer Science - University of Washington (2014 - 2018)
High School Diploma - Ballard High (2010 - 2014)

CERTIFICATIONS
AWS Certified Solutions Architect (2022)
  `.trim();

  const expProfile = extractClaimsFromText(experiencedResume, 'David Miller');
  assert(
    expProfile.experienceYears === 6,
    'Experienced candidate has 6 years (2018-2024 job dates only; 2014-2018 college excluded)',
    expProfile.experienceYears,
    6
  );

  // 4. Overlapping Jobs: Avoid Double Counting
  console.log('\n--- Test 4: Overlapping Concurrent Jobs ---');
  const overlappingResume = `
Priya Nair
priya.nair@example.com

EXPERIENCE
Full Stack Developer - Digital Solutions (Jan 2020 - Dec 2022)
• Built React web applications.

Technical Consultant - Startup Advisors (Jun 2021 - Jun 2023)
• Advised on cloud architecture.

EDUCATION
B.Sc in Computer Science - Mumbai University (2016 - 2019)
  `.trim();

  const overlapProfile = extractClaimsFromText(overlappingResume, 'Priya Nair');
  // Jan 2020 - Dec 2022 is 36 months; Jun 2021 - Jun 2023 overlaps from Jun 2021 to Dec 2022.
  // Merged duration is Jan 2020 to Jun 2023 = 42 months = 3.5 years -> 4 years.
  assert(
    overlapProfile.experienceYears === 4,
    'Concurrent roles merged (42 months -> 4 years, not 5+ years)',
    overlapProfile.experienceYears,
    4
  );

  // 5. Sample Candidates Verification
  console.log('\n--- Test 5: Verify Pre-configured Sample Candidates in Platform ---');
  const freshGradSample = SAMPLE_CANDIDATES.find(c => c.id === 'cand-ananya-sharma');
  assert(
    freshGradSample !== undefined && freshGradSample.experienceYears === 0,
    'Sample fresh graduate candidate Ananya Sharma has experienceYears = 0',
    freshGradSample?.experienceYears,
    0
  );

  const sarahSample = SAMPLE_CANDIDATES.find(c => c.id === 'cand-sarah-jenkins');
  assert(
    sarahSample !== undefined && sarahSample.experienceYears === 6,
    'Sample candidate Sarah Jenkins has experienceYears = 6',
    sarahSample?.experienceYears,
    6
  );

  console.log('\n================================================================');
  console.log(`🏁 INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests();
