import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VerveAI - Autonomous Adaptive Technical Interview Engine',
  description: 'AI that analyzes resumes, extracts quantifiable claims, and conducts multi-turn dynamic technical interviews with evidence-based verification reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-ambient-grid" />
        <div className="bg-dot-pattern" />
        <main>{children}</main>
      </body>
    </html>
  );
}
