import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { cleanPdfText, extractTextFromPdfBuffer } from '../src/lib/engine/pdfParser';
import { ResumeKeywordExtractor } from '../src/lib/engine/keywordExtractor';
import { ExperienceCalculator } from '../src/lib/engine/experienceCalculator';
import assert from 'assert';

console.log('====================================================');
console.log('TEST SUITE: PUNCTUATION, FORMATTING & LAYOUT INTEGRITY');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// ---------------------------------------------------------
// TEST 1: Degree and Abbreviation Preservation ("B.Tech" NOT "Tech")
// ---------------------------------------------------------
runTest('Preserves complete academic degrees with periods (B.Tech, M.Tech, Ph.D., B.S.)', () => {
  const resume = `
Arun Kumar
arun@example.com

EDUCATION
B.Tech in Computer Science and Engineering - IIT Bombay (2020 - 2024)
M.Tech in Data Science - IISc Bangalore (2024 - 2026)
Ph.D. in Machine Learning - Stanford University (2026 - 2030)
B.S. in Mathematics - Delhi University (2018 - 2020)

WORK EXPERIENCE
Junior Software Engineer - Infosys (2024 - Present)
• Built automated data pipelines using Python and SQL.
`;

  const profile = extractClaimsFromText(resume, 'Arun Kumar');
  assert(profile.education.length >= 3, `Expected at least 3 education entries, got ${profile.education.length}`);

  const btech = profile.education.find(e => e.degree.includes('B.Tech'));
  assert(btech, 'B.Tech must be found in education');
  assert(!btech.degree.startsWith('Tech'), 'B.Tech must NOT be extracted as only "Tech"');
  assert.strictEqual(btech.degree, 'B.Tech in Computer Science and Engineering');
  assert.strictEqual(btech.institution, 'IIT Bombay');
  assert.strictEqual(btech.year, '2024');

  const mtech = profile.education.find(e => e.degree.includes('M.Tech'));
  assert(mtech, 'M.Tech must be found in education');
  assert.strictEqual(mtech.institution, 'IISc Bangalore');

  const phd = profile.education.find(e => e.degree.includes('Ph.D'));
  assert(phd, 'Ph.D. must be found in education');
  assert.strictEqual(phd.institution, 'Stanford University');

  // Verify keyword extractor also extracts degree keywords intact
  const keywords = ResumeKeywordExtractor.extract(resume, 'Arun Kumar');
  const degreeKws = keywords.filter(k => k.category === 'qualification_or_education').map(k => k.keyword);
  assert(degreeKws.some(k => k.includes('B.Tech')), 'Keyword extractor must extract B.Tech Degree');
  assert(degreeKws.some(k => k.includes('B.Tech in Computer Science and Engineering')), 'Full degree string must be preserved');
});

// ---------------------------------------------------------
// TEST 2: Compound Job Titles & Delimiters (Hyphenated titles)
// ---------------------------------------------------------
runTest('Preserves hyphenated job titles without splitting (Full-Stack, Front-End, Co-Founder)', () => {
  const resume = `
Priya Nair
priya@example.com

WORK EXPERIENCE
Senior Full-Stack Developer - Razorpay (2021 - Present)
• Designed and developed resilient payment APIs in Node.js and TypeScript.
• Spearheaded 40% reduction in checkout latency.

Lead Front-End Architect - Swiggy (2019 - 2021)
• Engineered modern responsive web apps using React and Next.js.
`;

  const profile = extractClaimsFromText(resume, 'Priya Nair');
  assert(profile.projects.length >= 2, `Expected at least 2 roles, got ${profile.projects.length}`);

  const fullStackRole = profile.projects.find(p => p.role.includes('Full-Stack'));
  assert(fullStackRole, 'Full-Stack Developer role must be detected intact');
  assert.strictEqual(fullStackRole.role, 'Senior Full-Stack Developer');
  assert(!fullStackRole.role.includes('Senior Full') || fullStackRole.role === 'Senior Full-Stack Developer', 'Must not split into "Senior Full"');
  assert.strictEqual(fullStackRole.title, 'Razorpay');

  const frontEndRole = profile.projects.find(p => p.role.includes('Front-End'));
  assert(frontEndRole, 'Front-End Architect role must be detected intact');
  assert.strictEqual(frontEndRole.role, 'Lead Front-End Architect');
  assert.strictEqual(frontEndRole.title, 'Swiggy');
});

// ---------------------------------------------------------
// TEST 3: Sentence Boundaries & Location / Corporate Abbreviations
// ---------------------------------------------------------
runTest('Preserves sentences containing U.S., Inc., decimals (3.5x), and technical symbols (.NET, C++, CI/CD)', () => {
  const resume = `
Vikram Rao
vikram@techcorp.com

WORK EXPERIENCE
Staff Systems Engineer - TechCorp Inc. (2020 - Present)
• Led a team of 15 engineers across U.S. and India offices.
• Achieved 3.5x reduction in query latency for C++ and C# processing services.
• Architected high-throughput Node.js and .NET microservices handling 25k rps.
• Deployed automated CI/CD pipelines e.g. GitHub Actions with 99.9% uptime.
`;

  const profile = extractClaimsFromText(resume, 'Vikram Rao');
  assert(profile.claims.length >= 3, `Expected at least 3 claims, got ${profile.claims.length}`);

  const usClaim = profile.claims.find(c => c.rawClaim.includes('U.S.'));
  assert(usClaim, 'Claim containing U.S. must be present');
  assert(usClaim.rawClaim.includes('and India offices'), 'Sentence must NOT truncate at "U.S."');
  assert.strictEqual(usClaim.rawClaim, 'Led a team of 15 engineers across U.S. and India offices.');

  const decimalClaim = profile.claims.find(c => c.rawClaim.includes('3.5x'));
  assert(decimalClaim, 'Claim containing 3.5x must be present intact');
  assert(decimalClaim.rawClaim.includes('C++') && decimalClaim.rawClaim.includes('C#'), 'Must preserve C++ and C#');

  const dotnetClaim = profile.claims.find(c => c.rawClaim.includes('.NET'));
  assert(dotnetClaim, 'Claim containing .NET must be present intact');

  const cicdClaim = profile.claims.find(c => c.rawClaim.includes('CI/CD'));
  assert(cicdClaim, 'Claim containing CI/CD must be present intact');
});

// ---------------------------------------------------------
// TEST 4: Skills Map includes .NET, CI/CD, Linux, REST APIs
// ---------------------------------------------------------
runTest('Skill map correctly identifies .NET, CI/CD, Linux, and REST APIs without destructive stripping', () => {
  const resume = `
Neha Patel
neha@example.com

SKILLS
Core Skills: .NET, C++, C#, Python, CI/CD, Linux, REST APIs, Docker, PostgreSQL

EXPERIENCE
Software Engineer - CloudWorks (2022 - 2024)
• Built REST APIs in .NET Core deployed on Linux containers.
`;

  const profile = extractClaimsFromText(resume, 'Neha Patel');
  const allSkills = [
    ...profile.skills.languages,
    ...profile.skills.frameworks,
    ...profile.skills.databases,
    ...profile.skills.toolsAndInfra
  ];

  assert(allSkills.includes('.NET'), 'Skills must include .NET');
  assert(allSkills.includes('CI/CD'), 'Skills must include CI/CD');
  assert(allSkills.includes('Linux'), 'Skills must include Linux');
  assert(allSkills.includes('REST APIs'), 'Skills must include REST APIs');
  assert(allSkills.includes('C++'), 'Skills must include C++');
  assert(allSkills.includes('C#'), 'Skills must include C#');
});

// ---------------------------------------------------------
// TEST 5: Clean Text PDF Gap Repair (Adjacent tokens "B." + "Tech" -> "B.Tech")
// ---------------------------------------------------------
runTest('cleanPdfText repairs broken PDF kerning/token spaces for common abbreviations and tech terms', () => {
  const fragmentedText = `
Rahul Sharma
B. Tech in Computer Science
Experience with Node. js, . NET, C ++, C #, and Full- Stack development.
`;

  const cleaned = cleanPdfText(fragmentedText);
  assert(cleaned.includes('B.Tech'), `Expected B.Tech, got: ${cleaned}`);
  assert(cleaned.includes('Node.js'), `Expected Node.js, got: ${cleaned}`);
  assert(cleaned.includes('.NET'), `Expected .NET, got: ${cleaned}`);
  assert(cleaned.includes('C++'), `Expected C++, got: ${cleaned}`);
  assert(cleaned.includes('C#'), `Expected C#, got: ${cleaned}`);
  assert(cleaned.includes('Full-Stack'), `Expected Full-Stack, got: ${cleaned}`);
});

// ---------------------------------------------------------
// TEST 6: Fresh Graduate Experience Calculation (Never count education)
// ---------------------------------------------------------
runTest('Strict Experience Calculation: 0 years for fresh graduate with 4-year degree', () => {
  const freshGrad = `
Deepak Verma
deepak@example.com

EDUCATION
B.Tech in Computer Science and Engineering - IIT Madras (2020 - 2024)

SKILLS
Python, C++, Java, React, SQL

PROJECTS
• Built an AI Chatbot using PyTorch and FastAPI.
• Developed a personal portfolio using Next.js.
`;

  const profile = extractClaimsFromText(freshGrad, 'Deepak Verma');
  assert.strictEqual(profile.experienceYears, 0, `Fresh graduate must have 0 years of experience, got ${profile.experienceYears}`);
  assert(profile.education.some(e => e.degree.includes('B.Tech')), 'Education must capture B.Tech');
});

// ---------------------------------------------------------
// TEST 7: Multi-column / Canva Layout Text Simulation
// ---------------------------------------------------------
runTest('Two-column / Canva layout: preserves section coherence without interleaving lines', () => {
  // Simulate text extracted with clear column boundaries
  const twoColumnResume = `
Ananya Roy
UX Designer & Researcher

ABOUT ME
Passionate UX designer with 4 years creating intuitive interfaces.

CORE COMPETENCIES
Figma, Design Systems, User Research, Prototyping, Wireframing

EDUCATION
Bachelor of Design - NID Ahmedabad (2016 - 2020)

PROFESSIONAL EXPERIENCE
Senior Product Designer - DesignStudio (2021 - Present)
• Led end-to-end redesign of enterprise healthcare portal.
• Increased task completion rate by 35% through usability testing.

UI/UX Designer - Creatives Inc. (2020 - 2021)
• Built accessible UI component library for iOS and Android.
`;

  const profile = extractClaimsFromText(twoColumnResume, 'Ananya Roy');
  assert.strictEqual(profile.title, 'UX Designer & Researcher');
  assert(profile.projects.length >= 2, 'Should capture both roles');
  assert(profile.claims.length >= 2, 'Should extract claims');
  assert.strictEqual(profile.education[0]?.degree, 'Bachelor of Design');
  assert.strictEqual(profile.education[0]?.institution, 'NID Ahmedabad');
  assert.strictEqual(profile.education[0]?.year, '2020');
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
}
