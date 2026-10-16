import { ExperienceCalculator } from '../src/lib/engine/experienceCalculator';

function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING PROFESSIONAL EXPERIENCE CALCULATOR TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName} (Result: ${actual !== undefined ? actual : 'OK'})`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - Expected: ${expected}, Got: ${actual}`);
      failed++;
    }
  }

  // Current anchor date for reproducible test assertions: October 2026 (Year: 2026, Month: 9)
  const TEST_YEAR = 2026;
  const TEST_MONTH = 9; // October

  console.log('--- 1. Fresh Graduate with Education Dates Only (Must be 0) ---');
  const freshGradText = `
    Rahul Sharma
    rahul.sharma@example.com

    Education:
    Bachelor of Technology in Computer Science - IIT Madras (2020 - 2024)
    Senior Secondary School - DPS R.K. Puram (2018 - 2020)

    Academic Projects:
    Machine Learning Image Classifier (2023 - 2024)
    - Developed CNN in PyTorch achieving 94% accuracy

    Skills:
    Python, Java, C++, React, Node.js
  `;
  const freshGradExp = ExperienceCalculator.calculateFromResumeText(freshGradText, TEST_YEAR, TEST_MONTH);
  assert(freshGradExp === 0, 'Fresh graduate with 4-year degree (2020-2024) has 0 work experience', freshGradExp, 0);

  console.log('\n--- 2. Fresh Graduate with College + 3-Month Summer Internship (Must be 0) ---');
  const freshGradWithInternship: any[] = [
    {
      title: 'Summer Engineering Intern',
      role: 'Intern',
      duration: 'Jun 2023 - Aug 2023',
      description: 'Worked on internal API endpoints'
    },
    {
      title: 'B.Tech Capstone Project',
      role: 'Student Researcher',
      duration: '2023 - 2024',
      description: 'Final year college thesis'
    }
  ];
  const internExp = ExperienceCalculator.calculateFromWorkHistory(freshGradWithInternship, TEST_YEAR, TEST_MONTH);
  assert(internExp === 0, 'Fresh graduate with 3-month summer internship has 0 full years of exp', internExp, 0);

  console.log('\n--- 3. Experienced Candidate: Education must NOT be added to Job Dates ---');
  // Candidate attended college 2014 - 2018 (4 years).
  // Then worked Job 1: 2018 - 2021 (3 years)
  // Then worked Job 2: 2021 - 2024 (3 years)
  // Total work experience must be 6 years (NOT 10 years including college)!
  const experiencedCandidateText = `
    Alex Rivera
    alex.rivera@example.com

    Professional Summary:
    Full Stack Developer with enterprise SaaS background.

    Work Experience:
    Senior Software Engineer - CloudScale Systems (2021 - 2024)
    - Led backend microservices team.
    Software Engineer - FinTech Labs (2018 - 2021)
    - Developed high volume payments service.

    Education:
    B.S. in Computer Engineering - University of Texas (2014 - 2018)
    High School Diploma - Austin High (2010 - 2014)
  `;
  const expCandExp = ExperienceCalculator.calculateFromResumeText(experiencedCandidateText, TEST_YEAR, TEST_MONTH);
  assert(expCandExp === 6, 'Experienced candidate gets 6 years (Job dates only, 2014-2018 college excluded)', expCandExp, 6);

  console.log('\n--- 4. Avoid Double-Counting Overlapping Concurrent Jobs ---');
  // Job 1: Jan 2020 - Dec 2022 (36 months)
  // Job 2: Jun 2021 - Jun 2023 (25 months)
  // Total merged span: Jan 2020 - Jun 2023 = 42 months = 3.5 years (rounds to 4 years).
  // WITHOUT deduplication, sum would be 36 + 25 = 61 months (5 years)!
  const overlappingRoles: any[] = [
    {
      title: 'Full Stack Consultant',
      role: 'Consultant',
      duration: 'Jan 2020 - Dec 2022',
      description: 'Consulted for enterprise clients'
    },
    {
      title: 'Part-time Tech Advisor',
      role: 'Advisor',
      duration: 'Jun 2021 - Jun 2023',
      description: 'Advisory role for startup'
    }
  ];
  const mergedExp = ExperienceCalculator.calculateFromWorkHistory(overlappingRoles, TEST_YEAR, TEST_MONTH);
  assert(mergedExp === 4, 'Overlapping concurrent roles merged: 42 months -> 4 years (not 5+ years)', mergedExp, 4);

  console.log('\n--- 5. Candidate with Missing Dates: Do NOT Invent Experience ---');
  const missingDatesText = `
    Jane Doe
    jane.doe@example.com

    Work Experience:
    Software Developer - Acme Corp
    - Built responsive web pages
    Junior Programmer - Beta Tech
    - Maintained legacy databases
  `;
  const missingDatesExp = ExperienceCalculator.calculateFromResumeText(missingDatesText, TEST_YEAR, TEST_MONTH);
  assert(missingDatesExp === 0, 'Jobs without dates return 0 (no invention/hallucination of dates)', missingDatesExp, 0);

  console.log('\n--- 6. Candidate with "Present" / "Current" Role ---');
  // Job 1: 2022 - Present (Oct 2026 anchor -> Jan 2022 to Oct 2026 = 57 months ~ 4.75 -> 5 years)
  // Job 2: 2020 - 2022 (24 months)
  // Merged: Jan 2020 to Oct 2026 = 81 months ~ 6.75 -> 7 years
  const presentRoles: any[] = [
    {
      title: 'Lead Architect',
      role: 'Lead Architect',
      duration: '2022 - Present',
      description: 'Current role'
    },
    {
      title: 'Senior Developer',
      role: 'Senior Developer',
      duration: '2020 - 2022',
      description: 'Previous role'
    }
  ];
  const presentExp = ExperienceCalculator.calculateFromWorkHistory(presentRoles, TEST_YEAR, TEST_MONTH);
  assert(presentExp === 7, '2020-2022 + 2022-Present calculates 7 years to current date', presentExp, 7);

  console.log('\n--- 7. Education Filter in Work History Objects ---');
  const mixedRoles: any[] = [
    {
      title: 'Master of Science Thesis Research',
      role: 'Graduate Student',
      duration: '2020 - 2022',
      description: 'University research at MIT'
    },
    {
      title: 'Software Engineer',
      role: 'Software Engineer',
      duration: '2022 - 2024',
      description: 'Full time software engineer'
    }
  ];
  const mixedExp = ExperienceCalculator.calculateFromWorkHistory(mixedRoles, TEST_YEAR, TEST_MONTH);
  assert(mixedExp === 2, 'University graduate student role is excluded, leaving 2 years of work', mixedExp, 2);

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
