import { extractClaimsFromText, sanitizeClaimToEnglish } from '../src/lib/engine/claimExtractor';
import { cleanPdfText } from '../src/lib/engine/pdfParser';
import { ResumeKeywordExtractor } from '../src/lib/engine/keywordExtractor';

const sample = `
Rahul Sharma
rahul@example.com

EDUCATION
B.Tech in Computer Science and Engineering - IIT Bombay (2020 - 2024)
B.S. in Mathematics - Delhi University (2018 - 2020)
M.Tech. in AI and Robotics (2024)

WORK EXPERIENCE
Senior Full-Stack Developer - TechCorp Inc. (2022 - Present)
• Architected high-throughput Node.js and .NET microservices handling 25k rps.
• Achieved 3.5x reduction in query latency for C++ and C# processing services.
• Optimized PostgreSQL & Redis data pipelines.
• Led a team of 15 engineers across U.S. and India offices.

SKILLS
React, Node.js, .NET, C++, C#, Python, B.Tech, CI/CD, Docker, Kubernetes
`;

console.log('--- Testing cleanPdfText ---');
console.log(cleanPdfText(sample));

console.log('\n--- Testing extractClaimsFromText ---');
const profile = extractClaimsFromText(sample, 'Rahul Sharma');
console.log('Education parsed:');
console.log(JSON.stringify(profile.education, null, 2));

console.log('\nProjects parsed:');
console.log(JSON.stringify(profile.projects, null, 2));

console.log('\nClaims parsed:');
console.log(JSON.stringify(profile.claims, null, 2));

console.log('\n--- Testing Keyword Extractor ---');
const keywords = ResumeKeywordExtractor.extract(sample, 'Rahul Sharma');
console.log('Keywords extracted:');
console.log(JSON.stringify(keywords.map(k => ({ category: k.category, keyword: k.keyword })), null, 2));
