import { extractClaimsFromText } from '../src/lib/engine/claimExtractor';
import { extractKeyPointsFromPdfText } from '../src/lib/engine/pdfParser';

const resumeText = `ATHUL A
Recruitment Manager | Talent Acquisition Professional
Bengaluru | athul.ajob@gmail.com | +91 8497885369

PROFESSIONAL SUMMARY:
Recruitment and Talent Acquisition professional with 5+ years of experience across end-to-end recruitment, talent acquisition, corporate relations, campus hiring, stakeholder management, and HR operations. Experienced in candidate sourcing and screening, lateral and campus recruitment, interview coordination, vendor management, university partnerships, background verification, onboarding, recruitment analytics, and talent pipeline development. Currently working as a Recruitment Manager – Talent Acquisition in the real estate sector, managing recruitment operations, stakeholder requirements, and high-volume hiring initiatives.

RECRUITMENT MANAGER: Aventurine Homes — Bengaluru [May 2026 – Present]
• Manage end-to-end recruitment and talent acquisition activities across multiple business functions within the real estate sector.
• Partner with management and internal stakeholders to understand workforce requirements and develop effective hiring strategies.
• Source, screen, and shortlist candidates through Indeed, LinkedIn, referrals, and campus hiring channels.
• Conduct initial candidate interviews and assess profiles against role requirements.
• Manage interview scheduling, candidate communication, follow-ups, and offer-stage activities.
• Build and maintain talent pipelines to support both immediate and future hiring requirements.
• Monitor recruitment progress, candidate movement, open positions, and hiring timelines.
• Coordinate with stakeholders to improve recruitment turnaround time and overall candidate experience.
• Initiate onboarding and joining formalities for selected candidates.
• Built a database of 800+ candidate profiles through LinkedIn sourcing.
• Track recruitment metrics and hiring progress to support data-driven recruitment decisions.
• Successfully lined up 40+ lateral-hiring interviews within the last 90 days.
• Conducted 2 campus recruitment drives to support organizational hiring requirements.

RECRUITER: Exxevo India Pvt. Ltd. — Bengaluru [October 2025 – March 2026]
• Managed global lateral recruitment activities across multiple roles and hiring requirements.
• Reviewed and shortlisted candidates using ATS tools, tracking 120+ applications.
• Sourced and screened candidates across India, Canada, and the UK for 5+ requisitions.
• Conducted initial candidate screenings and coordinated interview processes for 5+ roles.
• Partnered with universities in India and Canada to support recruitment from 300+ student candidates.
• Coordinated with 2 recruitment vendors in India to fulfill hiring requirements.
• Scheduled and managed 20+ interview loops, ensuring effective candidate and hiring-manager communication.
• Managed background verification and joining formalities, ensuring completion within 7 days.
• Facilitated new-hire orientation sessions to support employee readiness and policy awareness.
• Developed and maintained talent pipelines for future recruitment requirements.
• Prepared job descriptions in consultation with department heads based on approved hiring requisitions.

CORPORATE RELATIONSHIP OFFICER: Krupanidhi Group of Institutions — Bengaluru [January 2023 – October 2025]
• Coordinated corporate recruitment and placement activities in collaboration with employers and hiring managers.
• Evaluated and shortlisted resumes based on employer-specific job requirements.
• Coordinated recruitment events and interview schedules for 200+ students across multiple business groups.
• Managed on-campus placement activities and streamlined recruitment coordination.
• Prepared and dispatched offer letters while securing employer acceptance confirmations.
• Conducted mock interviews for 150+ students to enhance interview readiness and employability.
• Provided career guidance to 300+ MBA, UG, and MCA students.
• Prepared weekly recruitment and placement reports for senior management.
• Supported career fairs, workshops, employer interactions, and student engagement initiatives.
• Built and maintained relationships with corporate clients and training partners to generate qualified recruitment opportunities.
• Supported employer branding initiatives through career fairs and institutional events.
• Ensured operational continuity by coordinating the transition of placement responsibilities.
• Provided administrative support to Talent Acquisition and placement teams, including documentation and communication management.`;

const profile = extractClaimsFromText(resumeText, 'ATHUL A');
console.log('Profile:', JSON.stringify(profile, null, 2));

const keyPoints = extractKeyPointsFromPdfText(resumeText);
console.log('Key points count:', keyPoints.length);
